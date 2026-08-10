// Normalized report errors. Each carries an actionable message so the HTTP layer can map it
// to the right status + JSON body without knowing about report internals.

export class ReportError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ReportError';
  }
}

export class ResumeMissingError extends ReportError {
  constructor() {
    super('RESUME_MISSING', '请先上传并确认简历后再导出报告');
    this.name = 'ResumeMissingError';
  }
}

export class AssessmentMissingError extends ReportError {
  constructor() {
    super('ASSESSMENT_MISSING', '请先完成职业测评后再导出报告');
    this.name = 'AssessmentMissingError';
  }
}

export class MatchNotCachedError extends ReportError {
  constructor() {
    super('MATCH_NOT_CACHED', '请先打开岗位诊断页生成匹配结果');
    this.name = 'MatchNotCachedError';
  }
}

export class PdfRenderError extends ReportError {
  constructor(detail: string) {
    super('PDF_RENDER_FAILED', `生成 PDF 失败:${detail}`);
    this.name = 'PdfRenderError';
  }
}

export interface HttpReportError {
  status: number;
  body: { code: string; error: string };
}

// Maps a thrown report error to an HTTP response. Missing-data errors are 409 (client can act on
// them by completing the prerequisite step); render failures are 502; unknown errors are 500.
export function toHttpReportError(error: unknown): HttpReportError {
  if (error instanceof ResumeMissingError || error instanceof AssessmentMissingError || error instanceof MatchNotCachedError) {
    return { status: 409, body: { code: error.code, error: error.message } };
  }
  if (error instanceof ReportError) {
    return { status: 502, body: { code: error.code, error: error.message } };
  }
  return { status: 500, body: { code: 'INTERNAL_SERVER_ERROR', error: '服务器暂时不可用' } };
}
