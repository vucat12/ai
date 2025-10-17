/**
 * System Prompts Example
 * 
 * This example demonstrates the new systemPrompts feature that allows you to:
 * 1. Define default system prompts in the AI constructor
 * 2. Override them per chat call
 * 3. Use multiple system prompts as an array
 */

import { AI } from "@tanstack/ai";
import { OpenAIAdapter } from "@tanstack/ai-openai";

// Example 1: Constructor-level system prompts
// ============================================
// Define default system prompts that will be used for ALL chat calls

const aiWithDefaultPrompts = new AI({
  adapters: {
    openai: new OpenAIAdapter({
      apiKey: process.env.OPENAI_API_KEY!,
    }),
  },
  // These prompts will be automatically prepended to all chat calls
  systemPrompts: [
    "You are a helpful AI assistant.",
    "Always be concise and friendly in your responses.",
  ],
});

// Usage: No need to manually add system messages!
async function chatWithDefaults() {
  const result = await aiWithDefaultPrompts.chat({
    adapter: "openai",
    model: "gpt-4",
    messages: [
      { role: "user", content: "What is the capital of France?" },
    ],
  });

  console.log("Response:", result.content);
  // System prompts were automatically prepended before the user message
}

// Example 2: Override system prompts per chat call
// =================================================
// You can override the default prompts for specific conversations

async function chatWithCustomPrompts() {
  const result = await aiWithDefaultPrompts.chat({
    adapter: "openai",
    model: "gpt-4",
    messages: [
      { role: "user", content: "Explain quantum physics" },
    ],
    // Override the default system prompts for this call only
    systemPrompts: [
      "You are a physics professor.",
      "Explain concepts using simple analogies.",
    ],
  });

  console.log("Response:", result.content);
  // The custom prompts replaced the default ones for this call
}

// Example 3: Single system prompt
// ================================
// You can also use a single prompt instead of an array

const aiWithSinglePrompt = new AI({
  adapters: {
    openai: new OpenAIAdapter({
      apiKey: process.env.OPENAI_API_KEY!,
    }),
  },
  systemPrompts: ["You are a coding assistant specialized in TypeScript."],
});

// Example 4: No system prompts (optional)
// ========================================
// If you don't provide systemPrompts, behavior is unchanged

const aiWithoutPrompts = new AI({
  adapters: {
    openai: new OpenAIAdapter({
      apiKey: process.env.OPENAI_API_KEY!,
    }),
  },
  // No systemPrompts - you can still manually add system messages if needed
});

async function chatWithManualSystemMessage() {
  const result = await aiWithoutPrompts.chat({
    adapter: "openai",
    model: "gpt-4",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Hello!" },
    ],
  });

  console.log("Response:", result.content);
}

// Example 5: Multiple system prompts for context layering
// ========================================================
// Use multiple prompts to layer different instructions

const aiWithLayeredPrompts = new AI({
  adapters: {
    openai: new OpenAIAdapter({
      apiKey: process.env.OPENAI_API_KEY!,
    }),
  },
  systemPrompts: [
    "You are a customer support agent for TechCorp.",
    "Our business hours are 9 AM to 5 PM EST.",
    "Always ask for the customer's order number before proceeding.",
    "Be empathetic and patient with frustrated customers.",
  ],
});

// Example 6: Tool-aware system prompts
// =====================================
// System prompts work seamlessly with tools

const tools = {
  getWeather: {
    type: "function" as const,
    function: {
      name: "getWeather",
      description: "Get the current weather for a location",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string", description: "City name" },
        },
        required: ["location"],
      },
    },
    execute: async ({ location }: { location: string }) => {
      return JSON.stringify({ location, temp: 72, condition: "sunny" });
    },
  },
} as const;

const aiWithToolsAndPrompts = new AI({
  adapters: {
    openai: new OpenAIAdapter({
      apiKey: process.env.OPENAI_API_KEY!,
    }),
  },
  tools,
  systemPrompts: [
    "You are a weather assistant.",
    "When asked about weather, use the getWeather tool.",
    "Always include the temperature in Fahrenheit and the condition.",
  ],
});

async function chatWithToolsAndPrompts() {
  const result = await aiWithToolsAndPrompts.chat({
    adapter: "openai",
    model: "gpt-4",
    messages: [
      { role: "user", content: "What's the weather in New York?" },
    ],
    tools: ["getWeather"],
  });

  console.log("Response:", result.content);
  // System prompts guide the AI on how to use the tools
}

// Example 7: Streaming with system prompts
// =========================================
// System prompts work with streaming too

async function streamWithPrompts() {
  const stream = aiWithDefaultPrompts.chat({
    adapter: "openai",
    model: "gpt-4",
    messages: [
      { role: "user", content: "Tell me a short story" },
    ],
    as: "stream" as const,
    // You can still override prompts in streaming mode
    systemPrompts: [
      "You are a creative storyteller.",
      "Keep stories under 100 words.",
    ],
  });

  for await (const chunk of stream) {
    if (chunk.type === "content") {
      process.stdout.write(chunk.delta);
    }
  }
}

// Example 8: Response mode with system prompts
// =============================================
// System prompts work with Response mode for HTTP streaming

async function responseWithPrompts() {
  const response = aiWithDefaultPrompts.chat({
    adapter: "openai",
    model: "gpt-4",
    messages: [
      { role: "user", content: "Hello!" },
    ],
    as: "response" as const,
  });

  // Return this Response directly from an API endpoint
  return response;
}

// Example 9: Behavior when messages already have system prompts
// ==============================================================
// If messages already contain system messages, they are REPLACED

async function replacingExistingSystemMessages() {
  const result = await aiWithDefaultPrompts.chat({
    adapter: "openai",
    model: "gpt-4",
    messages: [
      // This system message will be REPLACED by the default prompts
      { role: "system", content: "This will be replaced" },
      { role: "user", content: "Hello!" },
    ],
  });

  console.log("Response:", result.content);
  // The AI used the default prompts, not the one in messages
}

// Example 10: Empty array to skip system prompts
// ===============================================
// Pass an empty array to skip system prompts for a specific call

async function skipSystemPromptsForOneCall() {
  const result = await aiWithDefaultPrompts.chat({
    adapter: "openai",
    model: "gpt-4",
    messages: [
      { role: "user", content: "Hello!" },
    ],
    systemPrompts: [], // Skip system prompts for this call
  });

  console.log("Response:", result.content);
  // No system prompts were used
}

// Run examples
async function main() {
  console.log("=== Example 1: Default prompts ===");
  await chatWithDefaults();

  console.log("\n=== Example 2: Override prompts ===");
  await chatWithCustomPrompts();

  console.log("\n=== Example 6: Tools + prompts ===");
  await chatWithToolsAndPrompts();

  console.log("\n=== Example 7: Streaming ===");
  await streamWithPrompts();
}

// Uncomment to run:
// main().catch(console.error);
