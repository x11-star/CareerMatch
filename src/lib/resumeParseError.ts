export class ResumeParseUserError extends Error {}
export function resumeParseErrorMessage(code: unknown, status: number): string {
  switch (code) {
    case 'AI_CONFIGURATION_MISSING': return '自动读取暂时不可用。你可以先手动填写简历信息，继续查看职业推荐。';
    case 'FILE_TOO_LARGE': return '文件超过 8MB。请压缩后重新上传，或直接粘贴简历文字。';
    case 'UNSUPPORTED_FILE_TYPE': return '这个文件格式暂不支持。请上传 PDF、Word（DOCX）、TXT 或图片。';
    case 'EMPTY_EXTRACTED_TEXT': return '没有读到简历文字。请换一份清晰的文件，或直接粘贴文字。';
    case 'FILE_PARSE_FAILED': return '没能读取这份文件。请重新导出后上传，或直接粘贴简历文字。';
    case 'AI_PROVIDER_FAILED':
    case 'AI_RESPONSE_INVALID': return '暂时没能整理好简历信息。请重试一次，也可以先手动填写。';
  }
  if (status === 413) return resumeParseErrorMessage('FILE_TOO_LARGE', status);
  if (status === 429) return '尝试次数有点多，请稍等片刻再试。';
  return '暂时没能读取简历。请稍后重试，或先手动填写简历信息。';
}
