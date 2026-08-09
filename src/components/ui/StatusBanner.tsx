import React from 'react';
import { AlertCircle, CheckCircle2, Clock3, Info, TriangleAlert } from 'lucide-react';

type Tone = 'info' | 'success' | 'warning' | 'error' | 'pending';

interface StatusBannerProps {
  tone: Tone;
  title: string;
  description: string;
  action?: React.ReactNode;
}

const toneClass: Record<Tone, string> = {
  info: 'border-career-line bg-career-surface-muted text-career-ink',
  success: 'border-career-success/25 bg-career-success-soft text-career-ink',
  warning: 'border-career-warning/30 bg-career-warning-soft text-career-ink',
  error: 'border-career-danger/30 bg-career-danger-soft text-career-ink',
  pending: 'border-career-primary/25 bg-career-primary-soft text-career-ink',
};

const icons: Record<Tone, React.ReactNode> = {
  info: <Info className="h-4 w-4" />,
  success: <CheckCircle2 className="h-4 w-4" />,
  warning: <TriangleAlert className="h-4 w-4" />,
  error: <AlertCircle className="h-4 w-4" />,
  pending: <Clock3 className="h-4 w-4" />,
};

export default function StatusBanner({ tone, title, description, action }: StatusBannerProps) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClass[tone]}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="mt-0.5 text-career-primary">{icons[tone]}</div>
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="mt-1 text-xs leading-5 text-career-muted">{description}</p>
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
