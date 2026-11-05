import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { EmptyExtractedTextError, FileParseFailedError } from './errors';
import type { ExtractedResumeText, NormalizedUpload } from './types';
import { MAX_AI_TEXT_CHARS } from './validation';

// pdf-parse v2 exports a parser class, not the v1 callable default export.
const defaultPdfParser: PdfParser = async buffer => {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try { return await parser.getText(); }
  finally { await parser.destroy(); }
};

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
