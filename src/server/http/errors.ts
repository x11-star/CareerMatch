import type express from 'express';

export class HttpError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

export function sendHttpError(res: express.Response, error: unknown) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ code: error.code, error: error.message });
  }
  if (error instanceof Error && error.message === 'AUTH_CONFIGURATION_ERROR') {
    return res.status(500).json({ code: 'AUTH_CONFIGURATION_ERROR', error: '认证服务未正确配置' });
  }
  return res.status(500).json({ code: 'INTERNAL_SERVER_ERROR', error: '服务器暂时不可用' });
}
