/**
 * Unified Chat API Example
 * 
 * Demonstrates the new unified chat() method with three modes:
 * - "promise" (default): Returns Promise<ChatCompletionResult>
 * - "stream": Returns AsyncIterable<StreamChunk>
 * - "response": Returns Response with SSE headers
 */

import { AI } from "@ts-poc/ai";
import { OpenAIAdapter } from "@ts-poc/ai-openai";
import { OllamaAdapter } from "@ts-poc/ai-ollama";

// Initialize AI with multiple adapters
const ai = new AI({
  adapters: {
    openai: new OpenAIAdapter({
      apiKey: process.env.OPENAI_API_KEY || "",
    }),
    ollama: new OllamaAdapter({
      baseURL: "http://localhost:11434",
    }),
  },
});

// 1. PROMISE MODE (DEFAULT) - Standard non-streaming chat
async function promiseMode() {
  console.log("\n=== Promise Mode ===\n");

  const result = await ai.chat({
    adapter: "openai",
    model: "gpt-4",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "What is TypeScript in one sentence?" },
    ],
    temperature: 0.7,
    // as: "promise" is the default, so we can omit it
  });

  console.log("Response:", result.content);
  console.log(`Tokens used: ${result.usage.totalTokens}`);
}

// 2. STREAM MODE - Manual streaming with custom handling
async function streamMode() {
  console.log("\n=== Stream Mode ===\n");

  const stream = ai.chat({
    adapter: "openai",
    model: "gpt-4",
    messages: [
      { role: "user", content: "Count from 1 to 5 slowly." },
    ],
    as: "stream", // ← Returns AsyncIterable<StreamChunk>
  });

  process.stdout.write("Streaming: ");

  for await (const chunk of stream) {
    if (chunk.type === "content") {
      process.stdout.write(chunk.delta);
    } else if (chunk.type === "done") {
      console.log(`\n\nFinish reason: ${chunk.finishReason}`);
      console.log(`Tokens used: ${chunk.usage?.totalTokens}`);
    }
  }
}

// 3. RESPONSE MODE - HTTP Response with SSE headers
async function responseMode() {
  console.log("\n=== Response Mode ===\n");

  // This is what you'd return from an API endpoint
  const response = ai.chat({
    adapter: "openai",
    model: "gpt-4",
    messages: [
      { role: "user", content: "Say hello!" },
    ],
    as: "response", // ← Returns Response object
  });

  console.log("Response type:", response.constructor.name);
  console.log("Headers:");
  console.log("  Content-Type:", response.headers.get("Content-Type"));
  console.log("  Cache-Control:", response.headers.get("Cache-Control"));
  console.log("  Connection:", response.headers.get("Connection"));

  // Read the stream
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  console.log("\nStreaming content:");
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value);
    const lines = text.split("\n\n");

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") {
          console.log("\n[Stream ended]");
          continue;
        }

        try {
          const chunk = JSON.parse(data);
          if (chunk.type === "content") {
            process.stdout.write(chunk.delta);
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }
}

// 4. PROMISE MODE WITH FALLBACKS
async function promiseWithFallbacks() {
  console.log("\n=== Promise Mode with Fallbacks ===\n");

  try {
    const result = await ai.chat({
      adapter: "openai",
      model: "gpt-4",
      messages: [
        { role: "user", content: "What's 2+2?" },
      ],
      as: "promise", // or omit - it's the default
      fallbacks: [
        { adapter: "ollama", model: "llama2" },
      ],
    });

    console.log("Response:", result.content);
  } catch (error: any) {
    console.error("All adapters failed:", error.message);
  }
}

// 5. STREAM MODE WITH FALLBACKS
async function streamWithFallbacks() {
  console.log("\n=== Stream Mode with Fallbacks ===\n");

  const stream = ai.chat({
    adapter: "openai",
    model: "gpt-4",
    messages: [
      { role: "user", content: "Tell me a short joke." },
    ],
    as: "stream",
    fallbacks: [
      { adapter: "ollama", model: "llama2" },
    ],
  });

  process.stdout.write("Response: ");

  for await (const chunk of stream) {
    if (chunk.type === "content") {
      process.stdout.write(chunk.delta);
    } else if (chunk.type === "done") {
      console.log("\n");
    }
  }
}

// 6. TOOL EXECUTION IN PROMISE MODE
async function toolExecutionPromise() {
  console.log("\n=== Tool Execution (Promise Mode) ===\n");

  const tools = [
    {
      type: "function" as const,
      function: {
        name: "get_weather",
        description: "Get current weather for a location",
        parameters: {
          type: "object",
          properties: {
            location: { type: "string", description: "City name" },
          },
          required: ["location"],
        },
      },
      execute: async (args: { location: string }) => {
        console.log(`  → Executing get_weather for: ${args.location}`);
        return JSON.stringify({
          location: args.location,
          temperature: 72,
          condition: "sunny",
        });
      },
    },
  ];

  const result = await ai.chat({
    adapter: "openai",
    model: "gpt-4",
    messages: [
      { role: "user", content: "What's the weather like in San Francisco?" },
    ],
    tools,
    toolChoice: "auto",
    maxIterations: 5,
    as: "promise",
  });

  console.log("Final response:", result.content);
}

// 7. TOOL EXECUTION IN STREAM MODE
async function toolExecutionStream() {
  console.log("\n=== Tool Execution (Stream Mode) ===\n");

  const tools = [
    {
      type: "function" as const,
      function: {
        name: "calculate",
        description: "Perform a mathematical calculation",
        parameters: {
          type: "object",
          properties: {
            expression: { type: "string", description: "Math expression to evaluate" },
          },
          required: ["expression"],
        },
      },
      execute: async (args: { expression: string }) => {
        console.log(`  → Calculating: ${args.expression}`);
        // In real app, use a safe math evaluator
        const result = eval(args.expression);
        return JSON.stringify({ result });
      },
    },
  ];

  const stream = ai.chat({
    adapter: "openai",
    model: "gpt-4",
    messages: [
      { role: "user", content: "What's 123 * 456?" },
    ],
    tools,
    toolChoice: "auto",
    maxIterations: 5,
    as: "stream",
  });

  for await (const chunk of stream) {
    if (chunk.type === "content") {
      process.stdout.write(chunk.delta);
    } else if (chunk.type === "tool_call") {
      console.log(`\n→ Tool call: ${chunk.toolCall.function.name}`);
    } else if (chunk.type === "done") {
      console.log("\n");
    }
  }
}

// 8. FALLBACK-ONLY MODE (No primary adapter)
async function fallbackOnlyMode() {
  console.log("\n=== Fallback-Only Mode ===\n");

  // Try multiple adapters in order until one succeeds
  const result = await ai.chat({
    messages: [
      { role: "user", content: "What's the capital of France?" },
    ],
    fallbacks: [
      { adapter: "openai", model: "gpt-4" },
      { adapter: "ollama", model: "llama2" },
    ],
    as: "promise",
  });

  console.log("Response:", result.content);
}

// Run examples
async function main() {
  console.log("=".repeat(60));
  console.log("         UNIFIED CHAT API EXAMPLES");
  console.log("=".repeat(60));

  try {
    await promiseMode();
    await streamMode();
    await responseMode();
    await promiseWithFallbacks();
    await streamWithFallbacks();
    await toolExecutionPromise();
    await toolExecutionStream();
    await fallbackOnlyMode();
  } catch (error: any) {
    console.error("\nError:", error.message);
  }

  console.log("\n" + "=".repeat(60));
  console.log("         ALL EXAMPLES COMPLETED");
  console.log("=".repeat(60) + "\n");
}

main();
