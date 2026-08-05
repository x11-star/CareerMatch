# CareerMatch File Parse and Local OCR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a backend file parsing module that supports TXT, DOCX, text PDF, image resumes, and scanned-PDF OCR, then feeds extracted text into the existing AI Service without using third-party OCR by default.

**Architecture:** File extraction moves out of `server.ts` into focused modules under `src/server/files/`. The route accepts base64 uploads, validates type and size, extracts text locally using parsers/OCR, and calls `defaultAiService.parseResume()` only when real text exists. OCR is provider-based: `local` is implemented first, while Tencent/Baidu/Aliyun remain interface-compatible future providers.

**Tech Stack:** TypeScript, Express, `mammoth`, `pdf-parse`, `tesseract.js` for local OCR, `pdfjs-dist` + `canvas` or a clearly tested Node-compatible PDF page renderer for scanned PDF conversion, Node built-in `assert`, existing `tsx` test runner.

## Global Constraints

- Do not call third-party OCR services in this plan.
- `OCR_PROVIDER` defaults to `local`.
- Supported upload formats: PDF, DOCX, TXT, JPG, JPEG, PNG, WebP.
- Single uploaded file max size is 8MB before base64 expansion is decoded.
- PDF OCR processes at most the first 3 pages in this plan.
- OCR/extracted text sent to AI is capped at 20,000 characters.
- If OCR or text extraction fails, return an honest error; do not fabricate resume content.
- AI Key missing behavior from the previous plan remains unchanged: return AI configuration errors, do not fake AI results.
- Do not do broad UI redesign in this plan; only update upload copy, accepted formats, file-size copy, and error messages.
- Keep existing text, DOCX, and text-PDF parsing behavior working.

---

## File Structure

Create these focused files:

- `src/server/files/errors.ts` — normalized file parsing errors and HTTP mapping.
- `src/server/files/types.ts` — upload input, extracted text output, file source types, OCR provider interfaces.
- `src/server/files/validation.ts` — MIME/extension normalization, decoded-size check, supported type validation.
- `src/server/files/textExtractors.ts` — TXT, DOCX, and text-PDF extraction helpers.
- `src/server/files/ocr/localOcrProvider.ts` — local image OCR provider.
- `src/server/files/ocr/pdfToImages.ts` — converts first N scanned-PDF pages to OCR-ready images.
- `src/server/files/ocr/ocrService.ts` — provider selection and image/scanned-PDF OCR orchestration.
- `src/server/files/fileParseService.ts` — single entry point consumed by `/api/parse-resume`.

Create these tests and fixtures:

- `tests/files/validation.test.ts` — no-network tests for file validation.
- `tests/files/textExtractors.test.ts` — no-network tests for TXT and mocked PDF/DOCX extraction behavior.
- `tests/files/fileParseService.test.ts` — tests orchestration with mocked extractors/OCR provider.
- `tests/files/run-tests.ts` — file test runner imported by package script.
- `tests/fixtures/resume.txt` — small sample resume text.

Modify these existing files:

- `server.ts` — replace inline file extraction with `parseUploadedResumeText()`.
- `src/server/ai/types.ts` — extend `ResumeParseInput.sourceType` to include `image` and `ocr-pdf`.
- `src/server/ai/prompts.ts` — allow those source types in prompt text with no logic change.
- `src/components/ResumeUploadPage.tsx` — enforce size/type before upload and update honest file/OCR copy.
- `.env.example` — add `OCR_PROVIDER="local"`.
- `package.json` and `package-lock.json` — add OCR/rendering dependencies and `test:files` script.
- `README.md` — document file format, 8MB limit, local OCR, first-3-page scanned PDF behavior.

---

### Task 1: File Validation Module and Tests

