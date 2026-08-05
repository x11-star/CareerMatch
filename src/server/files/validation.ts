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
