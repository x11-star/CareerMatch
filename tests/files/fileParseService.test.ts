import assert from 'node:assert/strict';
import { parseUploadedResumeText } from '../../src/server/files/fileParseService';

async function testParsesTxtUpload() {
  const result = await parseUploadedResumeText({
    fileData: Buffer.from('张三 简历').toString('base64'),
    mimeType: 'text/plain',
    fileName: 'resume.txt',
  });
  assert.equal(result.sourceType, 'txt');
  assert.equal(result.text, '张三 简历');
}

async function testUsesOcrForImageUpload() {
  const result = await parseUploadedResumeText(
    {
      fileData: Buffer.from('fake image').toString('base64'),
      mimeType: 'image/png',
      fileName: 'resume.png',
    },
    {
      ocrService: { extractImageText: async () => '图片 OCR 简历文字' },
    }
  );
  assert.equal(result.sourceType, 'image');
  assert.equal(result.text, '图片 OCR 简历文字');
}

async function testFallsBackToOcrWhenPdfHasNoText() {
  const result = await parseUploadedResumeText(
    {
      fileData: Buffer.from('%PDF fake').toString('base64'),
      mimeType: 'application/pdf',
      fileName: 'scan.pdf',
    },
    {
      pdfParser: async () => ({ text: '  ' }),
      pdfToImages: async () => [{ buffer: Buffer.from('page'), mimeType: 'image/png', pageNumber: 1 }],
      ocrService: { extractImageText: async () => '扫描 PDF OCR 文字' },
    }
  );
  assert.equal(result.sourceType, 'ocr-pdf');
  assert.equal(result.text, '扫描 PDF OCR 文字');
}

const tests = [testParsesTxtUpload, testUsesOcrForImageUpload, testFallsBackToOcrWhenPdfHasNoText];

for (const test of tests) {
  await test();
}

console.log(`fileParseService.test.ts: ${tests.length} tests passed`);
