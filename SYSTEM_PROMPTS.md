# System Prompts Feature

## Overview

The `systemPrompts` feature allows you to define system-level instructions that are automatically prepended to all chat conversations. This eliminates the need to manually add system messages to every chat call.

## Key Benefits

1. **DRY Principle**: Define system instructions once, use everywhere
2. **Consistency**: Ensure all conversations follow the same guidelines
3. **Flexibility**: Override prompts per call when needed
4. **Clean Code**: No more manual system message handling

## Basic Usage

### Constructor-Level System Prompts

Define default system prompts that apply to all chat calls:

```typescript
import { AI } from "@tanstack/ai";
import { OpenAIAdapter } from "@tanstack/ai-openai";

const ai = new AI({
  adapters: {
    openai: new OpenAIAdapter({ apiKey: process.env.OPENAI_API_KEY! }),
  },
  systemPrompts: [
    "You are a helpful AI assistant.",
    "Always be concise and friendly.",
  ],
});

// System prompts are automatically prepended
const result = await ai.chat({
  adapter: "openai",
  model: "gpt-4",
  messages: [
    { role: "user", content: "Hello!" },
  ],
});
```

### Per-Call System Prompts

Override the default prompts for specific conversations:

```typescript
const result = await ai.chat({
  adapter: "openai",
  model: "gpt-4",
  messages: [
    { role: "user", content: "Explain quantum physics" },
  ],
  systemPrompts: [
    "You are a physics professor.",
    "Use simple analogies to explain concepts.",
  ],
});
```

## API Reference

### AIConfig Interface

```typescript
interface AIConfig<T, TTools> {
  adapters: T;
  fallbacks?: ReadonlyArray<AdapterFallback<T>>;
  tools?: TTools;
  systemPrompts?: string[]; // ← New property
}
```

### Chat Options

```typescript
type ChatOptions = {
  adapter: string;
  model: string;
  messages: Message[];
  systemPrompts?: string[]; // ← Override constructor prompts
  // ... other options
};
```

## Behavior Details

### 1. Prepending Logic

System prompts are converted to system messages and prepended to your message array:

```typescript
// Input messages
[
  { role: "user", content: "Hello!" }
]

// After prepending systemPrompts: ["Prompt 1", "Prompt 2"]
[
  { role: "system", content: "Prompt 1" },
  { role: "system", content: "Prompt 2" },
  { role: "user", content: "Hello!" }
]
```

### 2. Replacing Existing System Messages

If your messages already contain system messages, they are **replaced**:

```typescript
const ai = new AI({
  adapters: { /* ... */ },
  systemPrompts: ["Default prompt"],
});

// Input messages
[
  { role: "system", content: "This will be replaced" },
  { role: "user", content: "Hello!" }
]

// Result
[
  { role: "system", content: "Default prompt" },
  { role: "user", content: "Hello!" }
]
```

### 3. Priority Order

The priority for system prompts is:

1. **Per-call `systemPrompts`** (highest priority)
2. **Constructor `systemPrompts`** (default)
3. **No system prompts** (if neither is provided)

```typescript
const ai = new AI({
  adapters: { /* ... */ },
  systemPrompts: ["Default"], // Priority 2
});

await ai.chat({
  messages: [/* ... */],
  systemPrompts: ["Override"], // Priority 1 - Used!
});
```

### 4. Empty Array Behavior

Pass an empty array to skip system prompts for a specific call:

```typescript
const ai = new AI({
  adapters: { /* ... */ },
  systemPrompts: ["Default prompt"],
});

// Skip system prompts for this call only
await ai.chat({
  messages: [{ role: "user", content: "Hello!" }],
  systemPrompts: [], // No system prompts used
});
```

## Use Cases

### 1. Application-Wide Instructions

```typescript
const ai = new AI({
  adapters: { /* ... */ },
  systemPrompts: [
    "You are a customer support agent for TechCorp.",
    "Our business hours are 9 AM to 5 PM EST.",
    "Always be polite and professional.",
  ],
});
```

### 2. Tool Usage Guidelines

```typescript
const ai = new AI({
  adapters: { /* ... */ },
  tools: { getWeather: { /* ... */ } },
  systemPrompts: [
    "You are a weather assistant.",
    "Always use the getWeather tool when asked about weather.",
    "Include temperature and condition in your response.",
  ],
});
```

### 3. Persona Management

```typescript
// Default persona
const ai = new AI({
  adapters: { /* ... */ },
  systemPrompts: ["You are a friendly assistant."],
});

// Override for specific conversation
await ai.chat({
  messages: [/* ... */],
  systemPrompts: [
    "You are a strict code reviewer.",
    "Point out potential bugs and improvements.",
  ],
});
```

### 4. Multi-Layer Context

```typescript
const ai = new AI({
  adapters: { /* ... */ },
  systemPrompts: [
    "You are an e-commerce assistant.",
    "Our return policy allows returns within 30 days.",
    "We offer free shipping on orders over $50.",
    "Always suggest related products when appropriate.",
  ],
});
```

## Integration with Other Features

### Works with Tool Registry

