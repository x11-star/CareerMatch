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
