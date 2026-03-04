import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FeatureProjection, StoryProjection } from '@org/shared-types';
import { api } from '../../lib/api-client';
import { featureBadgeStyle, resolveFeatureHex } from '../../lib/colors';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Dialog } from '../ui/Dialog';

interface CreateStoryDialogProps {
  piId: string;
  features: FeatureProjection[];
  allStories: StoryProjection[];
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  defaultFeatureId?: string;
}

interface FormState {
  featureId: string;
  externalId: string;
  title: string;
  estimation: string;
  externalDependencySprint: string;
  dependsOnStoryIds: string[];
}

const emptyForm: FormState = {
  featureId: '',
  externalId: '',
  title: '',
  estimation: '',
  externalDependencySprint: '',
  dependsOnStoryIds: [],
};

export function CreateStoryDialog({ piId, features, allStories, open, onClose, onCreated, defaultFeatureId }: CreateStoryDialogProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (open) {
      setForm({ ...emptyForm, featureId: defaultFeatureId ?? '' });
      setDepSearch('');
    }
  }, [open, defaultFeatureId]);

  const mutation = useMutation({
    mutationFn: () =>
      api.createStory({
        featureId: form.featureId,
        externalId: form.externalId,
        title: form.title,
        estimation: parseFloat(form.estimation),
        externalDependencySprint: form.externalDependencySprint ? parseInt(form.externalDependencySprint, 10) : null,
        dependsOnStoryIds: form.dependsOnStoryIds,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board', piId] });
      onClose();
      onCreated?.();
    },
  });

  const [depSearch, setDepSearch] = useState('');

  const depQuery = depSearch.trim().toLowerCase();
  const availableStories = allStories.filter(s => {
    if (depQuery) {
      return s.externalId.toLowerCase().includes(depQuery) || s.title.toLowerCase().includes(depQuery);
    }
    return true;
  });

  const handleFeatureChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, featureId: e.target.value }));
  };

  const handleDependsOnToggle = (storyId: string) => {
    setForm(prev => {
      const already = prev.dependsOnStoryIds.includes(storyId);
      return {
        ...prev,
        dependsOnStoryIds: already
          ? prev.dependsOnStoryIds.filter(id => id !== storyId)
          : [...prev.dependsOnStoryIds, storyId],
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  const isLoading = mutation.isPending;

  return (
    <Dialog open={open} onClose={onClose} title="Create Story" maxWidth="md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Feature select — hidden if defaultFeatureId is provided */}
        {defaultFeatureId ? (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-on-surface">Feature</label>
            <div className="bg-surface-raised border border-border rounded px-3 py-2 text-sm text-on-surface-muted">
              {features.find(f => f.id === defaultFeatureId)?.externalId} — {features.find(f => f.id === defaultFeatureId)?.title}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-on-surface">
              Feature <span className="text-danger-fg">*</span>
            </label>
            <select
              className="bg-surface border border-border rounded px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
              value={form.featureId}
              onChange={handleFeatureChange}
              required
              disabled={isLoading}
            >
              <option value="">Select a feature…</option>
              {features.map(f => (
                <option key={f.id} value={f.id}>
                  {f.externalId} – {f.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* External ID */}
        <Input
          label="External ID"
          placeholder="e.g. STORY-42"
          value={form.externalId}
          onChange={e => setForm(prev => ({ ...prev, externalId: e.target.value }))}
          required
          disabled={isLoading}
        />

        {/* Title */}
        <Input
          label="Title"
          placeholder="Story title"
          value={form.title}
          onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
          required
          disabled={isLoading}
        />

        {/* Estimation */}
        <Input
          label="Estimation (Story Points)"
          placeholder="e.g. 3, 1.5, 0.5"
          value={form.estimation}
          onChange={e => setForm(prev => ({ ...prev, estimation: e.target.value }))}
          required
          disabled={isLoading}
        />

        {/* External dependency sprint */}
        <Input
          label="External dependency sprint (optional)"
          type="number"
          placeholder="Available after sprint #N"
          min={1}
          value={form.externalDependencySprint}
          onChange={e => setForm(prev => ({ ...prev, externalDependencySprint: e.target.value }))}
          disabled={isLoading}
        />

        {/* Depends on stories — searchable across ALL stories */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-on-surface">
            Depends on stories
          </label>
          <Input
            placeholder="Search by ID or title…"
            value={depSearch}
            onChange={e => setDepSearch(e.target.value)}
            disabled={isLoading}
          />
          {allStories.length === 0 ? (
            <p className="text-xs text-on-surface-muted">No stories yet.</p>
          ) : (
            <div className="max-h-44 overflow-y-auto border border-border rounded bg-surface-raised flex flex-col mt-1 p-1">
              {availableStories.length === 0 ? (
                <p className="text-xs text-on-surface-subtle p-2 text-center">No stories found.</p>
              ) : (
                availableStories.map(story => {
                  const checked = form.dependsOnStoryIds.includes(story.id);
                  const feat = features.find(f => f.id === story.featureId);
                  return (
                    <label
                      key={story.id}
                      className={`flex items-center gap-2 cursor-pointer text-sm hover:bg-surface rounded px-2 py-1 transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="checkbox"
                        className="accent-accent shrink-0"
                        checked={checked}
                        onChange={() => handleDependsOnToggle(story.id)}
                        disabled={isLoading}
                      />
                      <span className="font-mono text-on-surface-muted text-xs shrink-0">{story.externalId}</span>
                      <span className="truncate flex-1 text-on-surface">{story.title}</span>
                      {feat && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0" style={featureBadgeStyle(resolveFeatureHex(feat.id, feat.color))}>
                          {feat.externalId}
                        </span>
                      )}
                      <Badge className="shrink-0">{story.estimation} SP</Badge>
                    </label>
                  );
                })
              )}
            </div>
          )}
          {form.dependsOnStoryIds.length > 0 && (
            <p className="text-xs text-on-surface-muted mt-1">{form.dependsOnStoryIds.length} selected</p>
          )}
        </div>

        {/* Error */}
        {mutation.isError && (
          <p className="text-xs text-danger-fg">
            {mutation.error instanceof Error ? mutation.error.message : 'Failed to create story.'}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? 'Creating…' : 'Create Story'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
