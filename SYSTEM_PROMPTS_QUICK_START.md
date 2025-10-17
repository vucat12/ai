# System Prompts - Quick Start Guide

## What is it?

System prompts let you define instructions once and have them automatically prepended to all chat conversations. No more manually adding system messages!

## Quick Example

### Before ❌
```typescript
const SYSTEM_PROMPT = "You are a helpful assistant.";

// Had to manually add system message every time
const allMessages = messages[0]?.role === "system"
  ? messages
  : [{ role: "system", content: SYSTEM_PROMPT }, ...messages];

const result = await ai.chat({
  adapter: "openai",
  model: "gpt-4",
  messages: allMessages, // Manual handling
});
```

### After ✅
```typescript
const ai = new AI({
  adapters: { /* ... */ },
  systemPrompts: ["You are a helpful assistant."], // Define once
});

// System prompts automatically added!
const result = await ai.chat({
  adapter: "openai",
  model: "gpt-4",
  messages, // Just pass messages directly
});
```

## Basic Usage

### 1. Constructor-Level (Default for All Calls)

```typescript
const ai = new AI({
  adapters: {
    openai: new OpenAIAdapter({ apiKey: process.env.OPENAI_API_KEY! }),
  },
  systemPrompts: [
    "You are a helpful assistant.",
    "Always be concise and friendly.",
  ],
});

// All chat calls use these prompts automatically
await ai.chat({
  adapter: "openai",
  model: "gpt-4",
  messages: [{ role: "user", content: "Hello!" }],
});
```

### 2. Per-Call Override

```typescript
// Override for a specific conversation
await ai.chat({
  adapter: "openai",
  model: "gpt-4",
  messages: [{ role: "user", content: "Explain quantum physics" }],
  systemPrompts: [
    "You are a physics professor.", // Replaces constructor prompts
    "Use simple analogies.",
  ],
});
```

### 3. Multiple Prompts (Array)

```typescript
// Layer multiple instructions
const ai = new AI({
  adapters: { /* ... */ },
  systemPrompts: [
    "You are a customer support agent.", // Role
    "Our business hours are 9 AM - 5 PM EST.", // Context
    "Always ask for order numbers.", // Behavior
  ],
});
```

## Key Features

### ✅ Works with Everything

```typescript
// Works with tools
await ai.chat({
  messages: [/* ... */],
  tools: ["getTool"],
  // systemPrompts automatically included
});

// Works with streaming
const stream = ai.chat({
  messages: [/* ... */],
  as: "stream" as const,
  // systemPrompts work here too
});

// Works with Response mode
const response = ai.chat({
  messages: [/* ... */],
  as: "response" as const,
  // And here!
});
```

### 🔄 Priority Order

1. **Per-call `systemPrompts`** (highest - overrides constructor)
2. **Constructor `systemPrompts`** (default)
3. **No prompts** (if neither provided)

```typescript
const ai = new AI({
  systemPrompts: ["Default"], // Used by default
});

await ai.chat({
  systemPrompts: ["Override"], // This one wins!
  messages: [/* ... */],
});
```

### 🚫 Skip Prompts

```typescript
// Pass empty array to skip for one call
await ai.chat({
  systemPrompts: [], // No system prompts for this call
  messages: [/* ... */],
});
```

## Common Use Cases

### 1. Application-Wide Persona
```typescript
const ai = new AI({
  adapters: { /* ... */ },
  systemPrompts: [
    "You are a customer support agent for TechCorp.",
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
    "Always use the getWeather tool for weather queries.",
  ],
});
```

### 3. Role Switching
```typescript
const ai = new AI({
  systemPrompts: ["You are a friendly assistant."], // Default role
});

// Switch role for specific task
await ai.chat({
  systemPrompts: ["You are a code reviewer."], // Override
  messages: [/* ... */],
});
```

## Migration Example

### Your Current Code (api.tanchat.ts)
```typescript
const SYSTEM_PROMPT = "You are a helpful assistant...";

export const Route = createFileRoute("/demo/api/tanchat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = await request.json();
        
        // Manual system message handling
        const allMessages = messages[0]?.role === "system"
          ? messages
          : [{ role: "system", content: SYSTEM_PROMPT }, ...messages];
        
        return ai.chat({
          adapter: "openAi",
          model: "gpt-4o",
          messages: allMessages, // Manual handling
        });
      },
    },
  },
});
```

### Updated Code (Cleaner!)
```typescript
const SYSTEM_PROMPT = "You are a helpful assistant...";

const ai = new AI({
  adapters: { /* ... */ },
  tools,
  systemPrompts: [SYSTEM_PROMPT], // ← Define once here
});

export const Route = createFileRoute("/demo/api/tanchat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = await request.json();
        
        // System prompts automatically handled!
        return ai.chat({
          adapter: "openAi",
          model: "gpt-4o",
          messages, // ← Just pass messages directly
        });
      },
    },
  },
});
```

## TypeScript Support

Fully typed with autocomplete:

```typescript
const ai = new AI({
  adapters: { /* ... */ },
  systemPrompts: ["Prompt"], // ✅ Type: string[]
});

await ai.chat({
  messages: [/* ... */],
  systemPrompts: ["Override"], // ✅ Type: string[]
});
```

## More Information

- **Full Documentation**: See `SYSTEM_PROMPTS.md`
- **Examples**: See `examples/system-prompts-example.ts`
- **Your Updated File**: `examples/ts-chat/src/routes/demo/api.tanchat.ts`

## Quick Tips

1. **Keep prompts focused** - One instruction per string
2. **Layer instructions** - General → Specific
3. **Override when needed** - Use per-call prompts for special cases
4. **Document them** - Use constants for reusable prompts

## That's It!

You now have cleaner, more maintainable code with automatic system prompt handling. 🎉
