import { AI } from "@tanstack/ai";
import { OpenAIAdapter } from "@tanstack/ai-openai";

// Initialize AI with OpenAI adapter
const ai = new AI({
  adapters: {
    openai: new OpenAIAdapter({
      apiKey: process.env.OPENAI_API_KEY || "",
    }),
  },
});

// Example 1: Generate a single image with DALL-E 3
async function generateSingleImage() {
  const result = await ai.image({
    adapter: "openai",
    model: "dall-e-3", // Type-safe! Only "dall-e-3" | "dall-e-2" are allowed
    prompt: "A beautiful sunset over mountains with a lake in the foreground",
    size: "1024x1024",
    providerOptions: {
      openai: {
        quality: "hd",
        style: "vivid",
      },
    },
  });

  console.log("Generated image:", result.image?.mediaType);
  console.log("Base64 data URL:", result.image?.base64.substring(0, 50) + "...");
  console.log("Binary data length:", result.image?.uint8Array.length);
}

// Example 2: Generate multiple images with DALL-E 2
async function generateMultipleImages() {
  const result = await ai.image({
    adapter: "openai",
    model: "dall-e-2", // Type-safe model selection
    prompt: "A cute cat wearing a hat",
    n: 3, // Generate 3 images
    size: "512x512",
  });

  console.log(`Generated ${result.images?.length} images`);
  result.images?.forEach((image, i) => {
    console.log(`Image ${i + 1}:`, image.mediaType);
  });
}

// Example 3: Using fallback pattern (if openai fails, try another adapter)
// Note: Currently only OpenAI supports image generation, but the API is ready for more adapters
async function withFallback() {
  const result = await ai.image({
    adapter: "openai",
    model: "dall-e-3",
    prompt: "A futuristic cityscape at night",
    // The AI class will automatically fall back to other adapters if primary fails
    // and they support image generation
  });

  console.log("Generated with fallback support:", result.image?.mediaType);
}

// Example 4: Type safety - these will show TypeScript errors:
async function typeErrorExamples() {
  // ❌ Error: "invalid-model" is not assignable to "dall-e-3" | "dall-e-2"
  // await ai.image({
  //   adapter: "openai",
  //   model: "invalid-model",
  //   prompt: "test",
  // });

  // ❌ Error: anthropic adapter doesn't have imageModels
  // await ai.image({
  //   adapter: "anthropic",
  //   model: "claude-3-opus-20240229",
  //   prompt: "test",
  // });
}

// Run examples
async function main() {
  console.log("=== Single Image Generation ===");
  await generateSingleImage();

  console.log("\n=== Multiple Images Generation ===");
  await generateMultipleImages();

  console.log("\n=== With Fallback ===");
  await withFallback();
}

// Uncomment to run:
// main().catch(console.error);
