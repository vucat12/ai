# Type Narrowing Success! ✅

The unified chat API now properly narrows types based on the `as` parameter using conditional types with the `const` generic parameter modifier.

## The Solution

```typescript
chat<const TAs extends "promise" | "stream" | "response" = "promise">(
  options: (ChatOptionsWithAdapter<T> | ChatOptionsWithFallback<T>) & { as?: TAs }
): TAs extends "stream"
  ? AsyncIterable<StreamChunk>
  : TAs extends "response"
  ? Response
  : Promise<ChatCompletionResult>
```

The key is using `<const TAs>` which preserves the literal type of the `as` parameter!

## How to Use

### ✅ Correct Usage - Type is Narrowed

```typescript
// Returns Response
return ai.chat({
  adapter: "openai",
  model: "gpt-4",
  messages: [...],
  as: "response" as const, // ← Use "as const" for type narrowing
});

// Or inline return (TypeScript infers correctly)
return ai.chat({
  adapter: "openai",
  model: "gpt-4",
  messages: [...],
  as: "response" as const,
});
```

### Type Inference Examples

```typescript
// 1. Response mode - returns Response
const response1 = ai.chat({ adapter: "openai", model: "gpt-4", messages: [], as: "response" as const });
// Type: Response ✅

// 2. Stream mode - returns AsyncIterable<StreamChunk>
const stream1 = ai.chat({ adapter: "openai", model: "gpt-4", messages: [], as: "stream" as const });
// Type: AsyncIterable<StreamChunk> ✅

// 3. Promise mode - returns Promise<ChatCompletionResult>
const promise1 = ai.chat({ adapter: "openai", model: "gpt-4", messages: [], as: "promise" as const });
// Type: Promise<ChatCompletionResult> ✅

// 4. Default (no as) - returns Promise<ChatCompletionResult>
const promise2 = ai.chat({ adapter: "openai", model: "gpt-4", messages: [] });
// Type: Promise<ChatCompletionResult> ✅
```

## Real-World Example: API Handler

```typescript
export const Route = createAPIFileRoute("/api/chat")({
  POST: async ({ request }): Promise<Response> => {
    const { messages } = await request.json();
    
    // TypeScript correctly narrows return type to Response ✅
    return ai.chat({
      adapter: "openAi",
      model: "gpt-4o",
      messages,
      as: "response" as const, // ← Type narrowing!
      fallbacks: [
        { adapter: "ollama", model: "llama2" }
      ]
    });
  }
});
```

## Why "as const" is Needed

Without `as const`:
```typescript
const as = "response"; // Type: string
ai.chat({ adapter: "openai", model: "gpt-4", messages: [], as });
// Return type: Promise<ChatCompletionResult> | AsyncIterable<StreamChunk> | Response
// ❌ TypeScript doesn't know which specific type
```

With `as const`:
```typescript
const as = "response" as const; // Type: "response" (literal)
ai.chat({ adapter: "openai", model: "gpt-4", messages: [], as });
// Return type: Response
// ✅ TypeScript narrows to exact type!
```

Or inline:
```typescript
ai.chat({ adapter: "openai", model: "gpt-4", messages: [], as: "response" as const });
// Return type: Response
// ✅ Perfect type narrowing!
```

## Technical Explanation

The `const` modifier on the generic parameter:
```typescript
chat<const TAs extends "promise" | "stream" | "response" = "promise">
```

This tells TypeScript to:
1. Infer `TAs` as the **exact literal type** provided (e.g., `"response"` not `string`)
2. Use that literal type in the conditional type check
3. Return the narrowed type based on the condition

The conditional return type:
```typescript
TAs extends "stream"
  ? AsyncIterable<StreamChunk>
  : TAs extends "response"
  ? Response
  : Promise<ChatCompletionResult>
```

This checks:
- If `TAs` is exactly `"stream"` → return `AsyncIterable<StreamChunk>`
- Else if `TAs` is exactly `"response"` → return `Response`
- Otherwise → return `Promise<ChatCompletionResult>`

## Benefits

✅ **Type Safety**: TypeScript knows exact return type at compile time  
✅ **IntelliSense**: Autocomplete shows correct properties for each mode  
✅ **Compile-Time Errors**: Catch type mismatches before runtime  
✅ **Refactoring Safety**: Changes are caught automatically  
✅ **Self-Documenting**: Types serve as inline documentation  

## Summary

The unified chat API provides perfect type narrowing when using `as const`:

| Code | Return Type |
|------|-------------|
| `as: "promise" as const` | `Promise<ChatCompletionResult>` |
| `as: "stream" as const` | `AsyncIterable<StreamChunk>` |
| `as: "response" as const` | `Response` |
| No `as` parameter | `Promise<ChatCompletionResult>` |

**Pro Tip**: Always use `as const` when specifying the `as` parameter for maximum type safety! 🎉
