import assert from 'node:assert/strict';
import { FileTooLargeError, toHttpFileError } from '../../src/server/files/errors';
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_JSON_BYTES } from '../../src/server/files/validation';

function jsonBodyByteLengthForDecodedFile(byteLength: number): number {
  return Buffer.byteLength(JSON.stringify({
    fileName: 'resume.txt',
    mimeType: 'text/plain',
    fileData: Buffer.alloc(byteLength, 'a').toString('base64'),
  }));
}

function testJsonLimitAllowsDocumentedEightMbDecodedUpload() {
  const bodyByteLength = jsonBodyByteLengthForDecodedFile(MAX_UPLOAD_BYTES);
  assert.ok(
    bodyByteLength <= MAX_UPLOAD_JSON_BYTES,
    `8MB decoded upload expands to ${bodyByteLength} JSON bytes, above configured ${MAX_UPLOAD_JSON_BYTES}`
  );
}

function testPayloadTooLargeMapsToJsonFileError() {
  const httpError = toHttpFileError(Object.assign(new Error('request entity too large'), { type: 'entity.too.large' }));
  assert.equal(httpError.status, 413);
  assert.equal(httpError.body.code, 'FILE_TOO_LARGE');
  assert.equal(httpError.body.error, new FileTooLargeError().message);
}

const tests = [
  testJsonLimitAllowsDocumentedEightMbDecodedUpload,
  testPayloadTooLargeMapsToJsonFileError,
];

for (const test of tests) {
  test();
}

console.log(`uploadLimit.test.ts: ${tests.length} tests passed`);
