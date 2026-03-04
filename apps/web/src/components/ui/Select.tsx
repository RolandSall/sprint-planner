import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, className = '', ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-on-surface">{label}</label>}
      <select
        className={`bg-surface border border-border rounded px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent ${className}`}
        {...props}
      >
        <option value="">Select…</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
