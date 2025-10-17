# Type Narrowing in Unified Chat API

## Overview

The unified `chat()` method uses TypeScript **function overloads** to provide precise type narrowing based on the `as` parameter. This means TypeScript knows the exact return type at compile time!

## Type Narrowing Rules

| `as` Value | Return Type | Usage |
|------------|-------------|-------|
| `"promise"` | `Promise<ChatCompletionResult>` | Can `await`, access `.content`, `.usage`, etc. |
| `"stream"` | `AsyncIterable<StreamChunk>` | Can use `for await...of`, iterate chunks |
| `"response"` | `Response` | Can access `.headers`, `.body`, `.status`, etc. |
| `undefined` (default) | `Promise<ChatCompletionResult>` | Same as `"promise"` |

## Examples with Type Checking

### 1. Promise Mode - Type is `Promise<ChatCompletionResult>`

```typescript
const result = ai.chat({
  adapter: "openai",
  model: "gpt-4",
  messages: [{ role: "user", content: "Hello" }],
  as: "promise",
});

// TypeScript knows result is Promise<ChatCompletionResult>
const resolved = await result;

// ✅ These work - properties exist on ChatCompletionResult
console.log(resolved.content);
console.log(resolved.role);
console.log(resolved.usage.totalTokens);

// ❌ TypeScript error - headers doesn't exist on ChatCompletionResult
console.log(resolved.headers); // Type error!
```

### 2. Stream Mode - Type is `AsyncIterable<StreamChunk>`

```typescript
const stream = ai.chat({
  adapter: "openai",
  model: "gpt-4",
  messages: [{ role: "user", content: "Hello" }],
  as: "stream",
});

// TypeScript knows stream is AsyncIterable<StreamChunk>
// ✅ This works - can iterate async iterable
for await (const chunk of stream) {
  console.log(chunk.type);
  console.log(chunk.id);
  console.log(chunk.model);
}

// ❌ TypeScript error - content doesn't exist on AsyncIterable
console.log(stream.content); // Type error!

// ❌ TypeScript error - headers doesn't exist on AsyncIterable
console.log(stream.headers); // Type error!
```

### 3. Response Mode - Type is `Response`

```typescript
const response = ai.chat({
  adapter: "openai",
  model: "gpt-4",
  messages: [{ role: "user", content: "Hello" }],
  as: "response",
});

// TypeScript knows response is Response
// ✅ These work - properties exist on Response
console.log(response.headers);
console.log(response.body);
console.log(response.status);
console.log(response.ok);

const contentType = response.headers.get("Content-Type");

// ❌ TypeScript error - content doesn't exist on Response
console.log(response.content); // Type error!

// ❌ TypeScript error - usage doesn't exist on Response
console.log(response.usage); // Type error!
```

### 4. Default (No `as`) - Type is `Promise<ChatCompletionResult>`

```typescript
const result = ai.chat({
  adapter: "openai",
  model: "gpt-4",
  messages: [{ role: "user", content: "Hello" }],
  // No "as" specified - defaults to "promise"
});

// TypeScript knows result is Promise<ChatCompletionResult>
const resolved = await result;
console.log(resolved.content); // ✅ Works!
```

## Function Return Type Inference

TypeScript correctly infers return types in functions:

### API Handler - Returns `Response`

```typescript
function apiHandler() {
  return ai.chat({
    adapter: "openai",
    model: "gpt-4",
    messages: [...],
    as: "response",
  });
  // TypeScript infers: function apiHandler(): Response ✅
}
```

### Type-safe API Handler

```typescript
function apiHandler(): Response {
  return ai.chat({
    adapter: "openai",
    model: "gpt-4",
    messages: [...],
    as: "response", // ✅ Correct - returns Response
  });
}

function wrongApiHandler(): Response {
  return ai.chat({
    adapter: "openai",
    model: "gpt-4",
    messages: [...],
    as: "promise", // ❌ TypeScript error - returns Promise, not Response
  });
}
```

### Streaming Handler

```typescript
async function* streamHandler() {
  const stream = ai.chat({
    adapter: "openai",
    model: "gpt-4",
    messages: [...],
    as: "stream",
  });
  
  // TypeScript knows stream is AsyncIterable<StreamChunk>
  for await (const chunk of stream) {
    yield chunk; // ✅ Works perfectly
  }
}
```

## With Fallbacks - Type Narrowing Still Works

