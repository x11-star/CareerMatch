import React from 'react';

interface SectionPanelProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export default function SectionPanel({ title, description, actions, children, className = '' }: SectionPanelProps) {
  return (
    <section className={`rounded-3xl border border-career-line bg-career-surface p-5 shadow-xs sm:p-6 ${className}`}>
      {(title || description || actions) && (
        <div className="mb-5 flex flex-col gap-3 border-b border-career-line/70 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title && <h2 className="text-base font-semibold text-career-ink">{title}</h2>}
            {description && <p className="mt-1 text-xs leading-5 text-career-muted">{description}</p>}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
