import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateFeatureApiRequest, PiReleaseProjection } from '@org/shared-types';
import { api } from '../../lib/api-client';
import { FEATURE_COLOR_PRESETS } from '../../lib/colors';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Dialog } from '../ui/Dialog';

interface CreateFeatureDialogProps {
  piId: string;
  releases: PiReleaseProjection[];
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function CreateFeatureDialog({ piId, releases, open, onClose, onCreated }: CreateFeatureDialogProps) {
  const qc = useQueryClient();

  const [externalId, setExternalId] = useState('');
  const [title, setTitle] = useState('');
  const [color, setColor] = useState(FEATURE_COLOR_PRESETS[0]);
  const [releaseId, setReleaseId] = useState('');

  useEffect(() => {
    if (open) {
      setExternalId('');
      setTitle('');
      setColor(FEATURE_COLOR_PRESETS[0]);
      setReleaseId('');
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: (body: CreateFeatureApiRequest) => api.createFeature(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board', piId] });
      onClose();
      onCreated?.();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      piId,
      externalId,
      title,
      color,
      releaseId: releaseId || null,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} title="Create Feature">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="External ID"
          placeholder="e.g. FEAT-123"
          value={externalId}
          onChange={e => setExternalId(e.target.value)}
          required
          autoFocus
          disabled={mutation.isPending}
        />

        <Input
          label="Title"
          placeholder="e.g. User Authentication"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          disabled={mutation.isPending}
        />

        {/* Color picker */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-on-surface">Color</label>
          <div className="flex items-center gap-2 flex-wrap">
            {FEATURE_COLOR_PRESETS.map(preset => (
              <button
                key={preset}
                type="button"
                onClick={() => setColor(preset)}
                className={`w-7 h-7 rounded-full border-2 transition-all ${
                  color === preset ? 'border-on-surface scale-110 ring-2 ring-accent ring-offset-1' : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: preset }}
              />
            ))}
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="w-7 h-7 rounded border border-border cursor-pointer"
              />
              <span className="text-xs text-on-surface-muted">Custom</span>
            </label>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-on-surface-muted">Preview:</span>
            <span
              className="text-xs px-2 py-1 rounded border font-medium"
              style={{ backgroundColor: color + '1A', borderColor: color, color }}
            >
              {externalId || 'FEAT-ID'} — {title || 'Feature Title'}
            </span>
          </div>
        </div>

        {/* Release constraint (optional) */}
        {releases.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-on-surface">Must complete before release (optional)</label>
            <select
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
              value={releaseId}
              onChange={e => setReleaseId(e.target.value)}
              disabled={mutation.isPending}
            >
              <option value="">No constraint</option>
              {releases.map(r => (
                <option key={r.id} value={r.id}>{r.name} ({r.date})</option>
              ))}
            </select>
          </div>
        )}

        {mutation.isError && (
          <p className="text-xs text-danger-fg">
            {mutation.error instanceof Error ? mutation.error.message : 'Something went wrong'}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating…' : 'Create Feature'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
