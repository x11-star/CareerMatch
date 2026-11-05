import { useEffect, useRef, type ReactNode } from 'react';

export default function DialogFrame({ titleId, onClose, children, busy = false, wide = false }: { titleId: string; onClose: () => void; children: ReactNode; busy?: boolean; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const panel = ref.current!;
    const controls = () => [...panel.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), textarea, select, [tabindex="0"]')];
    (controls()[0] || panel).focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) { event.preventDefault(); onClose(); }
      if (event.key === 'Tab') {
        const targets = controls();
        const first = targets[0], last = targets.at(-1);
        if (!first) { event.preventDefault(); panel.focus(); }
        else if (!panel.contains(document.activeElement)) { event.preventDefault(); first.focus(); }
        else if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = oldOverflow; previous?.focus(); };
  }, [busy]);
  return <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
    <div onClick={busy ? undefined : onClose} className="absolute inset-0 bg-career-ink/40" />
    <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className={`relative z-10 max-h-[90vh] w-full ${wide ? 'max-w-4xl' : 'max-w-md'} overflow-y-auto rounded-lg border border-career-line bg-career-surface p-6 shadow-lg`}>{children}</div>
  </div>;
}
