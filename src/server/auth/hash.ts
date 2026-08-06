import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export function sha256Hex(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function createRandomNumericCode(length = 6) {
  const max = 10 ** length;
  const value = Number.parseInt(randomBytes(4).toString('hex'), 16) % max;
  return value.toString().padStart(length, '0');
}

export function createSessionToken() {
  return randomBytes(32).toString('base64url');
}

export function hashSmsCode(phone: string, purpose: string, code: string) {
  return sha256Hex(`${phone}:${purpose}:${code}`);
}

export function hashSessionToken(token: string) {
  return sha256Hex(token);
}

export function safeEqualHash(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
