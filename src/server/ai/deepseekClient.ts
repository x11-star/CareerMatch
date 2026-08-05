import { AiProviderError, AiResponseInvalidError } from './errors';
import { buildMatchPositionPrompt, buildPositionChatPrompt, buildResumeParsePrompt } from './prompts';
import { cleanAndParseJSON, validateChatReply, validateMatchResult, validateResumeData } from './schemas';
import type { AiProvider, MatchPositionInput, PositionChatInput, ResumeParseInput } from './types';

interface ProviderOptions {
  apiKey?: string;
  model?: string;
  fetchFn?: typeof fetch;
}

const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/v1/chat/completions';

function extractContent(provider: string, data: any): string {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new AiResponseInvalidError(provider, 'DeepSeek API 返回内容为空');
  }
  return content;
}

export function createDeepSeekProvider(options: ProviderOptions = {}): AiProvider {
  const apiKey = options.apiKey ?? process.env.DEEPSEEK_API_KEY ?? '';
  const model = options.model ?? process.env.DEEPSEEK_MODEL ?? 'deepseek-chat';
  const fetchFn = options.fetchFn ?? fetch;

  async function complete(prompt: string): Promise<string> {
    const response = await fetchFn(DEEPSEEK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: '你是专业、严谨的中文校招求职分析助手。必须按用户要求输出。' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      throw new AiProviderError('deepseek', `DeepSeek API returned status ${response.status}`);
    }

    const data = await response.json();
    return extractContent('deepseek', data);
  }

  return {
    name: 'deepseek',
    isConfigured: () => Boolean(apiKey),
    async parseResume(input: ResumeParseInput) {
      const content = await complete(buildResumeParsePrompt(input));
      return validateResumeData(cleanAndParseJSON(content));
    },
    async matchPosition(input: MatchPositionInput) {
      const content = await complete(buildMatchPositionPrompt(input));
      return validateMatchResult(cleanAndParseJSON(content));
    },
    async chatAboutPosition(input: PositionChatInput) {
      const content = await complete(buildPositionChatPrompt(input));
      try {
        return validateChatReply(cleanAndParseJSON(content));
      } catch {
        return validateChatReply(content);
      }
    },
  };
}
