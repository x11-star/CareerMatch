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