```typescript
const tools = {
  getTool: { /* ... */ },
} as const;

const ai = new AI({
  adapters: { /* ... */ },
  tools,
  systemPrompts: ["You are a tool-using assistant."],
});

await ai.chat({
  messages: [/* ... */],
  tools: ["getTool"], // Type-safe tool names
  // systemPrompts are automatically included
});
```

### Works with Streaming

```typescript
const stream = ai.chat({
  adapter: "openai",
  model: "gpt-4",
  messages: [/* ... */],
  as: "stream" as const,
  // System prompts work with streaming
});

for await (const chunk of stream) {
  // ...
}
```

### Works with Response Mode

```typescript
// For HTTP streaming endpoints
const response = ai.chat({
  adapter: "openai",
  model: "gpt-4",
  messages: [/* ... */],
  as: "response" as const,
  // System prompts are included
});

return response; // Return from API endpoint
```

### Works with Fallbacks

```typescript
const ai = new AI({
  adapters: {
    primary: primaryAdapter,
    fallback: fallbackAdapter,
  },
  fallbacks: [
    { adapter: "fallback", model: "fallback-model" },
  ],
  systemPrompts: ["System instruction"],
});

// Fallbacks will use the same system prompts
await ai.chat({
  adapter: "primary",
  model: "primary-model",
  messages: [/* ... */],
});
```

## Migration Guide

### Before (Manual System Messages)

```typescript
const SYSTEM_PROMPT = "You are a helpful assistant.";

export async function handler(request) {
  const { messages } = await request.json();
  
  // Manual system message handling
  const allMessages = messages[0]?.role === "system"
    ? messages
    : [{ role: "system", content: SYSTEM_PROMPT }, ...messages];
  
  return ai.chat({
    adapter: "openai",
    model: "gpt-4",
    messages: allMessages,
  });
}
```

### After (Automatic System Prompts)

```typescript
const ai = new AI({
  adapters: { /* ... */ },
  systemPrompts: ["You are a helpful assistant."],
});

export async function handler(request) {
  const { messages } = await request.json();
  
  // System prompts automatically handled!
  return ai.chat({
    adapter: "openai",
    model: "gpt-4",
    messages, // Just pass messages directly
  });
}
```

## Best Practices

### 1. Keep Prompts Focused

```typescript
// ✅ Good - Each prompt has a clear purpose
systemPrompts: [
  "You are a coding assistant.",
  "Focus on TypeScript best practices.",
  "Suggest modern ES6+ syntax.",
]

// ❌ Avoid - Too verbose, combines multiple concerns
systemPrompts: [
  "You are a coding assistant who helps with TypeScript and should focus on best practices while also suggesting modern syntax and being helpful and friendly.",
]
```

### 2. Layer Instructions

```typescript
// ✅ Good - Layered from general to specific
systemPrompts: [
  "You are a customer support agent.", // Role
  "Our company is TechCorp.", // Context
  "Business hours: 9 AM - 5 PM EST.", // Details
  "Always ask for order numbers.", // Specific behavior
]
```

### 3. Override When Needed

```typescript
// Default: General assistant
const ai = new AI({
  adapters: { /* ... */ },
  systemPrompts: ["You are a helpful assistant."],
});

// Override for specialized tasks
await ai.chat({
  messages: [/* ... */],
  systemPrompts: [
    "You are a security auditor.",
    "Focus on identifying vulnerabilities.",
  ],
});
```

### 4. Document Your Prompts

```typescript
const SUPPORT_PROMPTS = [
  "You are a customer support agent for TechCorp.",
  "Business hours: 9 AM - 5 PM EST Monday-Friday.",
  "Return policy: 30 days with receipt.",
  "Always be empathetic and patient.",
] as const;

const ai = new AI({
  adapters: { /* ... */ },
  systemPrompts: [...SUPPORT_PROMPTS],
});
```

## TypeScript Support

The `systemPrompts` property is fully typed:

```typescript
// Constructor
const ai = new AI({
  adapters: { /* ... */ },
  systemPrompts: ["Prompt 1", "Prompt 2"], // string[]
});

// Per-call override
await ai.chat({
  messages: [/* ... */],
  systemPrompts: ["Override"], // string[]
});

// Optional - can be omitted
const aiWithoutPrompts = new AI({
  adapters: { /* ... */ },
  // systemPrompts is optional
});
```

## Examples

See `examples/system-prompts-example.ts` for comprehensive examples including:
- Constructor-level prompts
- Per-call overrides
- Multiple prompts
- Integration with tools
- Streaming with prompts
- Response mode
- And more!

## Troubleshooting

### System prompts not appearing?

Make sure you're passing them correctly:

```typescript
// ✅ Correct
systemPrompts: ["Prompt"]

// ❌ Wrong - not an array
systemPrompts: "Prompt"
```

### Prompts being replaced unexpectedly?

Remember that per-call `systemPrompts` **override** constructor prompts:

```typescript
const ai = new AI({
  systemPrompts: ["Default"],
});

await ai.chat({
  systemPrompts: ["Override"], // Replaces "Default"
  messages: [/* ... */],
});
```

### Want to combine prompts?

Spread them together:

```typescript
const defaultPrompts = ["Prompt 1", "Prompt 2"];
const additionalPrompts = ["Prompt 3"];

await ai.chat({
  systemPrompts: [...defaultPrompts, ...additionalPrompts],
  messages: [/* ... */],
});
```
