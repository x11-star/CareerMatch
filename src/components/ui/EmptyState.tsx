import React from 'react';
import { FileQuestion } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-career-line bg-career-surface-muted px-6 py-8 text-center">
      <FileQuestion className="mx-auto mb-3 h-6 w-6 text-career-muted" />
      <h3 className="text-base font-semibold text-career-ink">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-career-muted">{description}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
