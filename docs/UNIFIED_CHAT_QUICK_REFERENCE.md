# Unified Chat API - Quick Reference

## Three Modes, One Method

```typescript
// 1. PROMISE MODE (default) - Returns Promise<ChatCompletionResult>
const result = await ai.chat({
  adapter: "openai",
  model: "gpt-4",
  messages: [{ role: "user", content: "Hello" }],
  // as: "promise" is optional - it's the default
});

// 2. STREAM MODE - Returns AsyncIterable<StreamChunk>
const stream = ai.chat({
  adapter: "openai",
  model: "gpt-4",
  messages: [{ role: "user", content: "Hello" }],
  as: "stream",
});
for await (const chunk of stream) {
  console.log(chunk);
}

// 3. RESPONSE MODE - Returns Response (HTTP SSE)
return ai.chat({
  adapter: "openai",
  model: "gpt-4",
  messages: [{ role: "user", content: "Hello" }],
  as: "response",
});
```

## Quick Comparison

| Feature | Promise | Stream | Response |
|---------|---------|--------|----------|
| **Return Type** | `Promise<ChatCompletionResult>` | `AsyncIterable<StreamChunk>` | `Response` |
| **When to Use** | Need complete response | Custom stream handling | HTTP endpoints |
| **Async/Await** | ✅ Yes | ✅ Yes (for await) | ❌ No (return directly) |
| **Fallbacks** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Tool Execution** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Type-Safe Models** | ✅ Yes | ✅ Yes | ✅ Yes |
| **HTTP Headers** | ❌ No | ❌ No | ✅ Yes (auto-added) |

## Common Patterns

### API Endpoint (TanStack Start)

```typescript
export const Route = createAPIFileRoute("/api/chat")({
  POST: async ({ request }) => {
    const { messages } = await request.json();
    
    return ai.chat({
      adapter: "openAi",
      model: "gpt-4o",
      messages,
      as: "response", // ← Returns Response directly!
      fallbacks: [{ adapter: "ollama", model: "llama2" }]
    });
  }
});
```

### CLI Application

```typescript
const stream = ai.chat({
  adapter: "openai",
  model: "gpt-4",
  messages: [{ role: "user", content: userInput }],
  as: "stream",
});

for await (const chunk of stream) {
  if (chunk.type === "content") {
    process.stdout.write(chunk.delta);
  }
}
```

### Batch Processing

```typescript
const result = await ai.chat({
  adapter: "openai",
  model: "gpt-4",
  messages: [{ role: "user", content: document }],
  // as: "promise" is default
});

await saveToDatabase(result.content);
```

## With Tools

All modes support tools:

```typescript
const tools = [
  {
    type: "function" as const,
    function: {
      name: "get_weather",
      description: "Get weather for a location",
      parameters: { /* ... */ }
    },
    execute: async (args: any) => {
      return JSON.stringify({ temp: 72, condition: "sunny" });
    }
  }
];

// Promise mode
const result = await ai.chat({
  adapter: "openai",
  model: "gpt-4",
  messages: [{ role: "user", content: "What's the weather in SF?" }],
  tools,
  toolChoice: "auto",
  maxIterations: 5,
});

// Stream mode
const stream = ai.chat({
  adapter: "openai",
  model: "gpt-4",
  messages: [{ role: "user", content: "What's the weather in SF?" }],
  tools,
  toolChoice: "auto",
  maxIterations: 5,
  as: "stream",
});

// Response mode (for API)
return ai.chat({
  adapter: "openai",
  model: "gpt-4",
  messages: [{ role: "user", content: "What's the weather in SF?" }],
  tools,
  toolChoice: "auto",
  maxIterations: 5,
  as: "response",
});
```

## With Fallbacks

All modes support the same fallback mechanism:

```typescript
// Promise with fallbacks
const result = await ai.chat({
  adapter: "openai",
  model: "gpt-4",
  messages: [...],
  fallbacks: [
    { adapter: "anthropic", model: "claude-3-sonnet-20240229" },
    { adapter: "ollama", model: "llama2" }
  ]
});

// Stream with fallbacks
const stream = ai.chat({
  adapter: "openai",
  model: "gpt-4",
  messages: [...],
  as: "stream",
  fallbacks: [
    { adapter: "ollama", model: "llama2" }
  ]
});

// Response with fallbacks (seamless HTTP failover!)
return ai.chat({
  adapter: "openai",
  model: "gpt-4",
  messages: [...],
  as: "response",
  fallbacks: [
    { adapter: "ollama", model: "llama2" }
  ]
});
```

## Fallback-Only Mode

No primary adapter, just try fallbacks in order:

```typescript
const result = await ai.chat({
  messages: [...],
  fallbacks: [
    { adapter: "openai", model: "gpt-4" },
    { adapter: "anthropic", model: "claude-3-sonnet-20240229" },
    { adapter: "ollama", model: "llama2" }
  ],
  // as: "promise" | "stream" | "response"
});
```

## Migration from streamChat

### Before
```typescript
import { toStreamResponse } from "@ts-poc/ai";

const stream = ai.streamChat({ adapter: "openai", model: "gpt-4", messages: [] });
return toStreamResponse(stream);
```

### After
```typescript
// No import needed!

return ai.chat({ adapter: "openai", model: "gpt-4", messages: [], as: "response" });
```

## Type Inference

TypeScript automatically infers the correct return type:

```typescript
// Type: Promise<ChatCompletionResult>
const promise = ai.chat({ adapter: "openai", model: "gpt-4", messages: [] });

// Type: AsyncIterable<StreamChunk>
const stream = ai.chat({ adapter: "openai", model: "gpt-4", messages: [], as: "stream" });

// Type: Response
const response = ai.chat({ adapter: "openai", model: "gpt-4", messages: [], as: "response" });
```

## Error Handling

All modes throw errors if all adapters fail:

```typescript
try {
  const result = await ai.chat({
    adapter: "openai",
    model: "gpt-4",
    messages: [...],
    fallbacks: [{ adapter: "ollama", model: "llama2" }]
  });
} catch (error: any) {
  console.error("All adapters failed:", error.message);
}
```

## Cheat Sheet

| What You Want | Use This | Example |
|---------------|----------|---------|
| Complete response | `as: "promise"` (default) | `const result = await ai.chat({...})` |
| Custom streaming | `as: "stream"` | `for await (const chunk of ai.chat({..., as: "stream"}))` |
| API endpoint | `as: "response"` | `return ai.chat({..., as: "response"})` |
| With fallbacks | Add `fallbacks: [...]` | `fallbacks: [{ adapter: "ollama", model: "llama2" }]` |
| With tools | Add `tools: [...]` | `tools: [{...}, {...}], toolChoice: "auto"` |
| Multiple adapters | Use `fallbacks` only | `fallbacks: [{ adapter: "a", model: "m1" }, {...}]` |

## Documentation

- **Full API Docs**: `docs/UNIFIED_CHAT_API.md`
- **Migration Guide**: `docs/MIGRATION_UNIFIED_CHAT.md`
- **Implementation**: `docs/UNIFIED_CHAT_IMPLEMENTATION.md`
- **Examples**: `examples/unified-chat-api-example.ts`
