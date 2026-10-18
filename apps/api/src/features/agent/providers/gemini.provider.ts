import { env } from '../../../config/env';
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
  model?: string;
  fetchFn?: typeof fetch;
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
  private readonly apiKey: string | undefined;
  private readonly model: string;
  private readonly fetchFn: typeof fetch;

  constructor(options?: GeminiProviderOptions) {
    this.apiKey =
      options && 'apiKey' in options ? options.apiKey : env.GEMINI_API_KEY;
    this.model = options?.model ?? env.LLM_MODEL ?? 'gemini-2.5-flash';
    this.fetchFn = options?.fetchFn ?? fetch;
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
    if (!this.apiKey) {
      throw new Error('Gemini API key is not configured');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

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

    const response = await this.fetchFn(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      let parsedMessage = `Gemini API request failed with status ${response.status}`;
      try {
        const parsed = JSON.parse(errText) as GeminiResponseBody;
        if (parsed.error?.message) {
          parsedMessage = `Gemini API error: ${parsed.error.message}`;
        }
      } catch {
        // use default message
      }
      throw new Error(parsedMessage);
    }

    const data = (await response.json()) as GeminiResponseBody;

    if (data.error) {
      throw new Error(`Gemini API error: ${data.error.message ?? 'Unknown error'}`);
    }

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
}
