import { createRandomNumericCode } from './hash';

export type SmsPurpose = 'login' | 'change_phone' | 'delete_account';

export interface SmsSender {
  sendSmsCode(input: { phone: string; code: string; purpose: SmsPurpose }): Promise<{ devCode?: string }>;
}

export function createDevSmsSender(options: { fixedCode?: string } = {}): SmsSender {
  return {
    async sendSmsCode({ code }) {
      return { devCode: options.fixedCode || code };
    },
  };
}

export function nextSmsCode() {
  return process.env.DEV_SMS_CODE || createRandomNumericCode(6);
}

export function createSmsSenderFromEnv(): SmsSender {
  if (process.env.SMS_PROVIDER === 'dev' || process.env.NODE_ENV !== 'production') {
    return createDevSmsSender({ fixedCode: process.env.DEV_SMS_CODE });
  }
  throw new Error('AUTH_CONFIGURATION_ERROR');
}
