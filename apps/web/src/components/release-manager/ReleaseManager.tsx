import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { PiReleaseProjection, SprintProjection } from '@org/shared-types';
import { api } from '../../lib/api-client';

const inputCls = 'bg-surface border border-border rounded px-2 py-1 text-xs text-on-surface placeholder:text-on-surface-subtle focus:outline-none focus:ring-1 focus:ring-accent min-w-0';
const iconBtnCls = 'shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-surface-raised transition-colors text-xs';

interface ReleaseManagerProps {
  piId: string;
  releases: PiReleaseProjection[];
  sprints: SprintProjection[];
  open: boolean;
  onClose: () => void;
}

function ReleaseRow({ release, piId, sprints }: { release: PiReleaseProjection; piId: string; sprints: SprintProjection[] }) {
  const qc = useQueryClient();
  const [name, setName] = useState(release.name);
  const [date, setDate] = useState(release.date);
  const [sprintId, setSprintId] = useState(release.sprintId ?? '');
  const dirty = name !== release.name || date !== release.date || (sprintId || null) !== (release.sprintId ?? null);

  const update = useMutation({
    mutationFn: () => api.updatePiRelease(release.id, { name, date, sprintId: sprintId || null }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board', piId] }),
  });

  const remove = useMutation({
    mutationFn: () => api.deletePiRelease(release.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board', piId] }),
  });

  useEffect(() => { setName(release.name); setDate(release.date); setSprintId(release.sprintId ?? ''); }, [release.name, release.date, release.sprintId]);

  return (
    <div className="flex flex-col gap-1 p-1.5 rounded bg-surface-raised">
      <div className="flex items-center gap-1.5">
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
      <select
        className={`${inputCls} w-full`}
        value={sprintId}
        onChange={e => setSprintId(e.target.value)}
      >
        <option value="">Sprint: auto-detect from date</option>
        {sprints.map(s => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
    </div>
  );
}

export function ReleaseManager({ piId, releases, sprints, open, onClose }: ReleaseManagerProps) {
  const qc = useQueryClient();
  const ref = useRef<HTMLDivElement>(null);
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newSprintId, setNewSprintId] = useState('');

  const create = useMutation({
    mutationFn: () => api.createPiRelease({ piId, name: newName, date: newDate, sprintId: newSprintId || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board', piId] });
      setNewName('');
      setNewDate('');
      setNewSprintId('');
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
      style={{ width: '24rem' }}
    >
      <h3 className="text-xs font-semibold text-on-surface mb-2">Manage Releases</h3>

      {releases.length === 0 && (
        <p className="text-xs text-on-surface-muted mb-2">No releases yet.</p>
      )}

      <div className="flex flex-col gap-1.5 mb-3">
        {releases.map(r => (
          <ReleaseRow key={r.id} release={r} piId={piId} sprints={sprints} />
        ))}
      </div>

      <div className="border-t border-border pt-2">
        <p className="text-xs text-on-surface-muted mb-1">Add release</p>
        <div className="flex flex-col gap-1.5">
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
          <select
            className={`${inputCls} w-full`}
            value={newSprintId}
            onChange={e => setNewSprintId(e.target.value)}
          >
            <option value="">Sprint: auto-detect from date</option>
            {sprints.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
