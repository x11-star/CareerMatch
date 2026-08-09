import React from 'react';

type Tone = 'neutral' | 'success' | 'warning' | 'error';

interface DiagnosticBlockProps {
  label: string;
  title: string;
  tone?: Tone;
  children: React.ReactNode;
}

const toneClass: Record<Tone, string> = {
  neutral: 'bg-career-surface-muted text-career-ink border-career-line',
  success: 'bg-career-success-soft text-career-ink border-career-success/25',
  warning: 'bg-career-warning-soft text-career-ink border-career-warning/30',
  error: 'bg-career-danger-soft text-career-ink border-career-danger/30',
};

export default function DiagnosticBlock({ label, title, tone = 'neutral', children }: DiagnosticBlockProps) {
  return (
    <section className={`rounded-md border p-3.5 ${toneClass[tone]}`}>
      <p className="text-[10px] font-semibold tracking-[0.16em] text-career-muted uppercase">{label}</p>
      <h3 className="mt-1.5 text-sm font-semibold text-career-ink">{title}</h3>
      <div className="mt-2 text-sm leading-6 text-career-muted">{children}</div>
    </section>
  );
}