**Files:**
- Create: `src/server/files/errors.ts`
- Create: `src/server/files/types.ts`
- Create: `src/server/files/validation.ts`
- Create: `tests/files/validation.test.ts`
- Create: `tests/files/run-tests.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `FileParseError`, `UnsupportedFileTypeError`, `FileTooLargeError`, `EmptyExtractedTextError`, `toHttpFileError(error)`
- Produces: `UploadedFileInput`, `NormalizedUpload`, `ExtractedResumeText`, `FileSourceType`, `OcrProvider`
- Produces: `normalizeUpload(input: UploadedFileInput): NormalizedUpload`
- Produces: `MAX_UPLOAD_BYTES = 8 * 1024 * 1024`
- Produces: `MAX_AI_TEXT_CHARS = 20_000`
- Produces: `MAX_PDF_OCR_PAGES = 3`

- [ ] **Step 1: Add file test script to `package.json`**

Add:

```json
"test:files": "tsx tests/files/run-tests.ts"
```

Keep `test:ai` unchanged.

- [ ] **Step 2: Write failing validation tests**

Create `tests/files/validation.test.ts`:

```ts
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
```

Create `tests/files/run-tests.ts`:

```ts
import './validation.test';
```

- [ ] **Step 3: Run test to verify it fails**

Run:

```bash
npm run test:files
```

Expected: FAIL because `src/server/files/validation.ts` does not exist.

- [ ] **Step 4: Implement file errors**

Create `src/server/files/errors.ts`:

```ts
export type FileParseErrorCode =
  | 'UNSUPPORTED_FILE_TYPE'
  | 'FILE_TOO_LARGE'
  | 'EMPTY_EXTRACTED_TEXT'
  | 'FILE_PARSE_FAILED';

export class FileParseError extends Error {
  code: FileParseErrorCode;

  constructor(message: string, code: FileParseErrorCode) {
    super(message);
    this.name = 'FileParseError';
    this.code = code;
  }
}

export class UnsupportedFileTypeError extends FileParseError {
  constructor(message = '不支持的文件格式。请上传 PDF、DOCX、TXT、JPG、PNG 或 WebP。') {
    super(message, 'UNSUPPORTED_FILE_TYPE');
    this.name = 'UnsupportedFileTypeError';
  }
}

export class FileTooLargeError extends FileParseError {
  constructor(message = '文件超过 8MB 限制，请压缩后重新上传。') {
    super(message, 'FILE_TOO_LARGE');
    this.name = 'FileTooLargeError';
  }
}

export class EmptyExtractedTextError extends FileParseError {
  constructor(message = '未能从文件中提取到有效文字，请上传更清晰的文件或粘贴简历文本。') {
    super(message, 'EMPTY_EXTRACTED_TEXT');
    this.name = 'EmptyExtractedTextError';
  }
}

export class FileParseFailedError extends FileParseError {
  constructor(message: string) {
    super(message, 'FILE_PARSE_FAILED');
    this.name = 'FileParseFailedError';
  }
}

export function toHttpFileError(error: unknown): {
  status: number;
  body: { error: string; code: FileParseErrorCode | 'UNKNOWN_FILE_ERROR' };
} {
  if (error instanceof UnsupportedFileTypeError) {
    return { status: 415, body: { error: error.message, code: error.code } };
  }
  if (error instanceof FileTooLargeError) {
    return { status: 413, body: { error: error.message, code: error.code } };
  }
  if (error instanceof FileParseError) {
    return { status: 422, body: { error: error.message, code: error.code } };
  }
  if (error instanceof Error) {
    return { status: 500, body: { error: error.message, code: 'UNKNOWN_FILE_ERROR' } };
  }
  return { status: 500, body: { error: '未知文件解析错误', code: 'UNKNOWN_FILE_ERROR' } };
}
```

- [ ] **Step 5: Implement file types**

Create `src/server/files/types.ts`:

```ts
export type FileSourceType = 'text' | 'txt' | 'docx' | 'pdf' | 'image' | 'ocr-pdf';

export interface UploadedFileInput {
  fileData: string;
  mimeType?: string;
  fileName?: string;
}

export interface NormalizedUpload {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  extension: string;
  sourceType: FileSourceType;
}

export interface ExtractedResumeText {
  text: string;
  sourceType: FileSourceType;
  fileName?: string;
  warnings: string[];
}

