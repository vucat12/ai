# Async Generator Error Handling Fix

## Problem

When using streaming methods (`streamChat`, `generateTextStream`), the fallback mechanism wasn't working properly. If the primary adapter failed (e.g., OpenAI rate limit or insufficient tokens), the system would log the error but wouldn't automatically try the fallback adapters.

## Root Cause

The issue was with how JavaScript async generators handle errors:

### ❌ Incorrect Approach (Before)

```typescript
async *streamChat(options) {
  try {
    yield* adapterInstance.chatStream({...}); // ← Error happens here during iteration
    return;
  } catch (error) {
    // This catch block is NEVER reached!
    // Errors during yield* are not caught by this try-catch
  }
}
```

**Why this doesn't work:**
- The `yield*` operator delegates to another generator
- Errors that occur **during iteration** propagate directly to the caller
- The `try-catch` block only catches errors from **creating** the generator, not from **consuming** it

## Solution

### ✅ Correct Approach (After)

```typescript
async *streamChat(options) {
  try {
    const iterator = adapterInstance.chatStream({...});
    // Manually iterate to catch errors during streaming
    for await (const chunk of iterator) {
      yield chunk;
    }
    return;
  } catch (error) {
    // Now this catch block IS reached!
    // Try fallback adapters...
  }
}
```

**Why this works:**
- We manually iterate with `for await...of`
- Errors during iteration are caught by the surrounding `try-catch`
- We can then attempt fallback adapters

## Changes Made

### 1. Fixed `tryStreamWithFallback` Helper

**Before:**
```typescript
private async *tryStreamWithFallback(...) {
  for (const fallback of fallbacks) {
    try {
      yield* operation(fallback); // ← Doesn't catch iteration errors
      return;
    } catch (error) {
      // Never reached
    }
  }
}
```

**After:**
```typescript
private async *tryStreamWithFallback(...) {
  for (const fallback of fallbacks) {
    try {
      const iterator = operation(fallback);
      // Manually iterate to catch errors during streaming
      for await (const chunk of iterator) {
        yield chunk;
      }
      return; // Success!
    } catch (error) {
      // Now catches iteration errors
      console.warn(`Fallback "${fallback.adapter}" failed:`, error.message);
    }
  }
  throw new Error("All adapters failed");
}
```

### 2. Fixed `streamChat` Method

Updated to manually iterate when trying the primary adapter and fallbacks, ensuring errors during streaming are properly caught and trigger fallback attempts.

### 3. Fixed `generateTextStream` Method

Applied the same fix for text generation streaming.

## Behavior Now

### Scenario 1: Primary Succeeds
```typescript
await ai.chat({
  adapter: "openai",
  model: "gpt-4",
  messages: [...],
  fallbacks: [{ adapter: "ollama", model: "llama2" }],
});
```
**Result:** OpenAI response is used. Ollama is never called.

### Scenario 2: Primary Fails, Fallback Succeeds
```typescript
await ai.chat({
  adapter: "openai",  // Fails (rate limit / no tokens)
  model: "gpt-4",
  messages: [...],
  fallbacks: [{ adapter: "ollama", model: "llama2" }], // ← Tries this
});
```
**Result:**
1. OpenAI fails with error (rate limit, insufficient tokens, etc.)
2. Console warns: `[AI] Primary adapter "openai" with model "gpt-4" failed...`
3. System automatically tries Ollama
4. Ollama succeeds and returns response
5. User gets the response seamlessly

### Scenario 3: All Adapters Fail
```typescript
await ai.chat({
  adapter: "openai",  // Fails
  model: "gpt-4",
  messages: [...],
  fallbacks: [
    { adapter: "ollama", model: "llama2" },     // Also fails
    { adapter: "ollama", model: "mistral" },    // Also fails
  ],
});
```
**Result:**
1. Each adapter is tried in order
2. Console warns for each failure
3. Final error thrown with all failures listed:
   ```
   Error: All adapters failed for chat:
     - openai (gpt-4): Insufficient tokens
     - ollama (llama2): Connection refused
     - ollama (mistral): Model not found
   ```

## Testing

Use the `examples/fallback-error-handling-test.ts` file to test the fallback behavior:

```bash
# If you have an invalid/expired OpenAI key, it will fallback to Ollama
pnpm tsx examples/fallback-error-handling-test.ts
```

Expected output:
```
=== Testing Fallback on Primary Adapter Failure ===

1. OpenAI (primary) -> Ollama (fallback on error):
[AI] Primary adapter "openai" with model "gpt-4" failed for chat: Insufficient quota
✓ Response: Hello!
  Model used: llama2
```

## Technical Details

### Async Generator Error Propagation

In JavaScript, async generators have special error handling behavior:

1. **Generator Creation Errors:** Caught by immediate try-catch
2. **Iteration Errors:** Propagate to the consumer, **not** caught by generator's try-catch

```typescript
// This is why yield* doesn't work:
async function* gen() {
  throw new Error("During iteration");
}

async function* wrapper() {
  try {
    yield* gen(); // Error propagates to caller, not caught here
  } catch (e) {
    console.log("Never logged");
  }
}

// Error is thrown to consumer:
for await (const x of wrapper()) {
  // Error thrown here ↑
}
```

### Manual Iteration Pattern

```typescript
// Correct pattern:
async function* wrapper() {
  try {
    const iterator = gen();
    for await (const value of iterator) {
      yield value; // Error caught here
    }
  } catch (e) {
    console.log("Caught!"); // This works
  }
}
```

## Methods Fixed

✅ `tryStreamWithFallback` - Core streaming fallback helper
✅ `streamChat` - Structured streaming with tools support  
✅ `generateTextStream` - Text generation streaming

## Methods Already Working

✅ `chat` - Non-streaming, regular try-catch works
✅ `generateText` - Non-streaming, regular try-catch works  
✅ `summarize` - Non-streaming, regular try-catch works
✅ `embed` - Non-streaming, regular try-catch works

## Summary

The fix ensures that errors during async generator iteration are properly caught, allowing the fallback mechanism to work as designed. Users now get automatic failover from a failing primary adapter to configured fallback adapters during streaming operations.
