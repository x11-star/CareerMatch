import React from 'react';
import { FileQuestion } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-3xl border border-dashed border-career-line bg-career-surface-muted px-6 py-10 text-center">
      <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-career-surface text-career-primary">
        <FileQuestion className="h-5 w-5" />
      </div>
      <h3 className="text-base font-semibold text-career-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-career-muted">{description}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
