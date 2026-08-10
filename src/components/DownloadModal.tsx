import { useState } from 'react';
import { AlertCircle, FileDown, Loader2, X } from 'lucide-react';
import { api } from '../lib/apiClient';

interface DownloadModalProps {
  positionId: string | null;
  onClose: () => void;
}

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string };

export default function DownloadModal({ positionId, onClose }: DownloadModalProps) {
  const [state, setState] = useState<State>({ kind: 'idle' });

  async function handleExport() {
    if (!positionId || state.kind === 'loading') return;
    setState({ kind: 'loading' });
    try {
      const blob = await api.exportPositionReport(positionId);
      // Trigger a real browser download. This only happens after the server confirms the PDF body.
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = extractFileName(blob) || '岗位诊断报告.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      onClose();
    } catch (err: any) {
      setState({ kind: 'error', message: err?.message || '导出失败,请稍后重试。' });
    }
  }

  const disabled = !positionId || state.kind === 'loading';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={state.kind === 'loading' ? undefined : onClose} className="absolute inset-0 bg-career-ink/40 backdrop-blur-xs transition-opacity" />

      <div className="relative z-10 w-full max-w-md rounded-lg border border-career-line bg-career-surface p-6 shadow-lg sm:p-8">
        <button onClick={onClose} disabled={state.kind === 'loading'} className="absolute right-5 top-5 rounded-full p-1.5 text-career-muted transition-colors hover:bg-career-surface-muted hover:text-career-ink disabled:opacity-50">
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-md bg-career-warning-soft p-2 text-career-warning">
            <FileDown className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-semibold text-career-ink">导出 PDF 诊断报告</h3>
        </div>

        {!positionId ? (
          <p className="text-sm leading-6 text-career-muted">请先进入岗位诊断报告页再导出。</p>
        ) : state.kind === 'error' ? (
          <div className="flex items-start gap-2 rounded-md bg-career-danger-soft p-3 text-sm text-career-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="leading-6">{state.message}</span>
          </div>
        ) : (
          <p className="text-sm leading-6 text-career-muted">
            将基于你最新的简历、职业测评和岗位匹配结果生成自包含 PDF 报告。如果还没生成匹配结果,请先打开岗位诊断页。
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} disabled={state.kind === 'loading'} className="rounded-md border border-career-line bg-career-surface px-4 py-2 text-sm font-semibold text-career-ink transition-colors hover:bg-career-surface-muted disabled:opacity-50">
            {state.kind === 'error' ? '取消' : '关闭'}
          </button>
          <button
            onClick={handleExport}
            disabled={disabled}
            className="flex items-center gap-1.5 rounded-md bg-career-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {state.kind === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            {state.kind === 'loading' ? '生成中…' : state.kind === 'error' ? '重试' : '生成 PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}

// The server sets Content-Disposition with the real filename; fetch/Blob doesn't expose headers
// on the blob helper, so fall back to a generic name. (The download attribute is a hint only.)
function extractFileName(_blob: Blob): string | null {
  return null;
}