export interface OcrProvider {
  name: string;
  extractTextFromImage(buffer: Buffer, mimeType: string): Promise<string>;
}
```

- [ ] **Step 6: Implement validation**

Create `src/server/files/validation.ts`:

```ts
import { FileTooLargeError, UnsupportedFileTypeError } from './errors';
import type { FileSourceType, NormalizedUpload, UploadedFileInput } from './types';

export { FileTooLargeError, UnsupportedFileTypeError } from './errors';

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_AI_TEXT_CHARS = 20_000;
export const MAX_PDF_OCR_PAGES = 3;

const EXTENSION_TO_MIME: Record<string, string> = {
  txt: 'text/plain',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

function extensionFromFileName(fileName?: string): string {
  return fileName?.split('.').pop()?.toLowerCase() || '';
}

function sourceTypeFromExtension(extension: string): FileSourceType {
  if (extension === 'txt') return 'txt';
  if (extension === 'docx') return 'docx';
  if (extension === 'pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png', 'webp'].includes(extension)) return 'image';
  throw new UnsupportedFileTypeError();
}

export function normalizeUpload(input: UploadedFileInput): NormalizedUpload {
  const extension = extensionFromFileName(input.fileName);
  if (!extension || !(extension in EXTENSION_TO_MIME)) {
    throw new UnsupportedFileTypeError();
  }

  const sourceType = sourceTypeFromExtension(extension);
  const mimeType = input.mimeType || EXTENSION_TO_MIME[extension];
  const expectedMimeType = EXTENSION_TO_MIME[extension];

  if (sourceType !== 'image' && mimeType && mimeType !== expectedMimeType) {
    throw new UnsupportedFileTypeError();
  }
  if (sourceType === 'image' && !mimeType.startsWith('image/')) {
    throw new UnsupportedFileTypeError();
  }

  const buffer = Buffer.from(input.fileData, 'base64');
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new FileTooLargeError();
  }

  return {
    buffer,
    mimeType: mimeType || expectedMimeType,
    fileName: input.fileName || `resume.${extension}`,
    extension,
    sourceType,
  };
}
```

- [ ] **Step 7: Run validation tests and typecheck**

Run:

```bash
npm run test:files
npm run typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit Task 1**

```bash
git add package.json src/server/files/errors.ts src/server/files/types.ts src/server/files/validation.ts tests/files/validation.test.ts tests/files/run-tests.ts
git commit -m "feat: add resume file upload validation"
```

---

### Task 2: Text, DOCX, and Text-PDF Extraction Service

**Files:**
- Create: `src/server/files/textExtractors.ts`
- Create: `tests/fixtures/resume.txt`
- Create: `tests/files/textExtractors.test.ts`
- Modify: `tests/files/run-tests.ts`

**Interfaces:**
- Consumes: `NormalizedUpload`, `ExtractedResumeText`
- Produces: `extractTextFromTxt(upload: NormalizedUpload): ExtractedResumeText`
- Produces: `extractTextFromDocx(upload: NormalizedUpload): Promise<ExtractedResumeText>`
- Produces: `extractTextFromPdf(upload: NormalizedUpload, pdfParser?: PdfParser): Promise<ExtractedResumeText | null>`
- Produces: `truncateForAi(text: string): { text: string; truncated: boolean }`

- [ ] **Step 1: Write tests for TXT and PDF extraction behavior**

Create `tests/fixtures/resume.txt`:

```text
张三，南京大学软件工程 2027 届，熟悉 TypeScript、Node.js 和 PostgreSQL。
```

Create `tests/files/textExtractors.test.ts`:

```ts
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
```

Update `tests/files/run-tests.ts`:

```ts
import './validation.test';
import './textExtractors.test';
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm run test:files
```

Expected: FAIL because `textExtractors.ts` does not exist.

- [ ] **Step 3: Implement text extractors**

Create `src/server/files/textExtractors.ts`:

