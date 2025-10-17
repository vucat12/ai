/**
 * Provider-Specific Options Example
 * 
 * This example demonstrates how to use type-safe provider-specific options
 * with different AI adapters. The providerOptions field is typed based on
 * the selected adapter, giving you autocomplete and type checking.
 */

import { AI, tool } from "@tanstack/ai";
import { OpenAIAdapter } from "@tanstack/ai-openai";
import { AnthropicAdapter } from "@tanstack/ai-anthropic";

// Initialize AI with multiple adapters
const ai = new AI({
  adapters: {
    openai: new OpenAIAdapter({
      apiKey: process.env.OPENAI_API_KEY!,
    }),
    anthropic: new AnthropicAdapter({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    }),
  },
  tools: {
    calculator: tool({
      type: "function",
      function: {
        name: "calculator",
        description: "Perform a calculation",
        parameters: {
          type: "object",
          properties: {
            operation: { type: "string" },
            a: { type: "number" },
            b: { type: "number" },
          },
          required: ["operation", "a", "b"],
        },
      },
      execute: async (args) => {
        const { operation, a, b } = args;
        switch (operation) {
          case "add": return String(a + b);
          case "subtract": return String(a - b);
          case "multiply": return String(a * b);
          case "divide": return String(a / b);
          default: return "Unknown operation";
        }
      },
    }),
  },
});

// ============================================================================
// OpenAI-Specific Options
// ============================================================================

async function exampleOpenAIReasoningModel() {
  const response = await ai.chat({
    adapter: "openai",
    model: "gpt-4o", // Reasoning-capable model
    messages: [
      {
        role: "user",
        content: "Explain the reasoning behind choosing TypeScript over JavaScript for a large project",
      },
    ],
    // ✅ TypeScript knows this is OpenAI and provides autocomplete
    providerOptions: {
      openai: {
        // Get detailed reasoning summaries from reasoning models
        reasoningSummary: "detailed", // 'auto' | 'detailed'

        // Control response verbosity
        textVerbosity: "high", // 'low' | 'medium' | 'high'

        // Store generation for distillation
        store: true,
        metadata: {
          session: "example-123",
          user: "demo-user",
        },
      },
    },
  });

  console.log("Response:", response.content);
}

async function exampleOpenAIToolCalling() {
  const response = await ai.chat({
    adapter: "openai",
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: "What is 25 multiplied by 4, then divide that by 2?",
      },
    ],
    tools: ["calculator"],
    providerOptions: {
      openai: {
        // Control parallel tool calls
        parallelToolCalls: false, // Execute tools one at a time

        // Limit total tool calls
        maxToolCalls: 5,

        // User identifier for monitoring
        user: "demo-user-123",
      },
    },
  });

  console.log("Response:", response.content);
}

async function exampleOpenAIPromptCaching() {
  const response = await ai.chat({
    adapter: "openai",
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are an expert TypeScript developer. " + "A".repeat(2000), // Long prompt
      },
      {
        role: "user",
        content: "How do I create a generic type?",
      },
    ],
    providerOptions: {
      openai: {
        // Manual prompt caching control
        promptCacheKey: "typescript-expert-v1",

        // Service tier for cost/latency tradeoff
        serviceTier: "flex", // 'auto' | 'flex' | 'priority' | 'default'
      },
    },
  });

  console.log("Response:", response.content);
}

async function exampleOpenAILogprobs() {
  const response = await ai.chat({
    adapter: "openai",
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: "Is TypeScript better than JavaScript? Answer with yes or no.",
      },
    ],
    providerOptions: {
      openai: {
        // Get log probabilities for tokens
        logprobs: 5, // Get top 5 token probabilities (or use true for all)

        // Bias specific tokens
        logitBias: {
          // Token IDs for "yes" and "no" - adjust likelihood
          9820: 10,   // Increase likelihood of "yes"
          2201: -10,  // Decrease likelihood of "no"
        },
      },
    },
  });

  console.log("Response:", response.content);
}

// ============================================================================
// Anthropic-Specific Options
// ============================================================================

