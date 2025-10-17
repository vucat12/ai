/**
 * Type Narrowing Test for Unified Chat API
 * 
 * This file demonstrates how TypeScript correctly narrows the return type
 * based on the "as" parameter value.
 */

import { AI } from "@ts-poc/ai";
import { OpenAIAdapter } from "@ts-poc/ai-openai";
import { OllamaAdapter } from "@ts-poc/ai-ollama";

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

const messages = [{ role: "user" as const, content: "Hello" }];

// ============================================================================
// TEST 1: Default (no "as" specified) - Should be Promise<ChatCompletionResult>
// ============================================================================
async function testDefault() {
  const result = ai.chat({
    adapter: "openai",
    model: "gpt-4",
    messages,
  });

  // Type check: result should be Promise<ChatCompletionResult>
  // We can await it
  const resolved = await result;

  // These properties should exist on ChatCompletionResult
  console.log(resolved.content);         // ✅ Should work
  console.log(resolved.role);            // ✅ Should work
  console.log(resolved.usage);           // ✅ Should work

  // @ts-expect-error - body doesn't exist on ChatCompletionResult
  console.log(resolved.body);            // ❌ Should error

  // @ts-expect-error - headers doesn't exist on ChatCompletionResult
  console.log(resolved.headers);         // ❌ Should error
}

// ============================================================================
// TEST 2: as: "promise" - Should be Promise<ChatCompletionResult>
// ============================================================================
async function testPromise() {
  const result = ai.chat({
    adapter: "openai",
    model: "gpt-4",
    messages,
    as: "promise",
  });

  // Type check: result should be Promise<ChatCompletionResult>
  const resolved = await result;

  console.log(resolved.content);         // ✅ Should work
  console.log(resolved.role);            // ✅ Should work
  console.log(resolved.usage);           // ✅ Should work

  // @ts-expect-error - body doesn't exist on ChatCompletionResult
  console.log(resolved.body);            // ❌ Should error
}

// ============================================================================
// TEST 3: as: "stream" - Should be AsyncIterable<StreamChunk>
// ============================================================================
async function testStream() {
  const result = ai.chat({
    adapter: "openai",
    model: "gpt-4",
    messages,
    as: "stream",
  });

  // Type check: result should be AsyncIterable<StreamChunk>
  // We can use for await...of
  for await (const chunk of result) {     // ✅ Should work
    console.log(chunk.type);              // ✅ Should work
    console.log(chunk.id);                // ✅ Should work
    console.log(chunk.model);             // ✅ Should work
  }

  // @ts-expect-error - await result directly doesn't make sense for AsyncIterable
  // const resolved = await result;       // ❌ Should error (or be any)

  // @ts-expect-error - content doesn't exist on AsyncIterable
  console.log(result.content);           // ❌ Should error

  // @ts-expect-error - headers doesn't exist on AsyncIterable
  console.log(result.headers);           // ❌ Should error
}

// ============================================================================
// TEST 4: as: "response" - Should be Response
// ============================================================================
function testResponse() {
  const result = ai.chat({
    adapter: "openai",
    model: "gpt-4",
    messages,
    as: "response",
  });

  // Type check: result should be Response
  console.log(result.headers);           // ✅ Should work
  console.log(result.body);              // ✅ Should work
  console.log(result.status);            // ✅ Should work
  console.log(result.ok);                // ✅ Should work

  // Can call Response methods
  const contentType = result.headers.get("Content-Type");  // ✅ Should work

  // @ts-expect-error - content doesn't exist on Response
  console.log(result.content);           // ❌ Should error

  // @ts-expect-error - role doesn't exist on Response
  console.log(result.role);              // ❌ Should error

  // @ts-expect-error - usage doesn't exist on Response
  console.log(result.usage);             // ❌ Should error
}

// ============================================================================
// TEST 5: Type narrowing with const - Should infer correctly
// ============================================================================
async function testConstNarrowing() {
  // When using const, TypeScript narrows to the literal type
  const mode = "stream" as const;

  const result = ai.chat({
    adapter: "openai",
    model: "gpt-4",
    messages,
    as: mode,  // TypeScript knows this is "stream"
  });

  // Should be typed as AsyncIterable<StreamChunk>
  for await (const chunk of result) {
    console.log(chunk.type);
  }
}

