/**
 * Fallback Error Handling Test
 * 
 * This demonstrates that when the primary adapter fails (e.g., rate limit, no API key),
 * the system automatically falls back to the configured fallback adapters.
 */

import { AI } from "../packages/ai/src";
import { OpenAIAdapter } from "../packages/ai-openai/src";
import { OllamaAdapter } from "../packages/ai-ollama/src";

const ai = new AI({
  adapters: {
    openai: new OpenAIAdapter({
      // Intentionally using invalid or missing API key to simulate failure
      apiKey: process.env.OPENAI_API_KEY || "invalid-key",
    }),
    ollama: new OllamaAdapter({
      baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    }),
  },
});

async function testFallbackOnError() {
  console.log("=== Testing Fallback on Primary Adapter Failure ===\n");

  // Test 1: Single adapter with fallback - if OpenAI fails, use Ollama
  console.log("1. OpenAI (primary) -> Ollama (fallback on error):");
  try {
    const result = await ai.chat({
      adapter: "openai",
      model: "gpt-4",
      messages: [{ role: "user", content: "Say hello in one word" }],
      fallbacks: [
        { adapter: "ollama", model: "llama2" },
      ],
    });
    console.log("✓ Response:", result.content);
    console.log("  Model used:", result.model);
  } catch (error: any) {
    console.log("✗ All adapters failed:", error.message);
  }
  console.log();

  // Test 2: Streaming with fallback
  console.log("2. Streaming - OpenAI -> Ollama fallback:");
  try {
    const chunks: string[] = [];
    for await (const chunk of ai.streamChat({
      adapter: "openai",
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Count to 3" }],
      fallbacks: [
        { adapter: "ollama", model: "llama2" },
      ],
    })) {
      if (chunk.type === "content") {
        chunks.push(chunk.delta);
      }
    }
    console.log("✓ Streamed response:", chunks.join(""));
  } catch (error: any) {
    console.log("✗ Failed:", error.message);
  }
  console.log();

  // Test 3: Text generation with fallback
  console.log("3. Text generation - OpenAI -> Ollama fallback:");
  try {
    const result = await ai.generateText({
      adapter: "openai",
      model: "gpt-3.5-turbo",
      prompt: "Say hello",
      fallbacks: [
        { adapter: "ollama", model: "llama2" },
      ],
    });
    console.log("✓ Generated text:", result.text);
    console.log("  Model used:", result.model);
  } catch (error: any) {
    console.log("✗ Failed:", error.message);
  }
  console.log();

  // Test 4: Text streaming with fallback
  console.log("4. Text streaming - OpenAI -> Ollama fallback:");
  try {
    const chunks: string[] = [];
    for await (const chunk of ai.generateTextStream({
      adapter: "openai",
      model: "gpt-3.5-turbo",
      prompt: "Say hello",
      fallbacks: [
        { adapter: "ollama", model: "llama2" },
      ],
    })) {
      chunks.push(chunk);
    }
    console.log("✓ Streamed text:", chunks.join(""));
  } catch (error: any) {
    console.log("✗ Failed:", error.message);
  }
  console.log();

  // Test 5: Multiple fallbacks - try OpenAI, then Ollama llama2, then Ollama mistral
  console.log("5. Multiple fallbacks - OpenAI -> Ollama (llama2) -> Ollama (mistral):");
  try {
    const result = await ai.chat({
      adapter: "openai",
      model: "gpt-4",
      messages: [{ role: "user", content: "Hello" }],
      fallbacks: [
        { adapter: "ollama", model: "llama2" },
        { adapter: "ollama", model: "mistral" },
      ],
    });
    console.log("✓ Response:", result.content);
    console.log("  Model used:", result.model);
  } catch (error: any) {
    console.log("✗ All adapters failed:", error.message);
  }
  console.log();

  console.log("=== Test Complete ===");
  console.log("\nExpected behavior:");
  console.log("- If OpenAI fails (no credits, rate limit, invalid key), it logs a warning");
  console.log("- System automatically tries the fallback adapter (Ollama)");
  console.log("- If fallback succeeds, you see the response");
  console.log("- If all adapters fail, you see comprehensive error with all failures");
}

testFallbackOnError().catch(console.error);
