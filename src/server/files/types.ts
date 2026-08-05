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
