import { createDeepSeekProvider } from './deepseekClient';
import { AiConfigurationError, AiProviderError } from './errors';
import { createZhipuProvider } from './zhipuClient';
import type { AiProvider, MatchPositionInput, PositionChatInput, ResumeParseInput } from './types';

async function callWithFallback<T>(providers: AiProvider[], action: (provider: AiProvider) => Promise<T>): Promise<T> {
  const configuredProviders = providers.filter((provider) => provider.isConfigured());

  if (configuredProviders.length === 0) {
    throw new AiConfigurationError();
  }

  let lastError: unknown = null;
  for (const provider of configuredProviders) {
    try {
      return await action(provider);
    } catch (error) {
      lastError = error;
      console.error(`[AI] ${provider.name} failed, trying next provider if available:`, error);
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new AiProviderError('all', '所有 AI Provider 调用失败');
}

export function createAiService(providers: AiProvider[] = [createZhipuProvider(), createDeepSeekProvider()]) {
  return {
    parseResume(input: ResumeParseInput) {
      return callWithFallback(providers, (provider) => provider.parseResume(input));
    },
    matchPosition(input: MatchPositionInput) {
      return callWithFallback(providers, (provider) => provider.matchPosition(input));
    },
    chatAboutPosition(input: PositionChatInput) {
      return callWithFallback(providers, (provider) => provider.chatAboutPosition(input));
    },
  };
}

export const defaultAiService = createAiService();
