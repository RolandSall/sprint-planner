import React from 'react';

interface BadgeProps { children: React.ReactNode; className?: string; variant?: 'default' | 'error' | 'warning' | 'info'; title?: string }

export function Badge({ children, className = '', variant = 'default', title }: BadgeProps) {
  const variants = {
    default: 'bg-surface-raised text-on-surface-muted border-border',
    error: 'bg-danger text-danger-fg border-danger-fg/30',
    warning: 'bg-warning text-warning-fg border-warning-fg/30',
    info: 'bg-accent/10 text-accent border-accent/30',
  };
  return <span title={title} className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${variants[variant]} ${className}`}>{children}</span>;
}
