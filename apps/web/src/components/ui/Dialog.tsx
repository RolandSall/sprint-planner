import React, { useEffect } from 'react';
import { Card } from './Card';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  maxWidth?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Dialog({ open, onClose, title, maxWidth = 'md', children }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-200 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        <div
          className={`w-full ${widths[maxWidth]} transition-transform duration-200 ${open ? 'translate-y-0 scale-100' : '-translate-y-4 scale-95'}`}
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <Card className="p-6 flex flex-col gap-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-on-surface">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="text-on-surface-muted hover:text-on-surface text-xl font-light leading-none"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            {children}
          </Card>
        </div>
      </div>
    </>
  );
}
