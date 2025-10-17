# Type-Safe Provider Options Without Global Types

This document explains the type-safe provider options implementation that **does not use global module augmentation**. Instead, it leverages TypeScript's type inference to extract provider options directly from adapter instances.

## The Problem with Global Module Augmentation

The previous approach used global module augmentation:

```typescript
// ❌ Old approach - requires global type declaration
declare module "@tanstack/ai" {
  interface ProviderOptionsMap {
    openai: OpenAIProviderOptions;
  }
}
```

**Problems:**
- Requires global type pollution
- Adapter packages need to augment types from core package
- Less portable - types are defined separately from implementation
- Can cause type conflicts in complex setups

## The New Approach: Type Parameters

The new approach uses TypeScript's type parameter inference to extract provider options directly from adapter instances:

```typescript
// ✅ New approach - types flow from adapter instances
export class OpenAIAdapter extends BaseAdapter<
  typeof OPENAI_MODELS,           // Text models
  typeof OPENAI_IMAGE_MODELS,     // Image models
  OpenAIProviderOptions           // Provider options (NEW!)
> {
  name = "openai" as const;
  // ...
}
```

**Benefits:**
- ✅ No global types needed
- ✅ Types are co-located with implementation
- ✅ Fully type-safe with autocomplete
- ✅ More portable and reusable
- ✅ Works in any project setup

## Implementation Details

### 1. BaseAdapter Gets Third Type Parameter

```typescript
export abstract class BaseAdapter<
  TModels extends readonly string[] = readonly string[],
  TImageModels extends readonly string[] = readonly string[],
  TProviderOptions extends Record<string, any> = Record<string, any>  // NEW!
> implements AIAdapter<TModels, TImageModels, TProviderOptions> {
  abstract name: string;
  abstract models: TModels;
  imageModels?: TImageModels;
  
  // Type-only property for inference (never assigned at runtime)
  _providerOptions?: TProviderOptions;
  
  // ... rest of implementation
}
```

### 2. AIAdapter Interface Updated

```typescript
export interface AIAdapter<
  TModels extends readonly string[] = readonly string[],
  TImageModels extends readonly string[] = readonly string[],
  TProviderOptions extends Record<string, any> = Record<string, any>  // NEW!
> {
  name: string;
  models: TModels;
  imageModels?: TImageModels;
  _providerOptions?: TProviderOptions;  // Type-only property
  // ...
}
```

### 3. AI Class Extracts Types from Adapters

The AI class uses helper types to extract provider options from adapter instances:

```typescript
// Extract provider options type from an adapter
type ExtractProviderOptions<T> = 
  T extends AIAdapter<any, any, infer P> ? P : Record<string, any>;

// Get provider options for a specific adapter based on its internal name
type GetProviderOptionsForAdapter<TAdapter extends AIAdapter<any, any, any>> = 
  TAdapter extends { name: infer TName }
    ? TName extends string
      ? { [K in TName]?: ExtractProviderOptions<TAdapter> }
      : never
    : never;

// Applied to chat options
type ChatOptionsWithAdapter<TAdapters extends AdapterMap> = {
  [K in keyof TAdapters & string]: {
    adapter: K;
    model: ExtractModels<TAdapters[K]>;
    // ✅ Type-safe provider options based on adapter instance
    providerOptions?: GetProviderOptionsForAdapter<TAdapters[K]>;
  };
}[keyof TAdapters & string];
```

### 4. Adapters Specify Their Provider Options Type

Each adapter passes its provider options interface as the third type parameter:

**OpenAI Adapter:**
```typescript
export interface OpenAIProviderOptions {
  parallelToolCalls?: boolean;
  store?: boolean;
  reasoningSummary?: 'auto' | 'detailed';
  textVerbosity?: 'low' | 'medium' | 'high';
  // ... 27+ options
}

export class OpenAIAdapter extends BaseAdapter<
  typeof OPENAI_MODELS,
  typeof OPENAI_IMAGE_MODELS,
  OpenAIProviderOptions  // ← Provider options type
> {
  name = "openai" as const;  // ← Internal name used in providerOptions key
  // ...
}
```

**Anthropic Adapter:**
```typescript
export interface AnthropicProviderOptions {
  thinking?: { type: 'enabled'; budgetTokens: number };
  cacheControl?: { type: 'ephemeral'; ttl?: '5m' | '1h' };
  sendReasoning?: boolean;
}

export class AnthropicAdapter extends BaseAdapter<
  typeof ANTHROPIC_MODELS,
  typeof ANTHROPIC_IMAGE_MODELS,
  AnthropicProviderOptions  // ← Provider options type
> {
  name = "anthropic" as const;  // ← Internal name used in providerOptions key
  // ...
}
```

## Usage Example

The type inference happens automatically when you create the AI instance:

