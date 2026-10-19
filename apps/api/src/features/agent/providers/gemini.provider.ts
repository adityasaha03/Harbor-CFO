import { env, getGeminiApiKeys } from '../../../config/env';
import { logger } from '../../../core/logging/logger';
import type { ModelFacingToolDefinition } from '../tools/tool.types';
import type {
  LlmProvider,
  LlmGenerateOptions,
  LlmGenerateResult,
  LlmToolCall,
  LlmMessage,
} from './llm-provider';

export interface GeminiProviderOptions {
  apiKey?: string;
  apiKeys?: string[];
  model?: string;
  fetchFn?: typeof fetch;
  cooldownMs?: number;
}

interface GeminiContentPart {
  text?: string;
  thoughtSignature?: string;
  thought_signature?: string;
  functionCall?: {
    name: string;
    args: Record<string, unknown>;
  };
  functionResponse?: {
    name: string;
    response: Record<string, unknown>;
  };
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiContentPart[];
}

interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

interface GeminiRequestBody {
  systemInstruction?: {
    parts: { text: string }[];
  };
  contents: GeminiContent[];
  tools?: { functionDeclarations: GeminiFunctionDeclaration[] }[];
}

interface GeminiResponseCandidate {
  content?: {
    parts?: GeminiContentPart[];
    role?: string;
  };
  finishReason?: string;
}

interface GeminiResponseBody {
  candidates?: GeminiResponseCandidate[];
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

export class GeminiProvider implements LlmProvider {
  public readonly name = 'gemini' as const;
  private readonly apiKeys: string[];
  private currentKeyIndex = 0;
  private readonly cooldowns = new Map<string, number>();
  private readonly cooldownMs: number;
  private readonly model: string;
  private readonly fetchFn: typeof fetch;

  constructor(options?: GeminiProviderOptions) {
    if (options?.apiKeys && options.apiKeys.length > 0) {
      this.apiKeys = options.apiKeys;
    } else if (options && 'apiKey' in options) {
      this.apiKeys = options.apiKey ? [options.apiKey] : [];
    } else {
      this.apiKeys = getGeminiApiKeys();
    }
    this.model = options?.model ?? env.LLM_MODEL ?? 'gemini-2.5-flash';
    this.fetchFn = options?.fetchFn ?? fetch;
    this.cooldownMs = options?.cooldownMs ?? 60_000;
  }

  public getApiKeys(): string[] {
    return [...this.apiKeys];
  }

  public getActiveKey(): string | undefined {
    if (this.apiKeys.length === 0) return undefined;
    const now = Date.now();

    // Look for first key not in cooldown starting from currentKeyIndex
    for (let i = 0; i < this.apiKeys.length; i++) {
      const idx = (this.currentKeyIndex + i) % this.apiKeys.length;
      const key = this.apiKeys[idx];
      if (!key) continue;
      const cooldownUntil = this.cooldowns.get(key) ?? 0;
      if (now >= cooldownUntil) {
        this.currentKeyIndex = idx;
        return key;
      }
    }

    // Fallback to earliest expiring key
    let earliestKey = this.apiKeys[0];
    if (!earliestKey) return undefined;
    let earliestTime = this.cooldowns.get(earliestKey) ?? 0;
    for (let i = 1; i < this.apiKeys.length; i++) {
      const k = this.apiKeys[i];
      if (!k) continue;
      const t = this.cooldowns.get(k) ?? 0;
      if (t < earliestTime) {
        earliestKey = k;
        earliestTime = t;
      }
    }
    return earliestKey;
  }

  public markKeyExhausted(key: string): void {
    this.cooldowns.set(key, Date.now() + this.cooldownMs);
    if (this.apiKeys.length > 1) {
      const idx = this.apiKeys.indexOf(key);
      if (idx !== -1) {
        this.currentKeyIndex = (idx + 1) % this.apiKeys.length;
      }
    }
  }

  public rotateKey(): void {
    if (this.apiKeys.length > 1) {
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    }
  }

