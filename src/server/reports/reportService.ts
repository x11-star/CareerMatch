import { assembleReportData } from './reportData';
import { buildReportHtml } from './reportHtml';
import { renderPdf } from './pdfRenderer';
import type { PdfRenderer } from './pdfRenderer';
import { ReportError } from './reportErrors';
import type { ReportData } from './types';

const MAX_HTML_BYTES = 200 * 1024; // 200KB guard on report HTML input
const MAX_PDF_BYTES = 5 * 1024 * 1024; // 5MB guard on PDF output

export interface ExportReportInput {
  userId: string;
  resume: import('./types').ResumeDataInput | null;
  assessment: import('./types').PersonalityResultInput | null;
  matchResult: import('./types').MatchResult | null;
  position: import('./types').PositionInput;
  positionId: string;
}

export interface ExportReportResult {
  buffer: Buffer;
  fileName: string;
}

export type ReportDataAssembler = typeof assembleReportData;

export interface ReportServiceDeps {
  pdfRenderer?: PdfRenderer;
  dataAssembler?: ReportDataAssembler;
}

export interface ReportService {
  exportPositionReport(input: ExportReportInput): Promise<ExportReportResult>;
}

// fileName: 诊断报告_{company}_{positionId}.pdf, sanitized so company names with slashes/special
// chars cannot break the Content-Disposition header or filesystem writes.
export function sanitizeFileName(company: string, positionId: string): string {
  const safeCompany = company.replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 40) || '岗位';
  const safeId = positionId.replace(/[\\/:*?"<>|]+/g, '').slice(0, 24);
  return `诊断报告_${safeCompany}_${safeId}.pdf`;
}

// Builds a Content-Disposition header value that is safe to pass to Node's res.setHeader, which
// rejects non-ASCII bytes with ERR_INVALID_CHAR. Per RFC 5987 we send filename*=UTF-8''<pct-enc>
// (decoded by parseContentDispositionFileName on the client) plus an ASCII-only filename= fallback
// for older clients. The fallback replaces non-ASCII with '_' so the header stays 7-bit clean.
export function buildContentDisposition(fileName: string): string {
  const asciiFallback = fileName.replace(/[^\x20-\x7E]+/g, '_').replace(/"/g, '');
  const encoded = encodeURIComponent(fileName);
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}

export function createReportService(deps: ReportServiceDeps = {}): ReportService {
  const pdfRenderer = deps.pdfRenderer || renderPdf;
  const dataAssembler = deps.dataAssembler || assembleReportData;

  return {
    async exportPositionReport(input: ExportReportInput): Promise<ExportReportResult> {
      // Data assembly (also throws ResumeMissing/AssessmentMissing/MatchNotCached).
      const reportData = dataAssembler({
        resume: input.resume,
        assessment: input.assessment,
        matchResult: input.matchResult,
        position: input.position,
        userId: input.userId,
      });

      const html = buildReportHtml(reportData);
      if (Buffer.byteLength(html, 'utf8') > MAX_HTML_BYTES) {
        throw new ReportError('REPORT_TOO_LARGE', '报告内容过大,无法生成 PDF');
      }
      const buffer = await pdfRenderer(html);
      // NOTE: this guard runs AFTER rendering, so an oversized report still pays the Chromium
      // render cost before being rejected. The HTML guard (MAX_HTML_BYTES) is the primary bound
      // and catches the common case early; this is a backstop for pathological outputs that
      // render larger than their HTML (e.g. heavy rasterization).
      if (buffer.byteLength > MAX_PDF_BYTES) {
        throw new ReportError('REPORT_TOO_LARGE', '报告内容过大,无法生成 PDF');
      }
      return {
        buffer,
        fileName: sanitizeFileName(reportData.position.company, input.positionId),
      };
    },
  };
}

export const defaultReportService = createReportService();