```ts
import mammoth from 'mammoth';
import { createRequire } from 'node:module';
import { EmptyExtractedTextError, FileParseFailedError } from './errors';
import type { ExtractedResumeText, NormalizedUpload } from './types';
import { MAX_AI_TEXT_CHARS } from './validation';

const require = createRequire(import.meta.url);
const defaultPdfParser = require('pdf-parse');

export type PdfParser = (buffer: Buffer) => Promise<{ text?: string }>;

export function truncateForAi(text: string): { text: string; truncated: boolean } {
  if (text.length <= MAX_AI_TEXT_CHARS) {
    return { text, truncated: false };
  }
  return { text: text.slice(0, MAX_AI_TEXT_CHARS), truncated: true };
}

function finalizeText(text: string, sourceType: ExtractedResumeText['sourceType'], fileName?: string): ExtractedResumeText {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new EmptyExtractedTextError();
  }
  const truncated = truncateForAi(trimmed);
  return {
    text: truncated.text,
    sourceType,
    fileName,
    warnings: truncated.truncated ? ['文本超过 20,000 字符，已截断后发送给 AI。'] : [],
  };
}

export function extractTextFromTxt(upload: NormalizedUpload): ExtractedResumeText {
  return finalizeText(upload.buffer.toString('utf-8'), 'txt', upload.fileName);
}

export async function extractTextFromDocx(upload: NormalizedUpload): Promise<ExtractedResumeText> {
  try {
    const result = await mammoth.extractRawText({ buffer: upload.buffer });
    return finalizeText(result.value, 'docx', upload.fileName);
  } catch (error: any) {
    throw new FileParseFailedError(`Word 简历解析失败: ${error.message || error}`);
  }
}

export async function extractTextFromPdf(
  upload: NormalizedUpload,
  pdfParser: PdfParser = defaultPdfParser
): Promise<ExtractedResumeText | null> {
  try {
    const result = await pdfParser(upload.buffer);
    const text = result.text || '';
    if (!text.trim()) {
      return null;
    }
    return finalizeText(text, 'pdf', upload.fileName);
  } catch (error: any) {
    throw new FileParseFailedError(`PDF 解析失败: ${error.message || error}`);
  }
}
```

- [ ] **Step 4: Run tests and typecheck**

Run:

```bash
npm run test:files
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add src/server/files/textExtractors.ts tests/fixtures/resume.txt tests/files/textExtractors.test.ts tests/files/run-tests.ts
git commit -m "feat: extract resume text from text documents"
```

---

### Task 3: Local OCR Provider and Service with Mockable Tests

**Files:**
- Create: `src/server/files/ocr/localOcrProvider.ts`
- Create: `src/server/files/ocr/ocrService.ts`
- Create: `tests/files/ocrService.test.ts`
- Modify: `tests/files/run-tests.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: `OcrProvider`
- Produces: `createLocalOcrProvider(): OcrProvider`
- Produces: `createOcrService(provider?: OcrProvider): { extractImageText(buffer, mimeType): Promise<string> }`
- Produces: `defaultOcrService`

- [ ] **Step 1: Install local OCR dependency**

Run:

```bash
npm install tesseract.js
```

Expected: `package.json` and `package-lock.json` include `tesseract.js`.

- [ ] **Step 2: Write OCR service tests with a fake provider**

Create `tests/files/ocrService.test.ts`:

```ts
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
```

Update `tests/files/run-tests.ts`:

```ts
import './validation.test';
import './textExtractors.test';
import './ocrService.test';
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
npm run test:files
```

Expected: FAIL because `ocrService.ts` does not exist.

- [ ] **Step 4: Implement local OCR provider**

Create `src/server/files/ocr/localOcrProvider.ts`:

```ts
import { createWorker } from 'tesseract.js';
import type { OcrProvider } from '../types';

export function createLocalOcrProvider(): OcrProvider {
  return {
    name: 'local',
    async extractTextFromImage(buffer: Buffer, mimeType: string): Promise<string> {
      const worker = await createWorker('chi_sim+eng');
      try {
        const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
        const result = await worker.recognize(dataUrl);
        return result.data.text || '';
      } finally {
        await worker.terminate();
      }
    },
  };
}
```

- [ ] **Step 5: Implement OCR service**

Create `src/server/files/ocr/ocrService.ts`:

```ts
import { EmptyExtractedTextError } from '../errors';
import type { OcrProvider } from '../types';
import { createLocalOcrProvider } from './localOcrProvider';

