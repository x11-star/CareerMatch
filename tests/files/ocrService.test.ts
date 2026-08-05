import assert from 'node:assert/strict';
import { createOcrService } from '../../src/server/files/ocr/ocrService';
import type { OcrProvider } from '../../src/server/files/types';

async function testOcrServiceDelegatesToProvider() {
  const calls: { mimeType: string; size: number }[] = [];
  const fakeProvider: OcrProvider = {
    name: 'fake',
    async extractTextFromImage(buffer, mimeType) {
      calls.push({ mimeType, size: buffer.byteLength });
      return '图片中的简历文字';
    },
  };

  const service = createOcrService(fakeProvider);
  const text = await service.extractImageText(Buffer.from('image'), 'image/png');
  assert.equal(text, '图片中的简历文字');
  assert.deepEqual(calls, [{ mimeType: 'image/png', size: 5 }]);
}

async function testOcrServiceRejectsEmptyText() {
  const fakeProvider: OcrProvider = {
    name: 'fake',
    async extractTextFromImage() {
      return '   ';
    },
  };

  const service = createOcrService(fakeProvider);
  await assert.rejects(
    () => service.extractImageText(Buffer.from('image'), 'image/png'),
    /OCR 未识别到有效文字/
  );
}

const tests = [testOcrServiceDelegatesToProvider, testOcrServiceRejectsEmptyText];

for (const test of tests) {
  await test();
}

console.log(`ocrService.test.ts: ${tests.length} tests passed`);
