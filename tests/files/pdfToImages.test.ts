import assert from 'node:assert/strict';
import { MAX_PDF_OCR_PAGES } from '../../src/server/files/validation';
import { normalizePdfPageLimit } from '../../src/server/files/ocr/pdfToImages';

function testNormalizePdfPageLimitUsesDefault() {
  assert.equal(normalizePdfPageLimit(undefined), MAX_PDF_OCR_PAGES);
}

function testNormalizePdfPageLimitCapsAtDefaultMax() {
  assert.equal(normalizePdfPageLimit(99), MAX_PDF_OCR_PAGES);
}

function testNormalizePdfPageLimitRejectsZero() {
  assert.throws(() => normalizePdfPageLimit(0), /PDF OCR 页数必须至少为 1/);
}

const tests = [
  testNormalizePdfPageLimitUsesDefault,
  testNormalizePdfPageLimitCapsAtDefaultMax,
  testNormalizePdfPageLimitRejectsZero,
];

for (const test of tests) {
  test();
}

console.log(`pdfToImages.test.ts: ${tests.length} tests passed`);
