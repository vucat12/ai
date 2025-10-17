# Error Chunk Handling for Stream Fallbacks

## Problem

When using streaming with fallbacks (e.g., OpenAI primary → Ollama fallback), if the primary adapter encountered an error like:

```
429 You exceeded your current quota
```

The error was being sent as an **error chunk** to the client, but the fallback system never kicked in. The client would see the error message without the system attempting to use the fallback adapter.

## Root Cause

### Adapters Yield Error Chunks Instead of Throwing

Many adapters (like OpenAI) handle errors by **yielding an error chunk** rather than throwing an exception:

```typescript
// In OpenAI adapter
try {
  for await (const chunk of stream) {
    yield chunk; // Normal chunks
  }
} catch (error) {
  // Yields error chunk instead of throwing
  yield {
    type: "error",
    error: {
      message: error.message,
      code: error.code,
    },
  };
}
```

### The Fallback Logic Only Caught Thrown Exceptions

The `streamChat` method was catching thrown exceptions, but **error chunks** were being yielded normally:

```typescript
// Before (broken)
for await (const chunk of iterator) {
  yield chunk; // ← This yields the error chunk to the client!
}
// Never catches the error, never tries fallbacks
```

## Solution

### Detect Error Chunks and Treat Them as Failures

Now we check each chunk to see if it's an error chunk. If it is, we **stop yielding**, throw an exception, and trigger the fallback mechanism:

```typescript
// After (fixed)
for await (const chunk of iterator) {
  // Check if this is an error chunk
  if (chunk.type === "error") {
    hasError = true;
    errorChunk = chunk;
    break; // Stop iterating, don't yield the error
  }
  yield chunk; // Only yield non-error chunks
}

// If we got an error chunk, throw it to trigger fallback
if (hasError && errorChunk) {
  throw new Error(errorChunk.error.message);
}
```

## Changes Made

### 1. Updated `streamChat` Method

Added error chunk detection for both primary adapter and fallback attempts:

```typescript
let hasError = false;
let errorChunk: any = null;

for await (const chunk of iterator) {
  if (chunk.type === "error") {
    hasError = true;
    errorChunk = chunk;
    break; // Don't yield error, try fallback instead
  }
  yield chunk;
}

if (hasError && errorChunk) {
  throw new Error(errorChunk.error.message);
}
```

### 2. Updated `tryStreamWithFallback` Helper

Applied the same error chunk detection to the fallback helper method.

## Behavior Now

### Scenario: OpenAI Rate Limit with Ollama Fallback

**Configuration:**
```typescript
const ai = new AI({
  adapters: {
    openAi: new OpenAIAdapter({ apiKey: "..." }),
    ollama: new OllamaAdapter({ baseUrl: "..." }),
  },
});

const stream = ai.streamChat({
  adapter: "openAi",
  model: "gpt-4o",
  messages: [...],
  fallbacks: [
    { adapter: "ollama", model: "gpt-oss:20b" }
  ],
});
```

**Previous Behavior (Broken):**
1. OpenAI returns 429 error (rate limit)
2. OpenAI adapter yields error chunk: `{ type: "error", error: { message: "429..." } }`
3. Error chunk is sent to client
4. Client displays error message
5. **Ollama is never tried** ❌

**New Behavior (Fixed):**
1. OpenAI returns 429 error (rate limit)
2. OpenAI adapter yields error chunk: `{ type: "error", error: { message: "429..." } }`
3. AI class detects error chunk and **doesn't yield it to client**
4. AI class throws exception internally
5. Console logs: `[AI] Primary adapter "openAi" with model "gpt-4o" failed for streamChat: 429...`
6. **Ollama fallback is attempted** ✅
7. Ollama successfully streams response to client
8. Client receives response from Ollama seamlessly

## Example Error Flow

### Before (Broken)

```
Client Request
    ↓
OpenAI Adapter (429 error)
    ↓
Error Chunk { type: "error", ... }
    ↓
AI.streamChat (yields error chunk)
    ↓
Client (shows error) ❌
```

### After (Fixed)

```
Client Request
    ↓
OpenAI Adapter (429 error)
    ↓
Error Chunk { type: "error", ... }
    ↓
AI.streamChat (detects error chunk)
    ↓
Throws exception internally
    ↓
Console: "[AI] Primary adapter failed..."
    ↓
Ollama Adapter (tries fallback)
    ↓
Success! Stream chunks
    ↓
Client (receives response) ✅
```

## Technical Details

### Error Chunk Type

```typescript
interface ErrorStreamChunk {
  type: "error";
  id: string;
  model: string;
  timestamp: number;
  error: {
    message: string;
    code?: string;
  };
}
```

### Detection Logic

```typescript
// Type guard for error chunks
if ((chunk as any).type === "error") {
  // It's an error chunk
  const errorMessage = (chunk as any).error.message;
  throw new Error(errorMessage);
}
```

## Testing

### Test Case: OpenAI Rate Limit → Ollama Fallback

```typescript
// api.tanchat.ts
const ai = new AI({
  adapters: {
    openAi: new OpenAIAdapter({
      apiKey: process.env.AI_KEY!, // Invalid or rate-limited key
    }),
    ollama: new OllamaAdapter({
      baseUrl: "http://localhost:11434",
    }),
  },
});

const stream = ai.streamChat({
  adapter: "openAi",
  model: "gpt-4o",
  messages: [...],
  fallbacks: [
    { adapter: "ollama", model: "llama2" }
  ],
  tools,
});
```

**Expected Console Output:**
```
[AI] Primary adapter "openAi" with model "gpt-4o" failed for streamChat: 429 You exceeded your current quota...
```

**Expected Client Behavior:**
- ✅ No error message displayed
- ✅ Response streaming from Ollama
- ✅ Seamless fallback

## Related Methods

✅ **`streamChat`** - Fixed (error chunk detection)
✅ **`tryStreamWithFallback`** - Fixed (error chunk detection)
✅ **`generateTextStream`** - May need similar fix if text adapters yield error chunks

## Summary

The fix ensures that when adapters yield error chunks during streaming, the AI class:

1. **Detects** the error chunk
2. **Stops** yielding to the client
3. **Throws** an exception internally
4. **Triggers** the fallback mechanism
5. **Attempts** fallback adapters
6. **Succeeds** with seamless failover

This provides a better user experience where errors are handled gracefully with automatic fallbacks, rather than showing error messages to the user.
