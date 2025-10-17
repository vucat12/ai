# TypeScript Limitation: Explicit + Inferred Type Parameters

## The Problem

You want this API:
```typescript
const adapter = wrapExternalProvider<OpenAIResponsesProviderOptions>(openai);
```

Where:
- `OpenAIResponsesProviderOptions` is **explicitly provided** as a type parameter
- Model types are **automatically inferred** from `openai` function parameter

## Why This Is Impossible in TypeScript

TypeScript's type inference has a fundamental limitation:

**When you explicitly provide ANY type parameter, TypeScript stops inferring ALL subsequent type parameters from function arguments.**

```typescript
function wrap<TOptions, TProvider extends (id: any) => any>(provider: TProvider) {
  // TProvider will be inferred from provider argument
}

// ❌ This breaks inference:
wrap<MyOptions>(openai);  
// TypeScript sees MyOptions as the FIRST type param (TOptions)
// But it can't map it correctly, and TProvider inference fails

// ✅ This works:
wrap(openai);  
// TProvider is inferred correctly, but TOptions defaults to unknown
```

## Solutions

### Solution 1: Curried Function (Current Implementation)
```typescript
const adapter = wrapExternalProvider<OpenAIResponsesProviderOptions>()(openai);
```

**Pros:**
- ✅ Models automatically inferred from `openai`
- ✅ Provider options fully typed
- ✅ Single import, clear API

**Cons:**
- ⚠️ Requires double function call `<Type>()(provider)`

### Solution 2: Builder Pattern
```typescript
const typedWrapper = wrapExternalProvider.withOptions<OpenAIResponsesProviderOptions>();
const adapter = typedWrapper(openai);
```

**Pros:**
- ✅ Models automatically inferred
- ✅ Provider options fully typed  
- ✅ Can reuse `typedWrapper` for multiple adapters
- ✅ More explicit and readable

**Cons:**
- ⚠️ Requires intermediate variable

### Solution 3: Separate Functions
```typescript
// Basic: models inferred, options generic
const adapter1 = wrapExternalProvider(openai);

// Typed: models inferred, options typed (different function name)
const adapter2 = wrapTypedExternalProvider<OpenAIResponsesProviderOptions>()(openai);
```

**Pros:**
- ✅ Clear distinction between typed/untyped
- ✅ Models automatically inferred in both cases

**Cons:**
- ⚠️ Two different function names
- ⚠️ Still requires currying for typed version

### Solution 4: Type Assertion (Escape Hatch)
```typescript
const adapter = wrapExternalProvider(openai) as BaseAdapter<
  OpenAIModels,  // Must manually specify
  readonly string[],
  OpenAIResponsesProviderOptions
>;
```

**Pros:**
- ✅ Single function call
- ✅ Provider options typed

**Cons:**
- ❌ Must manually specify model types (defeats the purpose)
- ❌ Loses type safety
- ❌ Error-prone

## Recommendation

**Use Solution 1 (Curried)** - it's the cleanest way to achieve both goals:

```typescript
// One-liner with full type safety
const adapter = wrapExternalProvider<OpenAIResponsesProviderOptions>()(openai);

// TypeScript knows:
// - models: 'gpt-4o' | 'gpt-4' | 'gpt-3.5-turbo' | ... (inferred!)  
// - providerOptions: OpenAIResponsesProviderOptions (typed!)
```

The double parentheses `<Type>()` are a small syntax cost for achieving the impossible: having both an explicit type parameter AND automatic type inference.

## Alternative: If Provider Options Typing Isn't Critical

If you're okay with generic provider options for quick prototyping:

```typescript
// Simple, clean, one call
const adapter = wrapExternalProvider(openai);

// You get:
// - models: ✅ Fully typed and inferred
// - providerOptions: Record<string, any>
```

This is perfect for 80% of use cases where you don't need strict provider options typing.

## The Honest Truth

There is **no way** in TypeScript to have:
```typescript
wrapExternalProvider<ExplicitType>(inferredArgument)
```

And have it work correctly. This is a well-known TypeScript limitation that has been discussed in the TypeScript GitHub issues for years.

The curried form `<Type>()` is the standard workaround used by many popular libraries (RxJS, fp-ts, etc.) for exactly this reason.
