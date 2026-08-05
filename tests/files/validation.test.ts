import assert from 'node:assert/strict';
import {
  MAX_UPLOAD_BYTES,
  normalizeUpload,
  UnsupportedFileTypeError,
  FileTooLargeError,
} from '../../src/server/files/validation';

function base64OfSize(byteLength: number): string {
  return Buffer.alloc(byteLength, 'a').toString('base64');
}

function testAcceptsPdfByMime() {
  const upload = normalizeUpload({
    fileData: Buffer.from('hello').toString('base64'),
    mimeType: 'application/pdf',
    fileName: 'resume.pdf',
  });
  assert.equal(upload.sourceType, 'pdf');
  assert.equal(upload.extension, 'pdf');
}

function testAcceptsJpegByExtensionWhenMimeIsBlank() {
  const upload = normalizeUpload({
    fileData: Buffer.from('fake image').toString('base64'),
    mimeType: '',
    fileName: 'resume.jpeg',
  });
  assert.equal(upload.sourceType, 'image');
  assert.equal(upload.mimeType, 'image/jpeg');
}

function testRejectsUnsupportedDocExtension() {
  assert.throws(
    () => normalizeUpload({
      fileData: Buffer.from('legacy doc').toString('base64'),
      mimeType: 'application/msword',
      fileName: 'resume.doc',
    }),
    UnsupportedFileTypeError
  );
}

function testRejectsFilesOverEightMbDecoded() {
  assert.throws(
    () => normalizeUpload({
      fileData: base64OfSize(MAX_UPLOAD_BYTES + 1),
      mimeType: 'text/plain',
      fileName: 'resume.txt',
    }),
    FileTooLargeError
  );
}

const tests = [
  testAcceptsPdfByMime,
  testAcceptsJpegByExtensionWhenMimeIsBlank,
  testRejectsUnsupportedDocExtension,
  testRejectsFilesOverEightMbDecoded,
];

for (const test of tests) {
  test();
}

console.log(`validation.test.ts: ${tests.length} tests passed`);
