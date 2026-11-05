export type FileParseErrorCode =
  | 'UNSUPPORTED_FILE_TYPE'
  | 'FILE_TOO_LARGE'
  | 'EMPTY_EXTRACTED_TEXT'
  | 'FILE_PARSE_FAILED';

export class FileParseError extends Error {
  code: FileParseErrorCode;

  constructor(message: string, code: FileParseErrorCode) {
    super(message);
    this.name = 'FileParseError';
    this.code = code;
  }
}

export class UnsupportedFileTypeError extends FileParseError {
  constructor(message = '不支持的文件格式。请上传 PDF、DOCX、TXT、JPG、PNG 或 WebP。') {
    super(message, 'UNSUPPORTED_FILE_TYPE');
    this.name = 'UnsupportedFileTypeError';
  }
}

export class FileTooLargeError extends FileParseError {
  constructor(message = '文件超过 8MB。请压缩后重新上传，或直接粘贴简历文字。') {
    super(message, 'FILE_TOO_LARGE');
    this.name = 'FileTooLargeError';
  }
}

export class EmptyExtractedTextError extends FileParseError {
  constructor(message = '未能从文件中提取到有效文字，请上传更清晰的文件或粘贴简历文本。') {
    super(message, 'EMPTY_EXTRACTED_TEXT');
    this.name = 'EmptyExtractedTextError';
  }
}

export class FileParseFailedError extends FileParseError {
  constructor(message: string) {
    super(message, 'FILE_PARSE_FAILED');
    this.name = 'FileParseFailedError';
  }
}

export function toHttpFileError(error: unknown): {
  status: number;
  body: { error: string; code: FileParseErrorCode | 'UNKNOWN_FILE_ERROR' };
} {
  const messages: Record<FileParseErrorCode, string> = {
    UNSUPPORTED_FILE_TYPE: '这个文件格式暂不支持。请上传 PDF、Word（DOCX）、TXT 或图片。',
    FILE_TOO_LARGE: '文件超过 8MB。请压缩后重新上传，或直接粘贴简历文字。',
    EMPTY_EXTRACTED_TEXT: '没有读到简历文字。请换一份清晰的文件，或直接粘贴文字。',
    FILE_PARSE_FAILED: '没能读取这份文件。请重新导出后上传，或直接粘贴简历文字。',
  };
  if (error instanceof UnsupportedFileTypeError) {
    return { status: 415, body: { error: messages[error.code], code: error.code } };
  }
  if (error instanceof FileTooLargeError) {
    return { status: 413, body: { error: messages[error.code], code: error.code } };
  }
  if (error instanceof Error && (error as any).type === 'entity.too.large') {
    const fileTooLargeError = new FileTooLargeError();
    return { status: 413, body: { error: messages[fileTooLargeError.code], code: fileTooLargeError.code } };
  }
  if (error instanceof FileParseError) {
    return { status: 422, body: { error: messages[error.code], code: error.code } };
  }
  return { status: 500, body: { error: '读取简历时出了点问题。请稍后重试，或先手动填写简历信息。', code: 'UNKNOWN_FILE_ERROR' } };
}
