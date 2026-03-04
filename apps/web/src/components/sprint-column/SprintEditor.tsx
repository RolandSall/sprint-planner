import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { SprintProjection } from '@org/shared-types';
import { api } from '../../lib/api-client';

const inputCls = 'bg-surface border border-border rounded px-2 py-1 text-xs text-on-surface placeholder:text-on-surface-subtle focus:outline-none focus:ring-1 focus:ring-accent min-w-0';

interface SprintEditorProps {
  sprint: SprintProjection;
  piId: string;
  open: boolean;
  onClose: () => void;
}

function addDays(dateStr: string, days: number): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function SprintEditor({ sprint, piId, open, onClose }: SprintEditorProps) {
  const qc = useQueryClient();
  const ref = useRef<HTMLDivElement>(null);

  const [capacity, setCapacity] = useState(String(sprint.capacity));
  const [startDate, setStartDate] = useState(sprint.startDate ?? '');
  const [endDate, setEndDate] = useState(sprint.endDate ?? '');

  // Sync state when sprint data changes externally
  useEffect(() => {
    setCapacity(String(sprint.capacity));
    setStartDate(sprint.startDate ?? '');
    setEndDate(sprint.endDate ?? '');
  }, [sprint.capacity, sprint.startDate, sprint.endDate]);

  const update = useMutation({
    mutationFn: () =>
      api.updateSprint(sprint.id, {
        capacity: Number(capacity),
        startDate: startDate || null,
        endDate: endDate || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board', piId] });
      onClose();
    },
  });

  // Click-outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-1 z-50 bg-surface border border-border rounded-lg shadow-lg p-3"
      style={{ width: '16rem' }}
    >
      <h3 className="text-xs font-semibold text-on-surface mb-2">Edit {sprint.name}</h3>

      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-on-surface-muted">Capacity (SP)</span>
          <input
            type="number"
            className={inputCls}
            value={capacity}
            onChange={e => setCapacity(e.target.value)}
            min={0}
          />
        </label>

        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-on-surface-muted">Start Date</span>
          <input
            type="date"
            className={inputCls}
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-on-surface-muted">End Date</span>
          <div className="flex items-center gap-1">
            <input
              type="date"
              className={`${inputCls} flex-1`}
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
            <button
              onClick={() => { if (startDate) setEndDate(addDays(startDate, 13)); }}
              disabled={!startDate}
              className="shrink-0 px-1.5 py-1 text-[10px] font-semibold rounded border border-border bg-surface-raised text-on-surface-muted hover:bg-accent hover:text-accent-fg disabled:opacity-30 transition-colors"
              title="Set end date to start + 2 weeks"
            >
              2W
            </button>
          </div>
        </label>

        <button
          onClick={() => update.mutate()}
          disabled={update.isPending || !capacity || Number(capacity) < 0}
          className="mt-1 w-full px-2 py-1.5 text-xs font-medium rounded bg-accent text-accent-fg hover:opacity-90 disabled:opacity-30 transition-opacity"
        >
          {update.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
