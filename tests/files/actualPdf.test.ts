import assert from 'node:assert/strict';
import { textPdf } from '../fixtures/textPdf';
import { normalizeUpload } from '../../src/server/files/validation';
import { extractTextFromPdf } from '../../src/server/files/textExtractors';
import { parseUploadedResumeText } from '../../src/server/files/fileParseService';
import { FileParseFailedError, toHttpFileError } from '../../src/server/files/errors';

const file = { fileName: 'resume.pdf', mimeType: 'application/pdf', fileData: textPdf().toString('base64') };
const upload = normalizeUpload(file);
assert.match((await extractTextFromPdf(upload))?.text || '', /Resume Python SQL/);
assert.match((await extractTextFromPdf(upload))?.text || '', /Resume Python SQL/);
assert.equal((await parseUploadedResumeText(file)).sourceType, 'pdf');
await assert.rejects(() => extractTextFromPdf(normalizeUpload({ ...file, fileData: Buffer.from('broken PDF').toString('base64') })), FileParseFailedError);
const internal = toHttpFileError(new FileParseFailedError('pdfParser is not a function /private/path'));
assert.equal(internal.body.code, 'FILE_PARSE_FAILED');
assert(!internal.body.error.includes('pdfParser'));
assert(!toHttpFileError(new Error('Internal English error')).body.error.includes('Internal'));
console.log('actualPdf.test.ts: real PDF extraction, reuse, upload pipeline, malformed PDF and public error sanitization passed');
