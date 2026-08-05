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
