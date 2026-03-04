import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { label?: string; error?: string }

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-on-surface">{label}</label>}
      <input className={`bg-surface border rounded px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-subtle focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent ${error ? 'border-danger-fg' : 'border-border'} ${className}`} {...props} />
      {error && <span className="text-xs text-danger-fg">{error}</span>}
    </div>
  );
}
