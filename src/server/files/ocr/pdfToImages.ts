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

      await page.render({ canvasContext: context as any, viewport, canvas: canvas as any }).promise;
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
