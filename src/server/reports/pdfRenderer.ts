import { chromium } from 'playwright';
import { PdfRenderError } from './reportErrors';

// Cap concurrent Chromium renders so a burst of exports cannot OOM the process. v1 keeps no
// browser pool (per spec §15), but an unbounded launch is a denial-of-service vector; this
// simple semaphore bounds memory by serializing beyond MAX_CONCURRENT_RENDERS.
const MAX_CONCURRENT_RENDERS = 2;
let activeRenders = 0;
const waiters: Array<() => void> = [];

async function acquireSlot(): Promise<void> {
  if (activeRenders < MAX_CONCURRENT_RENDERS) {
    activeRenders += 1;
    return;
  }
  await new Promise<void>((resolve) => waiters.push(resolve));
  activeRenders += 1;
}

function releaseSlot(): void {
  activeRenders -= 1;
  const next = waiters.shift();
  if (next) next();
}

// Renders a self-contained HTML string to a PDF Buffer via headless Chromium.
// The browser is launched and closed per call (sync v1, no pool). A 30s timeout guards against
// a hung launch, setContent, AND page.pdf (page.pdf's PdfOptions has no timeout field, so we
// race it against a timer whose handle is cleared on settle to avoid an unhandled rejection).
// Any launch/render failure is normalized to PdfRenderError so the service layer can map it
// to HTTP 502.
export async function renderPdf(
  html: string,
  options: { timeoutMs?: number } = {},
): Promise<Buffer> {
  const timeoutMs = options.timeoutMs ?? 30000;
  await acquireSlot();
  let browser;
  try {
    browser = await chromium.launch({ timeout: timeoutMs });
  } catch (error) {
    releaseSlot();
    throw new PdfRenderError(`浏览器启动失败:${describe(error)}`);
  }
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load', timeout: timeoutMs });
    // page.pdf() has no timeout option of its own; race it against a timer. The timer is cleared
    // once the race settles so the losing side cannot fire an unhandled rejection later.
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const pdf = await Promise.race([
        page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' },
        }),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => reject(new Error('PDF 渲染超时')), timeoutMs);
        }),
      ]);
      return Buffer.from(pdf);
    } finally {
      if (timer) clearTimeout(timer);
    }
  } catch (error) {
    throw new PdfRenderError(`PDF 渲染失败:${describe(error)}`);
  } finally {
    await browser.close().catch(() => {});
    releaseSlot();
  }
}

function describe(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export type PdfRenderer = typeof renderPdf;
