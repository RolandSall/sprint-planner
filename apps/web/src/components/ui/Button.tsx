import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
}

export function Button({ children, variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
  const variants = {
    primary: 'bg-accent text-accent-fg hover:bg-accent-hover disabled:opacity-50',
    secondary: 'bg-surface-raised text-on-surface border border-border hover:border-accent',
    danger: 'bg-danger-fg text-accent-fg hover:opacity-90',
    ghost: 'bg-transparent text-on-surface-muted hover:bg-surface-raised',
  };
  const sizes = { sm: 'px-2 py-1 text-xs', md: 'px-4 py-2 text-sm' };
  return (
    <button className={`rounded font-medium transition-colors disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
}
