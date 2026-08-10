import { chromium } from 'playwright';
import { PdfRenderError } from './reportErrors';

// Renders a self-contained HTML string to a PDF Buffer via headless Chromium.
// The browser is launched and closed per call (sync v1, no pool). A 30s timeout guards against
// a hung launch, setContent, AND page.pdf (page.pdf's PdfOptions has no timeout field, so we
// race it against a timer). Any launch/render failure is normalized to PdfRenderError so the
// service layer can map it to HTTP 502.
export async function renderPdf(
  html: string,
  options: { timeoutMs?: number } = {},
): Promise<Buffer> {
  const timeoutMs = options.timeoutMs ?? 30000;
  let browser;
  try {
    browser = await chromium.launch({ timeout: timeoutMs });
  } catch (error) {
    throw new PdfRenderError(`浏览器启动失败:${describe(error)}`);
  }
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load', timeout: timeoutMs });
    // page.pdf() has no timeout option of its own; race it so a pathological layout/font loop
    // cannot hang the request indefinitely and leak the per-call browser.
    const pdf = await Promise.race([
      page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' },
      }),
      rejectAfter(timeoutMs, 'PDF 渲染超时'),
    ]);
    return Buffer.from(pdf);
  } catch (error) {
    throw new PdfRenderError(`PDF 渲染失败:${describe(error)}`);
  } finally {
    await browser.close().catch(() => {});
  }
}

function rejectAfter(ms: number, message: string): Promise<never> {
  return new Promise((_resolve, reject) => setTimeout(() => reject(new Error(message)), ms));
}

function describe(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export type PdfRenderer = typeof renderPdf;
