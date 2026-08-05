import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeUpload, MAX_AI_TEXT_CHARS } from '../../src/server/files/validation';
import { extractTextFromPdf, extractTextFromTxt, truncateForAi } from '../../src/server/files/textExtractors';

function testExtractTextFromTxt() {
  const fileData = readFileSync('tests/fixtures/resume.txt').toString('base64');
  const upload = normalizeUpload({ fileData, mimeType: 'text/plain', fileName: 'resume.txt' });
  const result = extractTextFromTxt(upload);
  assert.equal(result.sourceType, 'txt');
  assert.match(result.text, /南京大学软件工程/);
}

async function testTextPdfReturnsTextWhenParserFindsContent() {
  const upload = normalizeUpload({
    fileData: Buffer.from('%PDF fake').toString('base64'),
    mimeType: 'application/pdf',
    fileName: 'resume.pdf',
  });

  const result = await extractTextFromPdf(upload, async () => ({ text: 'PDF 中的简历文本' }));
  assert.equal(result?.sourceType, 'pdf');
  assert.equal(result?.text, 'PDF 中的简历文本');
}

async function testScannedPdfReturnsNullWhenNoText() {
  const upload = normalizeUpload({
    fileData: Buffer.from('%PDF fake').toString('base64'),
    mimeType: 'application/pdf',
    fileName: 'scan.pdf',
  });

  const result = await extractTextFromPdf(upload, async () => ({ text: '   ' }));
  assert.equal(result, null);
}

function testTruncateForAiCapsLongText() {
  const longText = '简'.repeat(MAX_AI_TEXT_CHARS + 100);
  const result = truncateForAi(longText);
  assert.equal(result.text.length, MAX_AI_TEXT_CHARS);
  assert.equal(result.truncated, true);
}

const tests = [
  testExtractTextFromTxt,
  testTextPdfReturnsTextWhenParserFindsContent,
  testScannedPdfReturnsNullWhenNoText,
  testTruncateForAiCapsLongText,
];

for (const test of tests) {
  await test();
}

console.log(`textExtractors.test.ts: ${tests.length} tests passed`);
