import { Dialog } from './Dialog';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  variant?: 'danger' | 'primary';
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirm', variant = 'danger',
  isPending = false, onConfirm, onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onCancel} title={title} maxWidth="sm">
      {message && <p className="text-sm text-on-surface-muted -mt-2">{message}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="button" variant={variant} onClick={onConfirm} disabled={isPending}>
          {isPending ? 'Please wait…' : confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
