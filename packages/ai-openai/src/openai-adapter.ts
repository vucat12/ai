import OpenAI from "openai";
import {
  BaseAdapter,
  type AIAdapterConfig,
  type ChatCompletionOptions,
  type ChatCompletionResult,
  type ChatCompletionChunk,
  type TextGenerationOptions,
  type TextGenerationResult,
  type SummarizationOptions,
  type SummarizationResult,
  type EmbeddingOptions,
  type EmbeddingResult,
  type ImageGenerationOptions,
  type ImageGenerationResult,
  type ImageData,
} from "@tanstack/ai";

export interface OpenAIAdapterConfig extends AIAdapterConfig {
  apiKey: string;
  organization?: string;
  baseURL?: string;
}

const OPENAI_MODELS = [
  "gpt-4",
  "gpt-4-turbo",
  "gpt-4-turbo-preview",
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-3.5-turbo",
  "gpt-3.5-turbo-16k",
  "gpt-3.5-turbo-instruct",
  "text-embedding-ada-002",
  "text-embedding-3-small",
  "text-embedding-3-large",
] as const;

const OPENAI_IMAGE_MODELS = [
  "dall-e-3",
  "dall-e-2",
] as const;

export type OpenAIModel = (typeof OPENAI_MODELS)[number];
export type OpenAIImageModel = (typeof OPENAI_IMAGE_MODELS)[number];

/**
 * OpenAI-specific provider options for chat/text generation
 * @see https://ai-sdk.dev/providers/ai-sdk-providers/openai
 */
export interface OpenAIProviderOptions {
  /** Whether to use parallel tool calls. Defaults to true */
  parallelToolCalls?: boolean;
  /** Whether to store the generation. Defaults to true */
  store?: boolean;
  /** Maximum number of total calls to built-in tools */
  maxToolCalls?: number;
  /** Additional metadata to store with the generation */
  metadata?: Record<string, string>;
  /** ID of previous response to continue conversation */
  previousResponseId?: string;
  /** Instructions for continuing a conversation */
  instructions?: string;
  /** Unique identifier for end-user (for abuse monitoring) */
  user?: string;
  /** Reasoning effort for reasoning models: 'minimal' | 'low' | 'medium' | 'high' */
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high';
  /** Controls reasoning summaries: 'auto' | 'detailed' */
  reasoningSummary?: 'auto' | 'detailed';
  /** Whether to use strict JSON schema validation */
  strictJsonSchema?: boolean;
  /** Service tier: 'auto' | 'flex' | 'priority' | 'default' */
  serviceTier?: 'auto' | 'flex' | 'priority' | 'default';
  /** Controls response verbosity: 'low' | 'medium' | 'high' */
  textVerbosity?: 'low' | 'medium' | 'high';
  /** Additional content to include in response */
  include?: string[];
  /** Cache key for manual prompt caching control */
  promptCacheKey?: string;
  /** Stable identifier for usage policy violation detection */
  safetyIdentifier?: string;
  /** Modifies likelihood of specific tokens appearing */
  logitBias?: Record<number, number>;
  /** Return log probabilities (boolean or number for top n) */
  logprobs?: boolean | number;
  /** Parameters for prediction mode */
  prediction?: {
    type: 'content';
    content: string;
  };
  /** Whether to use structured outputs (for chat models) */
  structuredOutputs?: boolean;
  /** Maximum number of completion tokens (for reasoning models) */
  maxCompletionTokens?: number;
  /** Image detail level: 'high' | 'low' | 'auto' (for images in messages) */
  imageDetail?: 'high' | 'low' | 'auto';
}

/**
 * OpenAI-specific provider options for image generation
 */
export interface OpenAIImageProviderOptions {
  /** Image quality: 'standard' | 'hd' (dall-e-3 only) */
  quality?: 'standard' | 'hd';
  /** Image style: 'natural' | 'vivid' (dall-e-3 only) */
  style?: 'natural' | 'vivid';
  /** Seed for reproducibility (dall-e-3 only) */
  seed?: number;
}

