# Unified Chat API

## Overview

The `chat()` method has been unified to support three different return types through the `as` configuration option:

- **`"promise"`** (default): Returns `Promise<ChatCompletionResult>` - standard non-streaming chat
- **`"stream"`**: Returns `AsyncIterable<StreamChunk>` - streaming chunks for manual handling
- **`"response"`**: Returns `Response` - HTTP response with proper streaming headers (SSE format)

This eliminates the need for separate `chat()` and `streamChat()` methods.

## Migration Guide

### Before (Separate Methods)

```typescript
// For non-streaming
const result = await ai.chat({
  adapter: "openai",
  model: "gpt-4",
  messages: [{ role: "user", content: "Hello" }]
});

// For streaming
const stream = ai.streamChat({
  adapter: "openai", 
  model: "gpt-4",
  messages: [{ role: "user", content: "Hello" }]
});
for await (const chunk of stream) {
  console.log(chunk);
}

// For HTTP response
import { toStreamResponse } from "@ts-poc/ai";
const stream = ai.streamChat({
  adapter: "openai",
  model: "gpt-4", 
  messages: [{ role: "user", content: "Hello" }]
});
return toStreamResponse(stream);
```

### After (Unified Method)

```typescript
// For non-streaming (default, "as" is optional)
const result = await ai.chat({
  adapter: "openai",
  model: "gpt-4",
  messages: [{ role: "user", content: "Hello" }],
  as: "promise" // or omit this line - "promise" is the default
});

// For streaming
const stream = ai.chat({
  adapter: "openai",
  model: "gpt-4",
  messages: [{ role: "user", content: "Hello" }],
  as: "stream"
});
for await (const chunk of stream) {
  console.log(chunk);
}

// For HTTP response (no need to import toStreamResponse!)
return ai.chat({
  adapter: "openai",
  model: "gpt-4",
  messages: [{ role: "user", content: "Hello" }],
  as: "response"
});
```

## Usage Examples

### 1. Promise Mode (Default)

Standard non-streaming chat completion:

```typescript
const result = await ai.chat({
  adapter: "openai",
  model: "gpt-4",
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "What is TypeScript?" }
  ],
  temperature: 0.7,
  // as: "promise" is implicit
});

console.log(result.content);
console.log(`Tokens used: ${result.usage.totalTokens}`);
```

### 2. Stream Mode

Manual streaming for custom handling:

```typescript
const stream = ai.chat({
  adapter: "openai",
  model: "gpt-4",
  messages: [{ role: "user", content: "Write a story" }],
  as: "stream"
});

for await (const chunk of stream) {
  if (chunk.type === "content") {
    process.stdout.write(chunk.delta);
  } else if (chunk.type === "tool_call") {
    console.log(`Tool: ${chunk.toolCall.function.name}`);
  } else if (chunk.type === "done") {
    console.log(`\nFinished: ${chunk.finishReason}`);
    console.log(`Tokens: ${chunk.usage?.totalTokens}`);
  }
}
```

### 3. Response Mode (HTTP Streaming)

Perfect for API endpoints:

```typescript
// TanStack Start API Route
export const POST = async ({ request }: { request: Request }) => {
  const { messages } = await request.json();

  // Returns a Response object with proper SSE headers
  return ai.chat({
    adapter: "openai",
    model: "gpt-4o",
    messages,
    temperature: 0.7,
    as: "response", // ← Returns Response directly!
    fallbacks: [
      { adapter: "ollama", model: "llama2" }
    ]
  });
};
```

## With Fallbacks

All three modes support fallbacks:

```typescript
// Promise mode with fallbacks
const result = await ai.chat({
  adapter: "openai",
  model: "gpt-4",
  messages: [{ role: "user", content: "Hello" }],
  as: "promise",
  fallbacks: [
    { adapter: "anthropic", model: "claude-3-sonnet-20240229" },
    { adapter: "ollama", model: "llama2" }
  ]
});

// Stream mode with fallbacks
const stream = ai.chat({
  adapter: "openai",
  model: "gpt-4",
  messages: [{ role: "user", content: "Hello" }],
  as: "stream",
  fallbacks: [
    { adapter: "anthropic", model: "claude-3-sonnet-20240229" }
  ]
});

// Response mode with fallbacks (seamless failover in HTTP streaming!)
return ai.chat({
  adapter: "openai",
  model: "gpt-4",
  messages: [{ role: "user", content: "Hello" }],
  as: "response",
  fallbacks: [
    { adapter: "ollama", model: "llama2" }
  ]
});
```