export function createOcrService(provider: OcrProvider = createLocalOcrProvider()) {
  return {
    async extractImageText(buffer: Buffer, mimeType: string): Promise<string> {
      const text = await provider.extractTextFromImage(buffer, mimeType);
      if (!text.trim()) {
        throw new EmptyExtractedTextError('OCR 未识别到有效文字，请上传更清晰的图片或改为粘贴简历文本。');
      }
      return text.trim();
    },
  };
}

export const defaultOcrService = createOcrService();
```

- [ ] **Step 6: Run OCR tests and typecheck**

Run:

```bash
npm run test:files
npm run typecheck
```

Expected: PASS. These tests must not invoke real OCR.

- [ ] **Step 7: Commit Task 3**

```bash
git add package.json package-lock.json src/server/files/ocr/localOcrProvider.ts src/server/files/ocr/ocrService.ts tests/files/ocrService.test.ts tests/files/run-tests.ts
git commit -m "feat: add local OCR provider"
```

---

### Task 4: Scanned PDF Page Conversion Interface

**Files:**
- Create: `src/server/files/ocr/pdfToImages.ts`
- Create: `tests/files/pdfToImages.test.ts`
- Modify: `tests/files/run-tests.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Produces: `PdfPageImage = { buffer: Buffer; mimeType: 'image/png'; pageNumber: number }`
- Produces: `convertPdfToPageImages(pdfBuffer: Buffer, options?: { maxPages?: number }): Promise<PdfPageImage[]>`

- [ ] **Step 1: Install PDF rendering dependencies**

Run:

```bash
npm install pdfjs-dist canvas
```

Expected: dependencies are added. If `canvas` install fails on Windows, stop and report the native dependency failure. Do not silently replace scanned PDF support with a fake implementation.

- [ ] **Step 2: Write interface tests for options and empty PDF behavior**

Create `tests/files/pdfToImages.test.ts`:

```ts
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
```

Update `tests/files/run-tests.ts` to import `pdfToImages.test`.

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
npm run test:files
```

Expected: FAIL because `pdfToImages.ts` does not exist.

- [ ] **Step 4: Implement PDF page limit and converter**

Create `src/server/files/ocr/pdfToImages.ts`:

```ts
import { createCanvas } from 'canvas';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { FileParseFailedError } from '../errors';
import { MAX_PDF_OCR_PAGES } from '../validation';

export interface PdfPageImage {
  buffer: Buffer;
  mimeType: 'image/png';
  pageNumber: number;
}

export function normalizePdfPageLimit(maxPages?: number): number {
  if (maxPages === undefined) return MAX_PDF_OCR_PAGES;
  if (!Number.isInteger(maxPages) || maxPages < 1) {
    throw new Error('PDF OCR 页数必须至少为 1');
  }
  return Math.min(maxPages, MAX_PDF_OCR_PAGES);
}

export async function convertPdfToPageImages(
  pdfBuffer: Buffer,
  options: { maxPages?: number } = {}
): Promise<PdfPageImage[]> {
  const maxPages = normalizePdfPageLimit(options.maxPages);

  try {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) });
    const pdf = await loadingTask.promise;
    const pageCount = Math.min(pdf.numPages, maxPages);
    const images: PdfPageImage[] = [];

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');

      await page.render({ canvasContext: context as any, viewport }).promise;
      images.push({
        buffer: canvas.toBuffer('image/png'),
        mimeType: 'image/png',
        pageNumber,
      });
    }

    if (images.length === 0) {
      throw new FileParseFailedError('PDF 未包含可用于 OCR 的页面。');
    }

    return images;
  } catch (error: any) {
    if (error instanceof FileParseFailedError) throw error;
    throw new FileParseFailedError(`扫描 PDF 转图片失败: ${error.message || error}`);
  }
}
```

- [ ] **Step 5: Run file tests and typecheck**

Run:

```bash
npm run test:files
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit Task 4**

```bash
git add package.json package-lock.json src/server/files/ocr/pdfToImages.ts tests/files/pdfToImages.test.ts tests/files/run-tests.ts
git commit -m "feat: convert scanned PDF pages for OCR"
```

---

