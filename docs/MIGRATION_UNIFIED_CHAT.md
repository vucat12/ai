# Migration Example: api.tanchat.ts

## Before (Using streamChat)

```typescript
import { createAPIFileRoute } from "@tanstack/start/api";
import { toStreamResponse } from "@ts-poc/ai";
import { ai } from "~/lib/ai-client";

export const Route = createAPIFileRoute("/api/tanchat")({
  POST: async ({ request }) => {
    const { messages, tools } = await request.json();

    // Old way: Call streamChat and manually convert to Response
    const stream = ai.streamChat({
      model: "gpt-4o",
      adapter: "openAi",
      fallbacks: [
        {
          adapter: "ollama",
          model: "gpt-oss:20b"
        }
      ],
      messages: allMessages,
      temperature: 0.7,
      toolChoice: "auto",
      maxIterations: 5,
    });

    // Had to manually convert to Response
    return toStreamResponse(stream);
  }
});
```

## After (Using Unified chat with as: "response")

```typescript
import { createAPIFileRoute } from "@tanstack/start/api";
import { ai } from "~/lib/ai-client";

export const Route = createAPIFileRoute("/api/tanchat")({
  POST: async ({ request }) => {
    const { messages, tools } = await request.json();

    // New way: Just return chat() with as: "response"
    // No need to import toStreamResponse!
    return ai.chat({
      model: "gpt-4o",
      adapter: "openAi",
      fallbacks: [
        {
          adapter: "ollama",
          model: "gpt-oss:20b"
        }
      ],
      messages: allMessages,
      temperature: 0.7,
      toolChoice: "auto",
      maxIterations: 5,
      as: "response", // ← This returns a Response object directly!
    });
  }
});
```

## Key Changes

1. **Removed import**: No need to import `toStreamResponse` anymore
2. **Changed method**: `streamChat()` → `chat()`
3. **Added option**: `as: "response"` - tells chat() to return a Response object
4. **Removed conversion**: No manual `toStreamResponse(stream)` call needed

## Benefits

✅ **Simpler code**: One less import, one less function call  
✅ **Same functionality**: Still returns SSE-formatted Response  
✅ **Same fallback behavior**: OpenAI → Ollama failover still works  
✅ **Same tool execution**: Tools are still executed automatically  
✅ **Type-safe**: TypeScript knows it returns a Response  

## Other Modes Available

If you need different behavior:

```typescript
// Get a promise with the complete response (non-streaming)
const result = await ai.chat({
  adapter: "openAi",
  model: "gpt-4o",
  messages,
  as: "promise", // or omit - it's the default
});
console.log(result.content);

// Get a stream for custom handling
const stream = ai.chat({
  adapter: "openAi",
  model: "gpt-4o",
  messages,
  as: "stream",
});
for await (const chunk of stream) {
  // Custom chunk handling
}
```

## Complete Example

Here's your complete updated file:

```typescript
import { createAPIFileRoute } from "@tanstack/start/api";
import { ai } from "~/lib/ai-client";

const SYSTEM_PROMPT = `You are a helpful AI assistant...`;

export const Route = createAPIFileRoute("/api/tanchat")({
  POST: async ({ request }) => {
    try {
      const body = await request.json();
      const { messages, tools } = body;

      const allMessages = tools
        ? messages
        : [{ role: "system", content: SYSTEM_PROMPT }, ...messages];

      // That's it! Just return chat() with as: "response"
      return ai.chat({
        adapter: "openAi",
        model: "gpt-4o",
        messages: allMessages,
        temperature: 0.7,
        tools,
        toolChoice: "auto",
        maxIterations: 5,
        as: "response", // ← Returns Response with SSE headers
        fallbacks: [
          {
            adapter: "ollama",
            model: "gpt-oss:20b"
          }
        ]
      });
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  }
});
```

## Testing

The client-side code doesn't need any changes! It still consumes the SSE stream the same way:

```typescript
const response = await fetch("/api/tanchat", {
  method: "POST",
  body: JSON.stringify({ messages, tools })
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const text = decoder.decode(value);
  // Parse SSE format and handle chunks
}
```

Everything works exactly the same, just with cleaner API code! 🎉