```typescript
import { AI } from "@tanstack/ai";
import { OpenAIAdapter } from "@tanstack/ai-openai";
import { AnthropicAdapter } from "@tanstack/ai-anthropic";

const ai = new AI({
  adapters: {
    openai: new OpenAIAdapter({ apiKey: "..." }),
    anthropic: new AnthropicAdapter({ apiKey: "..." }),
  },
});

// ✅ TypeScript knows the exact options for each adapter
await ai.chat({
  adapter: "openai",
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello" }],
  providerOptions: {
    openai: {  // ← TypeScript provides OpenAIProviderOptions autocomplete
      reasoningSummary: "detailed",
      textVerbosity: "high",
      parallelToolCalls: false,
    },
  },
});

await ai.chat({
  adapter: "anthropic",
  model: "claude-3-opus-20240229",
  messages: [{ role: "user", content: "Hello" }],
  providerOptions: {
    anthropic: {  // ← TypeScript provides AnthropicProviderOptions autocomplete
      thinking: { type: "enabled", budgetTokens: 12000 },
      sendReasoning: true,
    },
  },
});

// ❌ TypeScript catches mistakes
await ai.chat({
  adapter: "openai",
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello" }],
  providerOptions: {
    openai: {
      thinking: { ... },  // ← ERROR: thinking doesn't exist on OpenAI
    },
  },
});
```

## Type Safety Demonstration

### ✅ Correct Usage

```typescript
// OpenAI-specific options work with OpenAI adapter
await ai.chat({
  adapter: "openai",
  model: "gpt-4o",
  messages: [...],
  providerOptions: {
    openai: {
      reasoningSummary: "detailed",  // ✅ Valid
      textVerbosity: "high",         // ✅ Valid
      parallelToolCalls: false,      // ✅ Valid
    },
  },
});

// Anthropic-specific options work with Anthropic adapter
await ai.chat({
  adapter: "anthropic",
  model: "claude-3-opus-20240229",
  messages: [...],
  providerOptions: {
    anthropic: {
      thinking: {                     // ✅ Valid
        type: "enabled",
        budgetTokens: 12000,
      },
    },
  },
});
```

### ❌ Type Errors Caught at Compile Time

```typescript
// ERROR: thinking doesn't exist on OpenAI
await ai.chat({
  adapter: "openai",
  model: "gpt-4o",
  messages: [...],
  providerOptions: {
    openai: {
      thinking: { ... },  // ❌ TypeScript error
    },
  },
});

// ERROR: reasoningSummary doesn't exist on Anthropic
await ai.chat({
  adapter: "anthropic",
  model: "claude-3-opus-20240229",
  messages: [...],
  providerOptions: {
    anthropic: {
      reasoningSummary: "detailed",  // ❌ TypeScript error
    },
  },
});
```

## Creating Custom Adapters

You can create your own adapters with type-safe provider options:

```typescript
// 1. Define your provider options interface
export interface MyCustomProviderOptions {
  customFeature1?: boolean;
  customFeature2?: string;
  customFeature3?: number;
}

// 2. Pass it as the third type parameter
const MY_MODELS = ["custom-model-1", "custom-model-2"] as const;

export class MyCustomAdapter extends BaseAdapter<
  typeof MY_MODELS,             // Text models
  readonly [],                  // Image models (empty if not supported)
  MyCustomProviderOptions       // Provider options
> {
  name = "mycustom" as const;   // Internal name (used in providerOptions key)
  models = MY_MODELS;
  
  async chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
    // Extract provider options with proper type
    const providerOpts = options.providerOptions?.mycustom as MyCustomProviderOptions | undefined;
    
    // Use the options
    if (providerOpts?.customFeature1) {
      // Apply custom feature
    }
    
    // ... rest of implementation
  }
}

// 3. Use it with full type safety
const ai = new AI({
  adapters: {
    custom: new MyCustomAdapter({ /* config */ }),
  },
});

await ai.chat({
  adapter: "custom",
  model: "custom-model-1",
  messages: [...],
  providerOptions: {
    mycustom: {  // ✅ TypeScript provides MyCustomProviderOptions autocomplete
      customFeature1: true,
      customFeature2: "value",
      customFeature3: 42,
    },
  },
});
```

## Key Points

1. **No Global Types**: Provider options types are extracted from adapter instances, not from global type augmentation
2. **Type-Only Property**: The `_providerOptions` property on adapters is never assigned at runtime - it only exists for TypeScript type inference
3. **Internal Name Matters**: The `name` property on the adapter determines the key used in `providerOptions` (e.g., `name = "openai"` → `providerOptions.openai`)
4. **Full Type Safety**: TypeScript provides autocomplete and catches errors at compile time
5. **Portable**: Works in any project setup without requiring global type declarations

## Migration from Old Approach

If you're migrating from the module augmentation approach:

### Before (Module Augmentation):
```typescript
// In adapter file
declare module "@tanstack/ai" {
  interface ProviderOptionsMap {
    openai: OpenAIProviderOptions;
  }
}

export class OpenAIAdapter extends BaseAdapter<
  typeof OPENAI_MODELS,
  typeof OPENAI_IMAGE_MODELS
> {
  name = "openai";
  // ...
}
```

### After (Type Parameters):
```typescript
// In adapter file
export class OpenAIAdapter extends BaseAdapter<
  typeof OPENAI_MODELS,
  typeof OPENAI_IMAGE_MODELS,
  OpenAIProviderOptions  // ← Add third parameter
> {
  name = "openai" as const;  // ← Make it const
  // ...
}
```

The usage remains exactly the same - only the implementation changes!

## Conclusion

This approach provides the same type safety and developer experience as module augmentation, but with:
- ✅ Cleaner architecture
- ✅ No global type pollution
- ✅ Better portability
- ✅ Types co-located with implementation
- ✅ Works in all project setups

The types flow naturally from the adapter instances through TypeScript's powerful type inference system.