// ============================================================================
// TEST 6: Dynamic mode - Should be union type
// ============================================================================
async function testDynamicMode(mode: "promise" | "stream" | "response") {
  const result = ai.chat({
    adapter: "openai",
    model: "gpt-4",
    messages,
    as: mode,
  });

  // Type should be: Promise<ChatCompletionResult> | AsyncIterable<StreamChunk> | Response
  // This is correct since we don't know which mode at compile time

  // Type guard needed to narrow
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

// ============================================================================
// TEST 7: With fallbacks - Type narrowing should still work
// ============================================================================
async function testWithFallbacks() {
  // Promise mode with fallbacks
  const promise = ai.chat({
    adapter: "openai",
    model: "gpt-4",
    messages,
    as: "promise",
    fallbacks: [
      { adapter: "ollama", model: "llama2" }
    ]
  });
  const resolved = await promise;
  console.log(resolved.content);  // ✅ Works

  // Stream mode with fallbacks
  const stream = ai.chat({
    adapter: "openai",
    model: "gpt-4",
    messages,
    as: "stream",
    fallbacks: [
      { adapter: "ollama", model: "llama2" }
    ]
  });
  for await (const chunk of stream) {
    console.log(chunk.type);  // ✅ Works
  }

  // Response mode with fallbacks
  const response = ai.chat({
    adapter: "openai",
    model: "gpt-4",
    messages,
    as: "response",
    fallbacks: [
      { adapter: "ollama", model: "llama2" }
    ]
  });
  console.log(response.headers);  // ✅ Works
}

// ============================================================================
// TEST 8: Fallback-only mode - Type narrowing should still work
// ============================================================================
async function testFallbackOnly() {
  // Promise mode (default)
  const promise = ai.chat({
    messages,
    fallbacks: [
      { adapter: "openai", model: "gpt-4" },
      { adapter: "ollama", model: "llama2" }
    ]
  });
  const resolved = await promise;
  console.log(resolved.content);  // ✅ Works

  // Stream mode
  const stream = ai.chat({
    messages,
    as: "stream",
    fallbacks: [
      { adapter: "openai", model: "gpt-4" },
      { adapter: "ollama", model: "llama2" }
    ]
  });
  for await (const chunk of stream) {
    console.log(chunk.type);  // ✅ Works
  }

  // Response mode
  const response = ai.chat({
    messages,
    as: "response",
    fallbacks: [
      { adapter: "openai", model: "gpt-4" },
      { adapter: "ollama", model: "llama2" }
    ]
  });
  console.log(response.headers);  // ✅ Works
}

// ============================================================================
// TEST 9: Return types in API handlers
// ============================================================================

// This simulates a TanStack Start API route
function apiHandler1() {
  // Return type is inferred as Response
  return ai.chat({
    adapter: "openai",
    model: "gpt-4",
    messages,
    as: "response",
  });
  // TypeScript knows this function returns Response ✅
}

// This would be an error if we tried to return wrong type
function apiHandler2(): Response {
  return ai.chat({
    adapter: "openai",
    model: "gpt-4",
    messages,
    as: "response",  // ✅ Correct
  });
}

// This would cause a type error
function apiHandler3(): Response {
  // @ts-expect-error - Returns Promise<ChatCompletionResult>, not Response
  return ai.chat({
    adapter: "openai",
    model: "gpt-4",
    messages,
    as: "promise",  // ❌ Wrong type
  });
}

// ============================================================================
// Summary
// ============================================================================

console.log(`
Type Narrowing Test Summary:
============================

✅ Default (no "as") → Promise<ChatCompletionResult>
✅ as: "promise"     → Promise<ChatCompletionResult>
✅ as: "stream"      → AsyncIterable<StreamChunk>
✅ as: "response"    → Response

✅ Type narrowing works with fallbacks
✅ Type narrowing works in fallback-only mode
✅ Return types are correctly inferred in functions
✅ TypeScript catches type mismatches at compile time

This demonstrates that the unified chat API provides
perfect type safety based on the "as" parameter!
`);
