import { useTheme } from '../../hooks/use-theme';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="w-9 h-9 rounded-full border border-border bg-surface-raised text-on-surface-muted hover:text-on-surface hover:border-accent transition-colors flex items-center justify-center text-base"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
