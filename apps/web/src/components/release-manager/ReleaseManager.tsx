import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { PiReleaseProjection } from '@org/shared-types';
import { api } from '../../lib/api-client';

const inputCls = 'bg-surface border border-border rounded px-2 py-1 text-xs text-on-surface placeholder:text-on-surface-subtle focus:outline-none focus:ring-1 focus:ring-accent min-w-0';
const iconBtnCls = 'shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-surface-raised transition-colors text-xs';

interface ReleaseManagerProps {
  piId: string;
  releases: PiReleaseProjection[];
  open: boolean;
  onClose: () => void;
}

function ReleaseRow({ release, piId }: { release: PiReleaseProjection; piId: string }) {
  const qc = useQueryClient();
  const [name, setName] = useState(release.name);
  const [date, setDate] = useState(release.date);
  const dirty = name !== release.name || date !== release.date;

  const update = useMutation({
    mutationFn: () => api.updatePiRelease(release.id, { name, date }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board', piId] }),
  });

  const remove = useMutation({
    mutationFn: () => api.deletePiRelease(release.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board', piId] }),
  });

  useEffect(() => { setName(release.name); setDate(release.date); }, [release.name, release.date]);

  return (
    <div className="flex items-center gap-1.5 p-1.5 rounded bg-surface-raised">
      <input
        className={`${inputCls} flex-1`}
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Name"
      />
      <input
        type="date"
        className={`${inputCls} w-[7.5rem]`}
        value={date}
        onChange={e => setDate(e.target.value)}
      />
      <button
        onClick={() => update.mutate()}
        disabled={!dirty || update.isPending || !name.trim()}
        className={`${iconBtnCls} text-accent disabled:opacity-30`}
        title="Save"
      >
        &#10003;
      </button>
      <button
        onClick={() => remove.mutate()}
        disabled={remove.isPending}
        className={`${iconBtnCls} text-danger-fg disabled:opacity-30`}
        title="Delete"
      >
        &times;
      </button>
    </div>
  );
}

export function ReleaseManager({ piId, releases, open, onClose }: ReleaseManagerProps) {
  const qc = useQueryClient();
  const ref = useRef<HTMLDivElement>(null);
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState('');

  const create = useMutation({
    mutationFn: () => api.createPiRelease({ piId, name: newName, date: newDate }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board', piId] });
      setNewName('');
      setNewDate('');
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
      className="absolute top-full right-0 mt-1 z-50 bg-surface border border-border rounded-lg shadow-lg p-3"
      style={{ width: '22rem' }}
    >
      <h3 className="text-xs font-semibold text-on-surface mb-2">Manage Releases</h3>

      {releases.length === 0 && (
        <p className="text-xs text-on-surface-muted mb-2">No releases yet.</p>
      )}

      <div className="flex flex-col gap-1.5 mb-3">
        {releases.map(r => (
          <ReleaseRow key={r.id} release={r} piId={piId} />
        ))}
      </div>

      <div className="border-t border-border pt-2">
        <p className="text-xs text-on-surface-muted mb-1">Add release</p>
        <div className="flex items-center gap-1.5">
          <input
            className={`${inputCls} flex-1`}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Name"
          />
          <input
            type="date"
            className={`${inputCls} w-[7.5rem]`}
            value={newDate}
            onChange={e => setNewDate(e.target.value)}
          />
          <button
            onClick={() => create.mutate()}
            disabled={create.isPending || !newName.trim() || !newDate}
            className={`${iconBtnCls} bg-accent text-accent-fg disabled:opacity-30 rounded`}
            title="Add"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
