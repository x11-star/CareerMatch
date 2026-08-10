import { chromium } from 'playwright';
import { PdfRenderError } from './reportErrors';

// Renders a self-contained HTML string to a PDF Buffer via headless Chromium.
// The browser is launched and closed per call (sync v1, no pool). A 30s timeout guards against
// a hung render. Any launch/render failure is normalized to PdfRenderError so the service layer
// can map it to HTTP 502.
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
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' },
    });
    return Buffer.from(pdf);
  } catch (error) {
    throw new PdfRenderError(`PDF 渲染失败:${describe(error)}`);
  } finally {
    await browser.close().catch(() => {});
  }
}

function describe(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export type PdfRenderer = typeof renderPdf;
