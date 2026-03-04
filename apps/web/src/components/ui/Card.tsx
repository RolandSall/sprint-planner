import React from 'react';

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-surface rounded-lg border border-border shadow-sm ${className}`}>{children}</div>;
}