```typescript
// Promise with fallbacks - Type: Promise<ChatCompletionResult>
const promise = ai.chat({
  adapter: "openai",
  model: "gpt-4",
  messages: [...],
  as: "promise",
  fallbacks: [{ adapter: "ollama", model: "llama2" }]
});
const resolved = await promise;
console.log(resolved.content); // ✅ Works

// Stream with fallbacks - Type: AsyncIterable<StreamChunk>
const stream = ai.chat({
  adapter: "openai",
  model: "gpt-4",
  messages: [...],
  as: "stream",
  fallbacks: [{ adapter: "ollama", model: "llama2" }]
});
for await (const chunk of stream) {
  console.log(chunk.type); // ✅ Works
}

// Response with fallbacks - Type: Response
const response = ai.chat({
  adapter: "openai",
  model: "gpt-4",
  messages: [...],
  as: "response",
  fallbacks: [{ adapter: "ollama", model: "llama2" }]
});
console.log(response.headers); // ✅ Works
```

## Dynamic Mode (Runtime Decision)

When the mode is determined at runtime, TypeScript uses a union type:

```typescript
function dynamicChat(mode: "promise" | "stream" | "response") {
  const result = ai.chat({
    adapter: "openai",
    model: "gpt-4",
    messages: [...],
    as: mode,
  });
  
  // Type: Promise<ChatCompletionResult> | AsyncIterable<StreamChunk> | Response
  // This is correct - TypeScript doesn't know which at compile time
  
  // Use type guards to narrow
  if (mode === "promise") {
    // result is Promise<ChatCompletionResult>
    const resolved = await result;
    console.log(resolved.content);
  } else if (mode === "stream") {
    // result is AsyncIterable<StreamChunk>
    for await (const chunk of result as AsyncIterable<any>) {
      console.log(chunk.type);
    }
  } else {
    // result is Response
    console.log((result as Response).headers);
  }
}
```

## Const Assertions for Better Inference

Use `as const` for better type narrowing:

```typescript
const mode = "stream" as const;

const result = ai.chat({
  adapter: "openai",
  model: "gpt-4",
  messages: [...],
  as: mode, // TypeScript knows this is exactly "stream"
});

// Type is correctly narrowed to AsyncIterable<StreamChunk>
for await (const chunk of result) {
  console.log(chunk.type); // ✅ Works without cast
}
```

## Real-World Example: TanStack Start API

```typescript
import { createAPIFileRoute } from "@tanstack/start/api";
import { ai } from "~/lib/ai-client";

export const Route = createAPIFileRoute("/api/chat")({
  POST: async ({ request }): Promise<Response> => {
    const { messages } = await request.json();
    
    // TypeScript knows this returns Response ✅
    return ai.chat({
      adapter: "openAi",
      model: "gpt-4o",
      messages,
      as: "response", // ← Type is narrowed to Response
      fallbacks: [
        { adapter: "ollama", model: "llama2" }
      ]
    });
  }
});
```

## How It Works (Technical Details)

The `chat()` method uses TypeScript function overloads:

```typescript
class AI<T extends AdapterMap> {
  // Overload 1: Stream mode
  chat(options: {...} & { as: "stream" }): AsyncIterable<StreamChunk>;
  
  // Overload 2: Response mode
  chat(options: {...} & { as: "response" }): Response;
  
  // Overload 3: Promise mode (explicit)
  chat(options: {...} & { as?: "promise" }): Promise<ChatCompletionResult>;
  
  // Overload 4: Promise mode (implicit - no "as")
  chat(options: {...}): Promise<ChatCompletionResult>;
  
  // Implementation (accepts all, returns union)
  chat(options: {...}): Promise<ChatCompletionResult> | AsyncIterable<StreamChunk> | Response {
    // Implementation...
  }
}
```

TypeScript's overload resolution picks the most specific matching signature based on the `as` parameter value!

## Benefits

1. **Type Safety**: Catch errors at compile time, not runtime
2. **IntelliSense**: Get correct autocomplete for each mode
3. **Refactoring**: TypeScript catches breaking changes automatically
4. **Documentation**: Types serve as inline documentation
5. **Confidence**: Know exactly what you're getting back

## Summary

✅ **`as: "promise"`** → `Promise<ChatCompletionResult>` - Await and access `.content`, `.usage`  
✅ **`as: "stream"`** → `AsyncIterable<StreamChunk>` - Iterate with `for await...of`  
✅ **`as: "response"`** → `Response` - Access `.headers`, `.body`, `.status`  
✅ **No `as`** → `Promise<ChatCompletionResult>` - Same as `"promise"`  

TypeScript enforces these types at compile time, providing complete type safety! 🎉
