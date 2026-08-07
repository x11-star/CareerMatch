import React from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  meta?: React.ReactNode;
}

export default function PageHeader({ eyebrow, title, description, primaryAction, secondaryAction, meta }: PageHeaderProps) {
  return (
    <header className="mb-8 border-b border-career-line/80 pb-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          {eyebrow && <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-career-primary uppercase">{eyebrow}</p>}
          <h1 className="text-3xl font-semibold tracking-tight text-career-ink sm:text-4xl">{title}</h1>
          {description && <p className="mt-3 max-w-2xl text-sm leading-6 text-career-muted sm:text-base">{description}</p>}
          {meta && <div className="mt-4">{meta}</div>}
        </div>
        {(primaryAction || secondaryAction) && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {secondaryAction}
            {primaryAction}
          </div>
        )}
      </div>
    </header>
  );
}