  private cleanParameters(schema: Record<string, unknown>): Record<string, unknown> {
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(schema)) {
      if (k === 'additionalProperties') continue;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        cleaned[k] = this.cleanParameters(v as Record<string, unknown>);
      } else if (Array.isArray(v)) {
        cleaned[k] = v.map((item) =>
          item && typeof item === 'object'
            ? this.cleanParameters(item as Record<string, unknown>)
            : item,
        );
      } else {
        cleaned[k] = v;
      }
    }
    return cleaned;
  }

  private transformTools(
    tools?: ModelFacingToolDefinition[],
  ): { functionDeclarations: GeminiFunctionDeclaration[] }[] | undefined {
    if (!tools || tools.length === 0) return undefined;
    const declarations: GeminiFunctionDeclaration[] = tools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: this.cleanParameters(t.parameters),
    }));
    return [{ functionDeclarations: declarations }];
  }

  private transformMessages(messages: LlmMessage[]): GeminiContent[] {
    const contents: GeminiContent[] = [];

    for (const msg of messages) {
      if (msg.role === 'user') {
        contents.push({
          role: 'user',
          parts: [{ text: msg.content ?? '' }],
        });
      } else if (msg.role === 'assistant') {
        const parts: GeminiContentPart[] = [];
        if (msg.content) {
          parts.push({ text: msg.content });
        }
        if (msg.toolCalls) {
          for (const tc of msg.toolCalls) {
            const part: GeminiContentPart = {
              functionCall: {
                name: tc.name,
                args: tc.args,
              },
            };
            if (tc.thoughtSignature) {
              part.thoughtSignature = tc.thoughtSignature;
              part.thought_signature = tc.thoughtSignature;
            }
            parts.push(part);
          }
        }
        if (parts.length > 0) {
          contents.push({ role: 'model', parts });
        }
      } else if (msg.role === 'tool') {
        const parts: GeminiContentPart[] = [];
        if (msg.toolResults) {
          for (const tr of msg.toolResults) {
            parts.push({
              functionResponse: {
                name: tr.name,
                response: {
                  output: tr.output,
                },
              },
            });
          }
        }
        if (parts.length > 0) {
          contents.push({ role: 'user', parts });
        }
      }
    }

    return contents;
  }

  async generate(options: LlmGenerateOptions): Promise<LlmGenerateResult> {
    if (this.apiKeys.length === 0) {
      throw new Error('Gemini API key is not configured');
    }

    const maxAttempts = Math.max(this.apiKeys.length, 1);
    const attemptedKeys = new Set<string>();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const apiKey = this.getActiveKey();
      if (!apiKey || attemptedKeys.has(apiKey)) {
        break;
      }
      attemptedKeys.add(apiKey);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const body: GeminiRequestBody = {
        contents: this.transformMessages(options.messages),
      };

      if (options.system) {
        body.systemInstruction = {
          parts: [{ text: options.system }],
        };
      }

      const toolsConfig = this.transformTools(options.tools);
      if (toolsConfig) {
        body.tools = toolsConfig;
      }

      let response: Response;
      try {
        response = await this.fetchFn(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(20_000),
        });
      } catch (networkErr) {
        lastError = networkErr instanceof Error ? networkErr : new Error(String(networkErr));
        if (this.apiKeys.length > 1 && attempt < maxAttempts - 1) {
          logger.warn(
            { keyPrefix: apiKey.slice(0, 8), err: lastError.message },
            'Gemini API request timed out or network error. Rotating to next key in pool.',
          );
          this.markKeyExhausted(apiKey);
          continue;
        }
        throw lastError;
      }

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        let parsedMessage = `Gemini API request failed with status ${response.status}`;
        let isRotatable =
          response.status === 429 ||
          response.status === 401 ||
          response.status === 403 ||
          response.status === 503;

        try {
          const parsed = JSON.parse(errText) as GeminiResponseBody;
          if (parsed.error?.message) {
            parsedMessage = `Gemini API error: ${parsed.error.message}`;
          }
          const lower = parsedMessage.toLowerCase();
          if (
            parsed.error?.code === 429 ||
            parsed.error?.code === 503 ||
            parsed.error?.status === 'RESOURCE_EXHAUSTED' ||
            parsed.error?.status === 'PERMISSION_DENIED' ||
            parsed.error?.status === 'UNAVAILABLE' ||
            lower.includes('quota') ||
            lower.includes('rate limit') ||
            lower.includes('resource_exhausted') ||
            lower.includes('high demand') ||
            lower.includes('spikes in demand') ||
            lower.includes('api key not valid') ||
            lower.includes('api_key_invalid') ||
            lower.includes('permission_denied')
          ) {
            isRotatable = true;
          }
        } catch {
          // use default message
        }

        if (isRotatable && this.apiKeys.length > 1 && attempt < maxAttempts - 1) {
          const keyPrefix = apiKey.length > 8 ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : 'key';
          logger.warn(
            {
              keyPrefix,
              attempt: attempt + 1,
              remainingKeys: maxAttempts - attemptedKeys.size,
              reason: parsedMessage,
            },
            'Gemini API key returned an error (quota, invalid key, or high demand). Rotating to next API key in pool.',
          );
          this.markKeyExhausted(apiKey);
          lastError = new Error(parsedMessage);
          continue;
        }

        throw new Error(parsedMessage);
      }

      const data = (await response.json()) as GeminiResponseBody;

      if (data.error) {
        const msg = data.error.message ?? 'Unknown error';
        const lowerMsg = msg.toLowerCase();
        const isRotatable =
          data.error.code === 429 ||
          data.error.code === 503 ||
          data.error.status === 'RESOURCE_EXHAUSTED' ||
          data.error.status === 'PERMISSION_DENIED' ||
          data.error.status === 'UNAVAILABLE' ||
          lowerMsg.includes('quota') ||
          lowerMsg.includes('high demand') ||
          lowerMsg.includes('api key not valid') ||
          lowerMsg.includes('permission_denied');

        if (isRotatable && this.apiKeys.length > 1 && attempt < maxAttempts - 1) {
          this.markKeyExhausted(apiKey);
          lastError = new Error(`Gemini API error: ${msg}`);
          continue;
        }
        throw new Error(`Gemini API error: ${msg}`);
      }

      // Successful request: rotate index to load-balance the next request
      this.rotateKey();

      const firstCandidate = data.candidates?.[0];
      const candidateParts = firstCandidate?.content?.parts ?? [];

      let text: string | undefined;
      const toolCalls: LlmToolCall[] = [];

      for (const part of candidateParts) {
        if (part.text) {
          text = text ? `${text}\n${part.text}` : part.text;
        }
        if (part.functionCall) {
          const rawPart = part as {
            thoughtSignature?: string;
            thought_signature?: string;
          };
          const signature = rawPart.thoughtSignature ?? rawPart.thought_signature;
          toolCalls.push({
            name: part.functionCall.name,
            args: part.functionCall.args ?? {},
            thoughtSignature: signature,
          });
        }
      }

      return {
        text: text?.trim(),
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        usage: data.usageMetadata
          ? {
              inputTokens: data.usageMetadata.promptTokenCount ?? 0,
              outputTokens: data.usageMetadata.candidatesTokenCount ?? 0,
            }
          : undefined,
      };
    }

    throw lastError ?? new Error('All configured Gemini API keys have reached their quota limits.');
  }
}