export class OpenAIAdapter extends BaseAdapter<
  typeof OPENAI_MODELS,
  typeof OPENAI_IMAGE_MODELS,
  OpenAIProviderOptions
> {
  name = "openai" as const;
  models = OPENAI_MODELS;
  imageModels = OPENAI_IMAGE_MODELS;
  private client: OpenAI;

  constructor(config: OpenAIAdapterConfig) {
    super(config);
    this.client = new OpenAI({
      apiKey: config.apiKey,
      organization: config.organization,
      baseURL: config.baseURL,
      timeout: config.timeout,
      maxRetries: config.maxRetries,
      defaultHeaders: config.headers,
    });
  }

  async chatCompletion(
    options: ChatCompletionOptions
  ): Promise<ChatCompletionResult> {
    const providerOpts = options.providerOptions as OpenAIProviderOptions | undefined;

    const requestParams: any = {
      model: options.model || "gpt-3.5-turbo",
      messages: options.messages.map((msg) => {
        if (msg.role === "tool" && msg.toolCallId) {
          return {
            role: "tool" as const,
            content: msg.content || "",
            tool_call_id: msg.toolCallId,
          };
        }
        if (msg.role === "assistant" && msg.toolCalls) {
          return {
            role: "assistant" as const,
            content: msg.content,
            tool_calls: msg.toolCalls.map((tc) => ({
              id: tc.id,
              type: tc.type,
              function: tc.function,
            })),
          };
        }
        return {
          role: msg.role as "system" | "user" | "assistant",
          content: msg.content || "",
          name: msg.name,
        };
      }),
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      top_p: options.topP,
      frequency_penalty: options.frequencyPenalty,
      presence_penalty: options.presencePenalty,
      stop: options.stopSequences,
      stream: false,
    };

    // Apply OpenAI-specific provider options
    if (providerOpts) {
      if (providerOpts.parallelToolCalls !== undefined) {
        requestParams.parallel_tool_calls = providerOpts.parallelToolCalls;
      }
      if (providerOpts.store !== undefined) {
        requestParams.store = providerOpts.store;
      }
      if (providerOpts.metadata) {
        requestParams.metadata = providerOpts.metadata;
      }
      if (providerOpts.user) {
        requestParams.user = providerOpts.user;
      }
      if (providerOpts.logitBias) {
        requestParams.logit_bias = providerOpts.logitBias;
      }
      if (providerOpts.logprobs !== undefined) {
        if (typeof providerOpts.logprobs === 'boolean') {
          requestParams.logprobs = providerOpts.logprobs;
        } else {
          requestParams.logprobs = true;
          requestParams.top_logprobs = providerOpts.logprobs;
        }
      }
      if (providerOpts.reasoningEffort) {
        requestParams.reasoning_effort = providerOpts.reasoningEffort;
      }
      if (providerOpts.reasoningSummary) {
        requestParams.reasoning_summary = providerOpts.reasoningSummary;
      }
      if (providerOpts.serviceTier) {
        requestParams.service_tier = providerOpts.serviceTier;
      }
      if (providerOpts.textVerbosity) {
        requestParams.text_verbosity = providerOpts.textVerbosity;
      }
      if (providerOpts.prediction) {
        requestParams.prediction = providerOpts.prediction;
      }
      if (providerOpts.maxCompletionTokens) {
        requestParams.max_completion_tokens = providerOpts.maxCompletionTokens;
      }
    }

    // Only add tools if they exist
    if (options.tools && options.tools.length > 0) {
      requestParams.tools = options.tools.map((t) => ({
        type: t.type,
        function: t.function,
      }));
      requestParams.tool_choice = options.toolChoice || "auto";
    }

    const response = await this.client.chat.completions.create(requestParams);

    const choice = response.choices[0];

    return {
      id: response.id,
      model: response.model,
      content: choice.message.content,
      role: "assistant",
      finishReason: choice.finish_reason as any,
      toolCalls: choice.message.tool_calls?.map((tc) => ({
        id: tc.id,
        type: tc.type,
        function: tc.function,
      })),
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
    };
  }

  async *chatCompletionStream(
    options: ChatCompletionOptions
  ): AsyncIterable<ChatCompletionChunk> {
    const stream = await this.client.chat.completions.create({
      model: options.model || "gpt-3.5-turbo",
      messages: options.messages.map((msg) => {
        if (msg.role === "tool" && msg.toolCallId) {
          return {
            role: "tool" as const,
            content: msg.content || "",
            tool_call_id: msg.toolCallId,
          };
        }
        if (msg.role === "assistant" && msg.toolCalls) {
          return {
            role: "assistant" as const,
            content: msg.content,
            tool_calls: msg.toolCalls.map((tc) => ({
              id: tc.id,
              type: tc.type,
              function: tc.function,
            })),
          };
        }
        return {
          role: msg.role as "system" | "user" | "assistant",
          content: msg.content || "",
          name: msg.name,
        };
      }),
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      top_p: options.topP,
      frequency_penalty: options.frequencyPenalty,
      presence_penalty: options.presencePenalty,
      stop: options.stopSequences,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (delta?.content) {
        yield {
          id: chunk.id,
          model: chunk.model,
          content: delta.content,
          role: delta.role as "assistant" | undefined,
          finishReason: chunk.choices[0]?.finish_reason as any,
        };
      }
    }
  }

  async *chatStream(
    options: ChatCompletionOptions
  ): AsyncIterable<import("@tanstack/ai").StreamChunk> {
    const providerOpts = options.providerOptions as OpenAIProviderOptions | undefined;

    // Debug: Log incoming options
    if (process.env.DEBUG_TOOLS) {
      console.error(
        "[DEBUG chatStream] Received options.tools:",
        options.tools ? `${options.tools.length} tools` : "undefined"
      );
      if (options.tools && options.tools.length > 0) {
        console.error(
          "[DEBUG chatStream] First tool:",
          JSON.stringify(options.tools[0], null, 2)
        );
      }
    }

    const requestParams: any = {
      model: options.model || "gpt-3.5-turbo",
      messages: options.messages.map((msg) => {
        if (msg.role === "tool" && msg.toolCallId) {
          return {
            role: "tool" as const,
            content: msg.content || "",
            tool_call_id: msg.toolCallId,
          };
        }
        if (msg.role === "assistant" && msg.toolCalls) {
          return {
            role: "assistant" as const,
            content: msg.content,
            tool_calls: msg.toolCalls.map((tc) => ({
              id: tc.id,
              type: tc.type,
              function: tc.function,
            })),
          };
        }
        return {
          role: msg.role as "system" | "user" | "assistant",
          content: msg.content || "",
          name: msg.name,
        };
      }),
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      top_p: options.topP,
      frequency_penalty: options.frequencyPenalty,
      presence_penalty: options.presencePenalty,
      stop: options.stopSequences,
      stream: true,
    };

    // Apply OpenAI-specific provider options
    if (providerOpts) {
      if (providerOpts.parallelToolCalls !== undefined) {
        requestParams.parallel_tool_calls = providerOpts.parallelToolCalls;
      }
      if (providerOpts.store !== undefined) {
        requestParams.store = providerOpts.store;
      }
      if (providerOpts.metadata) {
        requestParams.metadata = providerOpts.metadata;
      }
      if (providerOpts.user) {
        requestParams.user = providerOpts.user;
      }
      if (providerOpts.logitBias) {
        requestParams.logit_bias = providerOpts.logitBias;
      }
      if (providerOpts.logprobs !== undefined) {
        if (typeof providerOpts.logprobs === 'boolean') {
          requestParams.logprobs = providerOpts.logprobs;
        } else {
          requestParams.logprobs = true;
          requestParams.top_logprobs = providerOpts.logprobs;
        }
      }
      if (providerOpts.reasoningEffort) {
        requestParams.reasoning_effort = providerOpts.reasoningEffort;
      }
      if (providerOpts.reasoningSummary) {
        requestParams.reasoning_summary = providerOpts.reasoningSummary;
      }
      if (providerOpts.serviceTier) {
        requestParams.service_tier = providerOpts.serviceTier;
      }
      if (providerOpts.textVerbosity) {
        requestParams.text_verbosity = providerOpts.textVerbosity;
      }
      if (providerOpts.prediction) {
        requestParams.prediction = providerOpts.prediction;
      }
      if (providerOpts.maxCompletionTokens) {
        requestParams.max_completion_tokens = providerOpts.maxCompletionTokens;
      }
    }

    // Only add tools if they exist
    if (options.tools && options.tools.length > 0) {
      requestParams.tools = options.tools.map((t) => ({
        type: t.type,
        function: t.function,
      }));
      if (options.toolChoice) {
        requestParams.tool_choice = options.toolChoice;
      }

      // Debug: Log what we're sending
      if (process.env.DEBUG_TOOLS) {
        console.error(
          "[DEBUG] Sending tools to OpenAI:",
          JSON.stringify(requestParams.tools, null, 2)
        );
        console.error("[DEBUG] Tool choice:", requestParams.tool_choice);
      }
    } else if (process.env.DEBUG_TOOLS) {
      console.error("[DEBUG] NO TOOLS - options.tools is empty or undefined");
      console.error("[DEBUG] options.tools:", options.tools);
    }

    // Final debug: Show the complete request
    if (process.env.DEBUG_TOOLS) {
      console.error(
        "[DEBUG] Final request params keys:",
        Object.keys(requestParams)
      );
      console.error("[DEBUG] Has tools property:", "tools" in requestParams);
    }

    const stream = (await this.client.chat.completions.create(
      requestParams
    )) as any;

    let accumulatedContent = "";
    const timestamp = Date.now();

    try {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        const choice = chunk.choices[0];

        // Handle content delta
        if (delta?.content) {
          accumulatedContent += delta.content;
          yield {
            type: "content",
            id: chunk.id,
            model: chunk.model,
            timestamp,
            delta: delta.content,
            content: accumulatedContent,
            role: "assistant",
          };
        }

        // Handle tool calls
        if (delta?.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            yield {
              type: "tool_call",
              id: chunk.id,
              model: chunk.model,
              timestamp,
              toolCall: {
                id: toolCall.id || `call_${Date.now()}`,
                type: "function",
                function: {
                  name: toolCall.function?.name || "",
                  arguments: toolCall.function?.arguments || "",
                },
              },
              index: toolCall.index || 0,
            };
          }
        }

        // Handle completion
        if (choice?.finish_reason) {
          yield {
            type: "done",
            id: chunk.id,
            model: chunk.model,
            timestamp,
            finishReason: choice.finish_reason as any,
            usage: chunk.usage
              ? {
                promptTokens: chunk.usage.prompt_tokens || 0,
                completionTokens: chunk.usage.completion_tokens || 0,
                totalTokens: chunk.usage.total_tokens || 0,
              }
              : undefined,
          };
        }
      }
    } catch (error: any) {
      yield {
        type: "error",
        id: this.generateId(),
        model: options.model || "gpt-3.5-turbo",
        timestamp,
        error: {
          message: error.message || "Unknown error occurred",
          code: error.code,
        },
      };
    }
  }

  async generateText(
    options: TextGenerationOptions
  ): Promise<TextGenerationResult> {
    const response = await this.client.completions.create({
      model: options.model || "gpt-3.5-turbo-instruct",
      prompt: options.prompt,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      top_p: options.topP,
      frequency_penalty: options.frequencyPenalty,
      presence_penalty: options.presencePenalty,
      stop: options.stopSequences,
      stream: false,
    });

    const choice = response.choices[0];

    return {
      id: response.id,
      model: response.model,
      text: choice.text,
      finishReason: choice.finish_reason as any,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
    };
  }

  async *generateTextStream(
    options: TextGenerationOptions
  ): AsyncIterable<string> {
    const stream = await this.client.completions.create({
      model: options.model || "gpt-3.5-turbo-instruct",
      prompt: options.prompt,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      top_p: options.topP,
      frequency_penalty: options.frequencyPenalty,
      presence_penalty: options.presencePenalty,
      stop: options.stopSequences,
      stream: true,
    });

    for await (const chunk of stream) {
      if (chunk.choices[0]?.text) {
        yield chunk.choices[0].text;
      }
    }
  }

  async summarize(options: SummarizationOptions): Promise<SummarizationResult> {
    const systemPrompt = this.buildSummarizationPrompt(options);

    const response = await this.client.chat.completions.create({
      model: options.model || "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: options.text },
      ],
      max_tokens: options.maxLength,
      temperature: 0.3,
      stream: false,
    });

    return {
      id: response.id,
      model: response.model,
      summary: response.choices[0].message.content || "",
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
    };
  }

  async createEmbeddings(options: EmbeddingOptions): Promise<EmbeddingResult> {
    const response = await this.client.embeddings.create({
      model: options.model || "text-embedding-ada-002",
      input: options.input,
      dimensions: options.dimensions,
    });

    return {
      id: this.generateId(),
      model: response.model,
      embeddings: response.data.map((d) => d.embedding),
      usage: {
        promptTokens: response.usage.prompt_tokens,
        totalTokens: response.usage.total_tokens,
      },
    };
  }

  async generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
    const numImages = options.n || 1;
    const model = options.model as OpenAIImageModel;

    // Determine max images per call based on model
    const maxPerCall = options.maxImagesPerCall || (model === "dall-e-3" ? 1 : 10);

    // Calculate how many API calls we need
    const numCalls = Math.ceil(numImages / maxPerCall);
    const allImages: ImageData[] = [];

    // Make batched API calls
    for (let i = 0; i < numCalls; i++) {
      const imagesThisCall = Math.min(maxPerCall, numImages - allImages.length);

      const requestParams: OpenAI.Images.ImageGenerateParams = {
        model,
        prompt: options.prompt,
        n: imagesThisCall,
        ...(options.size && { size: options.size as any }),
        ...(options.seed && model === "dall-e-3" && { seed: options.seed }),
        response_format: "b64_json", // Always request base64
      };

      // Add provider-specific options
      if (options.providerOptions) {
        Object.assign(requestParams, options.providerOptions);
      }

      const response = await this.client.images.generate(requestParams, {
        signal: options.abortSignal,
        headers: options.headers,
      });

      // Convert response to ImageData format
      if (response.data) {
        for (const image of response.data) {
          if (image.b64_json) {
            const base64 = image.b64_json;
            const uint8Array = this.base64ToUint8Array(base64);

            allImages.push({
              base64: `data:image/png;base64,${base64}`,
              uint8Array,
              mediaType: "image/png",
            });
          }
        }
      }
    }

    // Extract provider metadata if available
    const providerMetadata: Record<string, any> = {};
    if (options.providerOptions) {
      providerMetadata.openai = {
        images: allImages.map(() => ({})),
      };
    }

    return {
      ...(numImages === 1 ? { image: allImages[0] } : { images: allImages }),
      providerMetadata,
      response: {
        id: this.generateId(),
        model,
        timestamp: Date.now(),
      },
    };
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    // Remove data URL prefix if present
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');

    // Decode base64 to binary string
    const binaryString = atob(base64Data);

    // Convert binary string to Uint8Array
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes;
  }

  private buildSummarizationPrompt(options: SummarizationOptions): string {
    let prompt = "You are a professional summarizer. ";

    switch (options.style) {
      case "bullet-points":
        prompt += "Provide a summary in bullet point format. ";
        break;
      case "paragraph":
        prompt += "Provide a summary in paragraph format. ";
        break;
      case "concise":
        prompt += "Provide a very concise summary in 1-2 sentences. ";
        break;
      default:
        prompt += "Provide a clear and concise summary. ";
    }

    if (options.focus && options.focus.length > 0) {
      prompt += `Focus on the following aspects: ${options.focus.join(", ")}. `;
    }

    if (options.maxLength) {
      prompt += `Keep the summary under ${options.maxLength} tokens. `;
    }

    return prompt;
  }
}
