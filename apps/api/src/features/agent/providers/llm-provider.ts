import type { ModelFacingToolDefinition } from '../tools/tool.types';

export interface LlmToolCall {
  name: string;
  args: Record<string, unknown>;
  id?: string;
}

export interface LlmToolResult {
  toolCallId?: string;
  name: string;
  output: unknown;
}

export interface LlmMessage {
  role: 'user' | 'assistant' | 'tool';
  content?: string;
  toolCalls?: LlmToolCall[];
  toolResults?: LlmToolResult[];
}

export interface LlmGenerateOptions {
  system?: string;
  messages: LlmMessage[];
  tools?: ModelFacingToolDefinition[];
}

export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface LlmGenerateResult {
  text?: string;
  toolCalls?: LlmToolCall[];
  usage?: LlmUsage;
}

export interface LlmProvider {
  readonly name: 'gemini' | 'replay';
  generate(options: LlmGenerateOptions): Promise<LlmGenerateResult>;
}