async function exampleAnthropicReasoning() {
  const response = await ai.chat({
    adapter: "anthropic",
    model: "claude-opus-4-20250514", // Reasoning-capable model
    messages: [
      {
        role: "user",
        content: "How many people will live in the world in 2040?",
      },
    ],
    // ✅ TypeScript knows this is Anthropic and provides different options
    providerOptions: {
      anthropic: {
        // Enable reasoning with token budget
        thinking: {
          type: "enabled",
          budgetTokens: 12000, // Allocate tokens for reasoning
        },

        // Include reasoning content in requests
        sendReasoning: true,
      },
    },
  });

  console.log("Response:", response.content);
}

async function exampleAnthropicPromptCaching() {
  // Note: Cache control is applied at the message level via providerOptions in content
  const longDocument = "A".repeat(5000); // Document longer than 2048 tokens

  const response = await ai.chat({
    adapter: "anthropic",
    model: "claude-3-5-sonnet-20241022",
    messages: [
      {
        role: "user",
        content: `Analyze this document: ${longDocument}`,
      },
    ],
    providerOptions: {
      anthropic: {
        // Enable prompt caching with longer TTL
        cacheControl: {
          type: "ephemeral",
          ttl: "1h", // '5m' (default) | '1h'
        },
      },
    },
  });

  console.log("Response:", response.content);
}

// ============================================================================
// Image Generation with Provider Options
// ============================================================================

async function exampleOpenAIImageGeneration() {
  const result = await ai.image({
    adapter: "openai",
    model: "dall-e-3",
    prompt: "A futuristic guitar made of crystal with glowing strings",
    size: "1024x1024",
    providerOptions: {
      openai: {
        // DALL-E 3 specific options
        quality: "hd",          // 'standard' | 'hd'
        style: "vivid",         // 'natural' | 'vivid'

        // Reproducibility
        seed: 42,
      },
    },
  });

  console.log("Generated image:", result.image?.base64.substring(0, 50) + "...");
}

// ============================================================================
// Type Safety Demonstration
// ============================================================================

async function demonstrateTypeSafety() {
  // ❌ This would be a TypeScript error:
  // await ai.chat({
  //   adapter: "openai",
  //   model: "gpt-4",
  //   messages: [],
  //   providerOptions: {
  //     openai: {
  //       thinking: { type: "enabled", budgetTokens: 1000 } // ERROR: thinking doesn't exist on OpenAI
  //     }
  //   }
  // });

  // ❌ This would also be a TypeScript error:
  // await ai.chat({
  //   adapter: "anthropic",
  //   model: "claude-3-opus-20240229",
  //   messages: [],
  //   providerOptions: {
  //     anthropic: {
  //       reasoningSummary: "detailed" // ERROR: reasoningSummary doesn't exist on Anthropic
  //     }
  //   }
  // });

  // ✅ Only valid options are allowed
  await ai.chat({
    adapter: "openai",
    model: "gpt-4o",
    messages: [{ role: "user", content: "Hello" }],
    providerOptions: {
      openai: {
        reasoningSummary: "detailed", // Valid OpenAI option
        textVerbosity: "high",        // Valid OpenAI option
      },
    },
  });

  await ai.chat({
    adapter: "anthropic",
    model: "claude-3-opus-20240229",
    messages: [{ role: "user", content: "Hello" }],
    providerOptions: {
      anthropic: {
        thinking: { type: "enabled", budgetTokens: 5000 }, // Valid Anthropic option
        sendReasoning: true,                                // Valid Anthropic option
      },
    },
  });
}

// ============================================================================
// Run Examples
// ============================================================================

async function main() {
  console.log("\n=== OpenAI Examples ===");
  await exampleOpenAIReasoningModel();
  await exampleOpenAIToolCalling();
  await exampleOpenAIPromptCaching();
  await exampleOpenAILogprobs();
  await exampleOpenAIImageGeneration();

  console.log("\n=== Anthropic Examples ===");
  await exampleAnthropicReasoning();
  await exampleAnthropicPromptCaching();

  console.log("\n=== Type Safety Demo ===");
  await demonstrateTypeSafety();
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
