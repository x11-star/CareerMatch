export type AiErrorCode =
  | 'AI_CONFIGURATION_MISSING'
  | 'AI_PROVIDER_FAILED'
  | 'AI_RESPONSE_INVALID';

export class AiError extends Error {
  code: AiErrorCode;
  provider?: string;

  constructor(message: string, code: AiErrorCode, provider?: string) {
    super(message);
    this.name = 'AiError';
    this.code = code;
    this.provider = provider;
  }
}

export class AiConfigurationError extends AiError {
  constructor(message = 'AI 服务未配置，请在 .env 中填写 ZHIPU_API_KEY 或 DEEPSEEK_API_KEY') {
    super(message, 'AI_CONFIGURATION_MISSING');
    this.name = 'AiConfigurationError';
  }
}

export class AiProviderError extends AiError {
  constructor(provider: string, message: string) {
    super(message, 'AI_PROVIDER_FAILED', provider);
    this.name = 'AiProviderError';
  }
}

export class AiResponseInvalidError extends AiError {
  constructor(provider: string, message: string) {
    super(message, 'AI_RESPONSE_INVALID', provider);
    this.name = 'AiResponseInvalidError';
  }
}

export function toHttpAiError(error: unknown): {
  status: number;
  body: { error: string; code: AiErrorCode | 'UNKNOWN_ERROR'; provider?: string };
} {
  if (error instanceof AiConfigurationError) {
    return { status: 503, body: { error: error.message, code: error.code } };
  }

  if (error instanceof AiError) {
    return {
      status: 502,
      body: { error: error.message, code: error.code, provider: error.provider },
    };
  }

  if (error instanceof Error) {
    return { status: 500, body: { error: error.message, code: 'UNKNOWN_ERROR' } };
  }

  return { status: 500, body: { error: '未知 AI 服务错误', code: 'UNKNOWN_ERROR' } };
}
