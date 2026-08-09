import { FileDown, X } from 'lucide-react';

interface DownloadModalProps {
  onClose: () => void;
}

export default function DownloadModal({ onClose }: DownloadModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-career-ink/40 backdrop-blur-xs transition-opacity" />

      <div className="relative z-10 w-full max-w-md rounded-lg border border-career-line bg-career-surface p-6 shadow-lg sm:p-8">
        <button onClick={onClose} className="absolute right-5 top-5 rounded-full p-1.5 text-career-muted transition-colors hover:bg-career-surface-muted hover:text-career-ink">
          <X className="h-5 w-5" />
        </button>

        <div>
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-md bg-career-warning-soft p-2 text-career-warning">
              <FileDown className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-career-ink">PDF 报告导出第六阶段开放</h3>
          </div>
          <p className="text-sm leading-6 text-career-muted">
            当前阶段先完成在线诊断报告的可读性和真实状态。PDF 生成会在第六阶段接入真实导出接口后开放。
          </p>
          <div className="mt-6 flex justify-end">
            <button onClick={onClose} className="rounded-md bg-career-primary px-4 py-2 text-sm font-semibold text-white">
              我知道了
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
