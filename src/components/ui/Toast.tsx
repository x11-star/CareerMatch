import React, { useEffect } from 'react';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';

/**
 * Toast — 轻量内联提示，固定右上角，4s 自动消失。
 * 复用 StatusBanner 的 tone 语义，但定位为 transient（不占文档流）。
 * 尊重 prefers-reduced-motion：进场用 opacity 而非位移，退出即时。
 */
type Tone = 'info' | 'success' | 'warning';

interface ToastProps {
  tone?: Tone;
  title: string;
  description?: string;
  onDismiss: () => void;
  duration?: number;
}

const toneClass: Record<Tone, string> = {
  info: 'border-career-line bg-career-surface text-career-ink',
  success: 'border-career-success/30 bg-career-success-soft text-career-ink',
  warning: 'border-career-warning/30 bg-career-warning-soft text-career-ink',
};

const icons: Record<Tone, React.ReactNode> = {
  info: <Info className="h-4 w-4 text-career-primary" />,
  success: <CheckCircle2 className="h-4 w-4 text-career-success" />,
  warning: <TriangleAlert className="h-4 w-4 text-career-warning" />,
};

export default function Toast({ tone = 'info', title, description, onDismiss, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [onDismiss, duration]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 top-4 z-[60] max-w-sm animate-toast-in"
    >
      <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg ${toneClass[tone]}`}>
        <div className="mt-0.5">{icons[tone]}</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title}</p>
          {description && <p className="mt-1 text-xs leading-5 text-career-muted">{description}</p>}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="关闭提示"
          className="-mr-1 -mt-1 shrink-0 cursor-pointer rounded-lg p-1 text-career-muted hover:text-career-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
