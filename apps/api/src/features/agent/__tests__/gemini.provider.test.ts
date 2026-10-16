import { describe, it, expect, vi } from 'vitest';
import { GeminiProvider } from '../providers/gemini.provider';
import type { LlmMessage } from '../providers/llm-provider';

interface CapturedGeminiBody {
  systemInstruction?: { parts: { text: string }[] };
  tools?: { functionDeclarations: { name: string }[] }[];
  contents: {
    role: string;
    parts: {
      text?: string;
      functionCall?: { name: string };
      functionResponse?: { name: string; response: { output: { minCashMinor?: number } } };
    }[];
  }[];
}

describe('B16 GeminiProvider - Mocked HTTP Contract Tests', () => {
  it('throws an error if apiKey is missing', async () => {
    const provider = new GeminiProvider({ apiKey: undefined });
    await expect(
      provider.generate({
        messages: [{ role: 'user', content: 'hello' }],
      }),
    ).rejects.toThrow('Gemini API key is not configured');
  });

  it('correctly maps function declarations and parses function calls from response', async () => {
    let capturedUrl = '';
    let capturedBody: CapturedGeminiBody = { contents: [] };

    const mockFetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      capturedUrl = url;
      capturedBody = JSON.parse(init?.body as string) as CapturedGeminiBody;

      return {
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                role: 'model',
                parts: [
                  {
                    functionCall: {
                      name: 'getForecast',
                      args: {},
                    },
                  },
                ],
              },
              finishReason: 'STOP',
            },
          ],
          usageMetadata: {
            promptTokenCount: 150,
            candidatesTokenCount: 30,
            totalTokenCount: 180,
          },
        }),
      };
    });

    const provider = new GeminiProvider({
      apiKey: 'test-gemini-key',
      model: 'gemini-2.5-flash',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const result = await provider.generate({
      system: 'You are a finance copilot.',
      messages: [{ role: 'user', content: 'What is our forecast?' }],
      tools: [
        {
          name: 'getForecast',
          description: 'Get 13-week cash forecast',
          parameters: { type: 'object', properties: {} },
        },
      ],
    });

    expect(capturedUrl).toContain('models/gemini-2.5-flash:generateContent');
    expect(capturedUrl).toContain('key=test-gemini-key');

    expect(capturedBody?.systemInstruction?.parts[0]?.text).toBe('You are a finance copilot.');
    expect(capturedBody?.tools?.[0]?.functionDeclarations[0]?.name).toBe('getForecast');
    expect(capturedBody?.contents[0]?.role).toBe('user');
    expect(capturedBody?.contents[0]?.parts[0]?.text).toBe('What is our forecast?');

    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls![0]!.name).toBe('getForecast');
    expect(result.toolCalls![0]!.args).toEqual({});
    expect(result.usage).toEqual({ inputTokens: 150, outputTokens: 30 });
  });

  it('correctly maps multi-turn tool results back to Gemini format and extracts final text', async () => {
    let capturedBody: CapturedGeminiBody = { contents: [] };

    const mockFetch = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      capturedBody = JSON.parse(init?.body as string) as CapturedGeminiBody;
      return {
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                role: 'model',
                parts: [{ text: 'Your liquidity gap is ¥50,000.00.' }],
              },
            },
          ],
          usageMetadata: {
            promptTokenCount: 220,
            candidatesTokenCount: 40,
          },
        }),
      };
    });

    const provider = new GeminiProvider({
      apiKey: 'test-gemini-key',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const messages: LlmMessage[] = [
      { role: 'user', content: 'Check forecast' },
      {
        role: 'assistant',
        toolCalls: [{ name: 'getForecast', args: {} }],
      },
      {
        role: 'tool',
        toolResults: [
          {
            name: 'getForecast',
            output: { minCashMinor: -2000000, liquidityGapFormatted: '¥50,000.00' },
          },
        ],
      },
    ];

    const result = await provider.generate({ messages });

    expect(capturedBody?.contents).toHaveLength(3);
    // User message
    expect(capturedBody?.contents[0]?.role).toBe('user');
    // Model function call
    expect(capturedBody?.contents[1]?.role).toBe('model');
    expect(capturedBody?.contents[1]?.parts[0]?.functionCall?.name).toBe('getForecast');
    // User function response
    expect(capturedBody?.contents[2]?.role).toBe('user');
    expect(capturedBody?.contents[2]?.parts[0]?.functionResponse?.name).toBe('getForecast');
    expect(
      capturedBody?.contents[2]?.parts[0]?.functionResponse?.response.output.minCashMinor,
    ).toBe(-2000000);

    expect(result.text).toBe('Your liquidity gap is ¥50,000.00.');
    expect(result.toolCalls).toBeUndefined();
    expect(result.usage).toEqual({ inputTokens: 220, outputTokens: 40 });
  });

  it('handles non-200 responses with descriptive error messages', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ error: { message: 'Invalid argument provided' } }),
    });

    const provider = new GeminiProvider({
      apiKey: 'test-gemini-key',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    await expect(
      provider.generate({
        messages: [{ role: 'user', content: 'hello' }],
      }),
    ).rejects.toThrow('Gemini API error: Invalid argument provided');
  });
});
