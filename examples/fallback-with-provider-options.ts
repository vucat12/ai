/**
 * Fallback with Provider Options Example
 * 
 * This example demonstrates how to use type-safe provider-specific options
 * in fallback configurations. Each fallback can have its own providerOptions
 * that are specific to that adapter.
 */

import { AI } from "@tanstack/ai";
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
});

// ============================================================================
// Example 1: Chat with fallbacks and provider-specific options
// ============================================================================

async function chatWithFallbacks() {
  const response = await ai.chat({
    adapter: "openai",
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: "Explain quantum computing in simple terms",
      },
    ],
    // Primary adapter can have its own provider options
    providerOptions: {
      openai: {
        reasoningSummary: "detailed",
        textVerbosity: "high",
      },
    },
    // Fallbacks can have different provider options
    fallbacks: [
      {
        adapter: "anthropic",
        model: "claude-3-5-sonnet-20241022",
        // ✅ TypeScript knows this is Anthropic-specific options
        providerOptions: {
          anthropic: {
            thinking: {
              type: "enabled",
              budgetTokens: 10000,
            },
          },
        },
      },
      {
        adapter: "openai",
        model: "gpt-4o-mini",
        // ✅ TypeScript knows this is OpenAI-specific options
        providerOptions: {
          openai: {
            textVerbosity: "low", // Use low verbosity for fallback
            store: false,
          },
        },
      },
    ],
  });

  console.log("Response:", response.content);
}

// ============================================================================
// Example 2: Fallback-only mode with provider options
// ============================================================================

async function fallbackOnlyMode() {
  // No primary adapter specified - tries fallbacks in order
  const response = await ai.chat({
    messages: [
      {
        role: "user",
        content: "What is TypeScript?",
      },
    ],
    fallbacks: [
      {
        adapter: "openai",
        model: "gpt-4o",
        providerOptions: {
          openai: {
            reasoningSummary: "auto",
            maxCompletionTokens: 500,
          },
        },
      },
      {
        adapter: "anthropic",
        model: "claude-3-5-sonnet-20241022",
        providerOptions: {
          anthropic: {
            cacheControl: {
              type: "ephemeral",
              ttl: "1h",
            },
          },
        },
      },
    ],
  });

  console.log("Response:", response.content);
}

// ============================================================================
// Example 3: Global fallbacks with provider options
// ============================================================================

const aiWithGlobalFallbacks = new AI({
  adapters: {
    openai: new OpenAIAdapter({
      apiKey: process.env.OPENAI_API_KEY!,
    }),
    anthropic: new AnthropicAdapter({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    }),
  },
  // Global fallbacks that apply to all operations
  fallbacks: [
    {
      adapter: "openai",
      model: "gpt-4o",
      providerOptions: {
        openai: {
          serviceTier: "flex", // Cheaper tier for fallback
          store: false,
        },
      },
    },
    {
      adapter: "anthropic",
      model: "claude-3-5-sonnet-20241022",
      providerOptions: {
        anthropic: {
          sendReasoning: false, // Don't send reasoning in fallback
        },
      },
    },
  ],
});

async function useGlobalFallbacks() {
  // This will use the global fallbacks if primary fails
  const response = await aiWithGlobalFallbacks.chat({
    adapter: "openai",
    model: "gpt-4o", // Primary
    messages: [{ role: "user", content: "Hello!" }],
    providerOptions: {
      openai: {
        textVerbosity: "high",
      },
    },
    // If this fails, will try global fallbacks with their providerOptions
  });

  console.log("Response:", response.content);
}

// ============================================================================
// Example 4: Text generation with fallback provider options
// ============================================================================

async function textGenerationWithFallbacks() {
  const result = await ai.generateText({
    adapter: "openai",
    model: "gpt-4o",
    prompt: "Write a haiku about TypeScript",
    providerOptions: {
      openai: {
        textVerbosity: "medium",
      },
    },
    fallbacks: [
      {
        adapter: "anthropic",
        model: "claude-3-5-sonnet-20241022",
        providerOptions: {
          anthropic: {
            thinking: {
              type: "enabled",
              budgetTokens: 5000,
            },
          },
        },
      },
    ],
  });

  console.log("Generated text:", result.text);
}

// ============================================================================
// Example 5: Image generation with fallback provider options
// ============================================================================

async function imageGenerationWithFallbacks() {
  const result = await ai.image({
    adapter: "openai",
    model: "dall-e-3",
    prompt: "A futuristic city with flying cars",
    size: "1024x1024",
    providerOptions: {
      openai: {
        quality: "hd",
        style: "vivid",
      },
    },
    fallbacks: [
      {
        adapter: "openai",
        model: "dall-e-2",
        // Fallback to standard quality
        providerOptions: {
          openai: {
            quality: "standard",
          },
        },
      },
    ],
  });

  console.log("Generated image:", result.image?.base64.substring(0, 50) + "...");
}

// ============================================================================
// Type Safety Demonstration
// ============================================================================

async function demonstrateTypeSafety() {
  // ✅ Correct - OpenAI options for OpenAI adapter
  await ai.chat({
    adapter: "openai",
    model: "gpt-4o",
    messages: [],
    fallbacks: [
      {
        adapter: "openai",
        model: "gpt-4o-mini",
        providerOptions: {
          openai: {
            reasoningSummary: "detailed",
          },
        },
      },
    ],
  });

  // ✅ Correct - Anthropic options for Anthropic adapter
  await ai.chat({
    adapter: "anthropic",
    model: "claude-3-5-sonnet-20241022",
    messages: [],
    fallbacks: [
      {
        adapter: "anthropic",
        model: "claude-3-opus-20240229",
        providerOptions: {
          anthropic: {
            thinking: {
              type: "enabled",
              budgetTokens: 8000,
            },
          },
        },
      },
    ],
  });

  // ❌ This would be a TypeScript error:
  // await ai.chat({
  //   adapter: "openai",
  //   model: "gpt-4o",
  //   messages: [],
  //   fallbacks: [
  //     {
  //       adapter: "openai",
  //       model: "gpt-4o-mini",
  //       providerOptions: {
  //         openai: {
  //           thinking: { ... }, // ERROR: thinking doesn't exist on OpenAI
  //         },
  //       },
  //     },
  //   ],
  // });
}

// ============================================================================
// Run Examples
// ============================================================================

async function main() {
  console.log("\n=== Chat with Fallbacks ===");
  await chatWithFallbacks();

  console.log("\n=== Fallback-Only Mode ===");
  await fallbackOnlyMode();

  console.log("\n=== Global Fallbacks ===");
  await useGlobalFallbacks();

  console.log("\n=== Text Generation ===");
  await textGenerationWithFallbacks();

  console.log("\n=== Image Generation ===");
  await imageGenerationWithFallbacks();

  console.log("\n=== Type Safety Demo ===");
  await demonstrateTypeSafety();
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
