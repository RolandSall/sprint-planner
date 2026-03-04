import React, { useState, useRef, useEffect } from 'react';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchableSelect({ options, value, onChange, placeholder = 'Search…', className = '' }: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel = options.find(o => o.value === value)?.label ?? '';

  const filtered = query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="bg-surface border border-border rounded px-2 py-1 text-xs text-on-surface text-left w-full flex items-center justify-between gap-1 focus:outline-none focus:ring-1 focus:ring-accent min-w-[180px]"
      >
        <span className="truncate">{value ? selectedLabel : placeholder}</span>
        <span className="text-on-surface-subtle shrink-0">▾</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-full min-w-[220px] bg-surface border border-border rounded-lg shadow-lg z-50 flex flex-col">
          <div className="p-1.5">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-surface-sunken border border-border rounded px-2 py-1 text-xs text-on-surface placeholder:text-on-surface-subtle focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <ul className="max-h-48 overflow-y-auto">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-xs text-on-surface-subtle">No matches</li>
            )}
            {filtered.map(o => (
              <li key={o.value}>
                <button
                  type="button"
                  onClick={() => { onChange(o.value); setOpen(false); }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent/10 transition-colors ${
                    o.value === value ? 'bg-accent/10 font-medium text-accent' : 'text-on-surface'
                  }`}
                >
                  {o.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