### Task 5: File Parse Service Orchestration

**Files:**
- Create: `src/server/files/fileParseService.ts`
- Create: `tests/files/fileParseService.test.ts`
- Modify: `tests/files/run-tests.ts`
- Modify: `src/server/ai/types.ts`

**Interfaces:**
- Consumes: `normalizeUpload`, `extractTextFromTxt`, `extractTextFromDocx`, `extractTextFromPdf`, `defaultOcrService`, `convertPdfToPageImages`
- Produces: `parseUploadedResumeText(input: UploadedFileInput, deps?: FileParseDeps): Promise<ExtractedResumeText>`
- Updates: `ResumeParseInput.sourceType` includes `'image' | 'ocr-pdf'`

- [ ] **Step 1: Update AI source type**

In `src/server/ai/types.ts`, update `ResumeParseInput.sourceType` to:

```ts
sourceType: 'text' | 'pdf' | 'docx' | 'txt' | 'image' | 'ocr-pdf';
```

- [ ] **Step 2: Write orchestration tests**

Create `tests/files/fileParseService.test.ts`:

```ts
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
```

Update `tests/files/run-tests.ts` to import `fileParseService.test`.

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
npm run test:files
```

Expected: FAIL because `fileParseService.ts` does not exist.

- [ ] **Step 4: Implement parse service**

Create `src/server/files/fileParseService.ts`:

```ts
import { EmptyExtractedTextError } from './errors';
import { defaultOcrService } from './ocr/ocrService';
import { convertPdfToPageImages, type PdfPageImage } from './ocr/pdfToImages';
import { extractTextFromDocx, extractTextFromPdf, extractTextFromTxt, type PdfParser, truncateForAi } from './textExtractors';
import type { ExtractedResumeText, UploadedFileInput } from './types';
import { normalizeUpload } from './validation';

interface OcrServiceLike {
  extractImageText(buffer: Buffer, mimeType: string): Promise<string>;
}

export interface FileParseDeps {
  pdfParser?: PdfParser;
  pdfToImages?: (buffer: Buffer, options?: { maxPages?: number }) => Promise<PdfPageImage[]>;
  ocrService?: OcrServiceLike;
}

function finalizeOcrText(text: string, sourceType: ExtractedResumeText['sourceType'], fileName?: string, warnings: string[] = []): ExtractedResumeText {
  if (!text.trim()) {
    throw new EmptyExtractedTextError();
  }
  const truncated = truncateForAi(text.trim());
  return {
    text: truncated.text,
    sourceType,
    fileName,
    warnings: truncated.truncated ? [...warnings, '文本超过 20,000 字符，已截断后发送给 AI。'] : warnings,
  };
}

export async function parseUploadedResumeText(input: UploadedFileInput, deps: FileParseDeps = {}): Promise<ExtractedResumeText> {
  const upload = normalizeUpload(input);
  const ocrService = deps.ocrService || defaultOcrService;

  if (upload.sourceType === 'txt') {
    return extractTextFromTxt(upload);
  }

  if (upload.sourceType === 'docx') {
    return extractTextFromDocx(upload);
  }

  if (upload.sourceType === 'image') {
    const text = await ocrService.extractImageText(upload.buffer, upload.mimeType);
    return finalizeOcrText(text, 'image', upload.fileName);
  }

  if (upload.sourceType === 'pdf') {
    const textPdf = await extractTextFromPdf(upload, deps.pdfParser);
    if (textPdf) {
      return textPdf;
    }

    const pages = await (deps.pdfToImages || convertPdfToPageImages)(upload.buffer);
    const pageTexts: string[] = [];
    for (const page of pages) {
      const pageText = await ocrService.extractImageText(page.buffer, page.mimeType);
      if (pageText.trim()) {
        pageTexts.push(pageText.trim());
      }
    }

    return finalizeOcrText(pageTexts.join('\n\n'), 'ocr-pdf', upload.fileName, [
      `PDF 未提取到文字，已对前 ${pages.length} 页执行本地 OCR。`,
    ]);
  }

  throw new EmptyExtractedTextError();
}
```

- [ ] **Step 5: Run tests and typecheck**

Run:

```bash
npm run test:files
npm run test:ai
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit Task 5**