## Tool Execution

Tool execution works in all three modes:

```typescript
const tools = [
  {
    type: "function" as const,
    function: {
      name: "get_weather",
      description: "Get weather for a location",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string" }
        }
      }
    },
    execute: async (args: { location: string }) => {
      return JSON.stringify({ temp: 72, condition: "sunny" });
    }
  }
];

// Promise mode - waits for all tool executions to complete
const result = await ai.chat({
  adapter: "openai",
  model: "gpt-4",
  messages: [{ role: "user", content: "What's the weather in SF?" }],
  tools,
  toolChoice: "auto",
  maxIterations: 5,
  as: "promise"
});

// Stream mode - see tool execution happen in real-time
const stream = ai.chat({
  adapter: "openai",
  model: "gpt-4",
  messages: [{ role: "user", content: "What's the weather in SF?" }],
  tools,
  toolChoice: "auto",
  maxIterations: 5,
  as: "stream"
});

for await (const chunk of stream) {
  if (chunk.type === "tool_call") {
    console.log(`Calling tool: ${chunk.toolCall.function.name}`);
  }
}

// Response mode - stream tool execution to client
return ai.chat({
  adapter: "openai",
  model: "gpt-4",
  messages: [{ role: "user", content: "What's the weather in SF?" }],
  tools,
  toolChoice: "auto",
  maxIterations: 5,
  as: "response"
});
```

## Type Safety

TypeScript automatically infers the correct return type based on the `as` option:

```typescript
// Type: Promise<ChatCompletionResult>
const promise = ai.chat({ adapter: "openai", model: "gpt-4", messages: [] });

// Type: AsyncIterable<StreamChunk>
const stream = ai.chat({ adapter: "openai", model: "gpt-4", messages: [], as: "stream" });

// Type: Response
const response = ai.chat({ adapter: "openai", model: "gpt-4", messages: [], as: "response" });
```

## Benefits

1. **Simpler API**: One method instead of two
2. **Consistent Interface**: Same options across all modes
3. **HTTP Streaming Made Easy**: No need to manually call `toStreamResponse()`
4. **Fallbacks Everywhere**: All modes support the same fallback mechanism
5. **Type Safety**: TypeScript infers the correct return type
6. **Backward Compatible**: Default behavior (promise) matches old `chat()` method

## Real-World Example: TanStack Start API

```typescript
import { createAPIFileRoute } from "@tanstack/start/api";
import { ai } from "~/lib/ai-client";

export const Route = createAPIFileRoute("/api/chat")({
  POST: async ({ request }) => {
    const { messages, tools } = await request.json();

    // That's it! Just return the result - it's already a Response
    return ai.chat({
      adapter: "openAi",
      model: "gpt-4o",
      messages,
      tools,
      toolChoice: "auto",
      maxIterations: 5,
      temperature: 0.7,
      as: "response", // ← Returns Response with SSE headers
      fallbacks: [
        { adapter: "ollama", model: "llama2" }
      ]
    });
  }
});
```

Client-side consumption:

```typescript
const response = await fetch("/api/chat", {
  method: "POST",
  body: JSON.stringify({ messages, tools })
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const text = decoder.decode(value);
  const lines = text.split("\n\n");
  
  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const data = line.slice(6);
      if (data === "[DONE]") continue;
      
      const chunk = JSON.parse(data);
      if (chunk.type === "content") {
        console.log(chunk.delta); // Stream content to UI
      }
    }
  }
}
```

## Summary

The unified `chat()` API provides:
- **One method** for all chat use cases
- **Three modes**: promise, stream, response
- **Same options** across all modes
- **Built-in HTTP streaming** (no manual conversion needed)
- **Full fallback support** in all modes
- **Type-safe** return types
- **Simpler code** for common patterns