```bash
git add src/server/files/fileParseService.ts src/server/ai/types.ts tests/files/fileParseService.test.ts tests/files/run-tests.ts
git commit -m "feat: orchestrate resume file parsing"
```

---

### Task 6: Integrate File Parse Service into Resume API

**Files:**
- Modify: `server.ts`
- Modify: `src/components/ResumeUploadPage.tsx`

**Interfaces:**
- Consumes: `parseUploadedResumeText(input)`
- Consumes: `toHttpFileError(error)`
- Produces: `/api/parse-resume` supports TXT, DOCX, text PDF, image OCR, and scanned PDF OCR.

- [ ] **Step 1: Replace inline server extraction**

In `server.ts`, remove direct `mammoth`, `pdf-parse`, `createRequire`, `ResumeParseInput`, and `sourceTypeFromUpload` usage.

Add:

```ts
import { parseUploadedResumeText } from "./src/server/files/fileParseService";
import { toHttpFileError } from "./src/server/files/errors";
```

Keep text-paste path separate:

```ts
if (text && typeof text === "string" && text.trim()) {
  extracted = { text: text.trim(), sourceType: "text", fileName: "粘贴的简历文本.txt", warnings: [] };
} else if (fileData) {
  extracted = await parseUploadedResumeText({ fileData, mimeType, fileName });
} else {
  return res.status(400).json({ error: "请提供有效的简历文本或文件内容" });
}
```

Call AI with:

```ts
const parsed = await defaultAiService.parseResume({
  extractedText: extracted.text,
  fileName: extracted.fileName,
  sourceType: extracted.sourceType,
});
return res.json({ ...parsed, _warnings: extracted.warnings });
```

If file parsing throws:

```ts
const httpError = toHttpFileError(error);
return res.status(httpError.status).json(httpError.body);
```

If AI parsing throws, keep `toHttpAiError` behavior.

- [ ] **Step 2: Add frontend file size and format guard**

In `ResumeUploadPage.tsx`, add constants near component state:

```ts
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = ['txt', 'pdf', 'docx', 'png', 'jpg', 'jpeg', 'webp'];
```

At start of `handleFileChange`, after checking `file`, add:

```ts
const ext = file.name.split('.').pop()?.toLowerCase() || '';
if (!SUPPORTED_EXTENSIONS.includes(ext)) {
  setApiParseError('不支持的文件格式。请上传 PDF、DOCX、TXT、JPG、PNG 或 WebP。');
  return;
}
if (file.size > MAX_UPLOAD_BYTES) {
  setApiParseError('文件超过 8MB 限制，请压缩后重新上传。');
  return;
}
```

- [ ] **Step 3: Update upload copy**

Replace `.doc` in accepted formats with supported formats only:

```tsx
<span className="text-xs text-slate-400 block mb-2">支持 .txt / .pdf / .docx / .png / .jpg / .webp，单文件不超过 8MB</span>
```

Update OCR hint:

```tsx
<span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 block max-w-xs mx-auto font-medium">
  💡 PDF/DOCX 会先提取文本；图片和扫描版 PDF 会使用本地 OCR 识别后再交给 AI 解析。
</span>
```

Update file input accept:

```tsx
accept=".txt,.pdf,.docx,.png,.jpg,.jpeg,.webp"
```

- [ ] **Step 4: Extend frontend error parsing for file errors**

In `parseApiError`, handle:

```ts
if (body?.code === 'UNSUPPORTED_FILE_TYPE' || body?.code === 'FILE_TOO_LARGE' || body?.code === 'EMPTY_EXTRACTED_TEXT' || body?.code === 'FILE_PARSE_FAILED') {
  return body.error || '文件解析失败，请检查文件格式和清晰度。';
}
```

Remove `OCR_NOT_IMPLEMENTED` handling because OCR is now implemented.

- [ ] **Step 5: Run checks**

Run:

```bash
npm run test:files
npm run test:ai
npm run typecheck
npm run build
```

Expected: PASS.

- [ ] **Step 6: Smoke test missing AI key still works after file parsing**

Start server with HMR disabled:

```bash
DISABLE_HMR=true npm run dev
```

Run:

```bash
curl -sS -X POST http://localhost:3000/api/parse-resume \
  -H "Content-Type: application/json" \
  -d '{"text":"张三，南京大学软件工程，熟悉 TypeScript。"}'
```

Expected includes:

```json
{"code":"AI_CONFIGURATION_MISSING"}
```

- [ ] **Step 7: Commit Task 6**

```bash
git add server.ts src/components/ResumeUploadPage.tsx
git commit -m "feat: parse uploaded resume files before AI"
```

---

### Task 7: Documentation, Env, and Final Verification

**Files:**
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-08-05-careermatch-launch-ready-refactor-design.md` if implementation decisions differ from the design.

**Interfaces:**
- Consumes: all previous file parse/OCR outputs.
- Produces: documented local OCR setup and verified implementation.

- [ ] **Step 1: Update `.env.example`**

Add:

```env
# OCR Provider: 第一版使用本地 OCR，不调用第三方 OCR 服务。
OCR_PROVIDER="local"
```

- [ ] **Step 2: Update README file support section**

Update resume parsing docs to state:

```md
- 支持 `.pdf`、`.docx`、`.txt`、`.jpg`、`.png`、`.webp`。
- 单文件最大 8MB。
- 文本 PDF 和 DOCX 会先在后端本地提取文字。
- 图片简历和扫描版 PDF 会使用本地 OCR 识别文字，再交给智谱/DeepSeek 结构化。
- 扫描 PDF 第一版默认处理前 3 页。
- OCR 和 AI 都失败时，系统会给出真实错误提示，不会生成模拟简历。
```

Add a note that local OCR may download/use language data on first run and may be slower than plain text extraction.

- [ ] **Step 3: Run final checks**

Run:

```bash
npm run test:files
npm run test:ai
npm run typecheck
npm run build
```

Expected: PASS. Build warnings for existing large chunks may remain but build must succeed.

- [ ] **Step 4: Run runtime smoke tests**

Start:

```bash
DISABLE_HMR=true npm run dev
```

Health:

```bash
curl -sS http://localhost:3000/api/health
```

Expected:

```json
{"status":"ok","mode":"development"}
```

Text parse missing-key:

```bash
curl -sS -X POST http://localhost:3000/api/parse-resume \
  -H "Content-Type: application/json" \
  -d '{"text":"张三，南京大学软件工程，熟悉 TypeScript。"}'
```

Expected includes:

```json
{"code":"AI_CONFIGURATION_MISSING"}
```

Unsupported file:

```bash
curl -sS -X POST http://localhost:3000/api/parse-resume \
  -H "Content-Type: application/json" \
  -d '{"fileName":"resume.doc","mimeType":"application/msword","fileData":"ZmFrZQ=="}'
```

Expected includes:

```json
{"code":"UNSUPPORTED_FILE_TYPE"}
```

- [ ] **Step 5: Commit docs and env**

```bash
git add .env.example README.md docs/superpowers/specs/2026-08-05-careermatch-launch-ready-refactor-design.md
git commit -m "docs: document local OCR resume parsing"
```

If the design doc did not need changes, omit it from `git add`.

- [ ] **Step 6: Final git status**

Run:

```bash
git status --short
```

Expected: clean working tree.

---

## Self-Review Notes

- Spec coverage: This plan covers the file parsing/OCR slice of the approved design: PDF/DOCX/TXT/images/WebP, 8MB limit, 20,000 character cap, first-3-page scanned PDF OCR, local OCR provider first, honest parsing errors, upload copy updates, docs/env updates, and verification. PostgreSQL, auth, UI redesign, PDF reports, and Docker remain later plans.
- Placeholder scan: This plan has no open-ended implementation placeholders. The only conditional stop is the native `canvas` install failure, which is a real environment blocker and must be reported.
- Type consistency: `FileSourceType`, `UploadedFileInput`, `NormalizedUpload`, `ExtractedResumeText`, `OcrProvider`, and `parseUploadedResumeText()` are defined before use and consumed consistently by later tasks.
