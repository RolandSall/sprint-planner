import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { StoryProjection, FeatureProjection, SprintProjection } from '@org/shared-types';
import { featureBadgeStyle, resolveFeatureHex } from '../../lib/colors';
import { api } from '../../lib/api-client';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface StoryDrawerProps {
  story: StoryProjection | null;
  allStories: StoryProjection[];
  features: FeatureProjection[];
  sprints: SprintProjection[];
  piId: string;
  sprintName?: string;
  onClose: () => void;
}

export function StoryDrawer({ story, allStories, features, sprints, piId, sprintName, onClose }: StoryDrawerProps) {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editEstimation, setEditEstimation] = useState('');
  const [editExternalDep, setEditExternalDep] = useState('');
  const [editDependsOn, setEditDependsOn] = useState<string[]>([]);
  const [editSprintId, setEditSprintId] = useState<string>('');
  const [depSearch, setDepSearch] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Reset edit mode whenever the drawer opens with a new story
  useEffect(() => {
    setEditing(false);
    setDepSearch('');
  }, [story?.id]);

  const moveMutation = useMutation({
    mutationFn: (targetSprintId: string | null) =>
      api.moveStory({ storyId: story!.id, targetSprintId, force: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board', piId] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ title, estimation, externalDependencySprint, dependsOnStoryIds }: { title: string; estimation: number; externalDependencySprint: number | null; dependsOnStoryIds: string[] }) =>
      api.updateStory(story!.id, { title, estimation, externalDependencySprint, dependsOnStoryIds }),
    onSuccess: async () => {
      // If sprint changed, move the story (force=true skips server-side validation)
      const targetSprintId = editSprintId === '' ? null : editSprintId;
      if (story && targetSprintId !== story.sprintId) {
        await moveMutation.mutateAsync(targetSprintId);
      }
      qc.invalidateQueries({ queryKey: ['board', piId] });
      setEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteStory(story!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board'] });
      setShowDeleteConfirm(false);
      onClose();
    },
  });

  const handleEditClick = () => {
    if (!story) return;
    setEditTitle(story.title);
    setEditEstimation(String(story.estimation));
    setEditExternalDep(story.externalDependencySprint != null ? String(story.externalDependencySprint) : '');
    setEditDependsOn([...story.dependsOnStoryIds]);
    setEditSprintId(story.sprintId ?? '');
    setDepSearch('');
    setEditing(true);
  };

  const handleSave = () => {
    updateMutation.mutate({
      title: editTitle,
      estimation: parseFloat(editEstimation),
      externalDependencySprint: editExternalDep ? parseInt(editExternalDep, 10) : null,
      dependsOnStoryIds: editDependsOn,
    });
  };

  const handleCancel = () => {
    setEditing(false);
    setDepSearch('');
  };

  const handleDependsOnToggle = (storyId: string) => {
    setEditDependsOn(prev =>
      prev.includes(storyId) ? prev.filter(id => id !== storyId) : [...prev, storyId]
    );
  };

  const feature = features.find(f => f.id === story?.featureId);
  const depStories = story ? allStories.filter(s => story.dependsOnStoryIds.includes(s.id)) : [];

  // All other stories for the depends-on picker (across all features)
  const otherStories = story ? allStories.filter(s => s.id !== story.id) : [];
  const query = depSearch.trim().toLowerCase();
  const filteredOtherStories = query
    ? otherStories.filter(s =>
        s.externalId.toLowerCase().includes(query) || s.title.toLowerCase().includes(query)
      )
    : otherStories;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-200 ${story ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      {/* Drawer */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border shadow-2xl rounded-t-2xl transition-transform duration-300 ${story ? 'translate-y-0' : 'translate-y-full'}`}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>
        {story && (
          <div className="px-6 pb-8 pt-2 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-on-surface-subtle font-mono">{story.externalId}</span>
                  {!editing && <Badge>{story.estimation} SP</Badge>}
                  {story.externalDependencySprint != null && (
                    <Badge variant="info">Ext S{story.externalDependencySprint}</Badge>
                  )}
                </div>
                {editing ? (
                  <div className="flex flex-col gap-3 mt-2">
                    <Input
                      label="Title"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Story Points"
                        placeholder="e.g. 3, 1.5, 0.5"
                        value={editEstimation}
                        onChange={e => setEditEstimation(e.target.value)}
                      />
                      <div>
                        <p className="text-xs text-on-surface-subtle mb-1">Sprint</p>
                        <select
                          className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                          value={editSprintId}
                          onChange={e => setEditSprintId(e.target.value)}
                        >
                          <option value="">Backlog</option>
                          {sprints.map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.currentLoad}/{s.capacity} SP)</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <Input
                      label="External dependency sprint (optional)"
                      type="number"
                      placeholder="Available after sprint #N"
                      min={1}
                      value={editExternalDep}
                      onChange={e => setEditExternalDep(e.target.value)}
                    />
                    {/* Depends on — searchable across all stories */}
                    <div>
                      <p className="text-xs text-on-surface-subtle mb-1.5">Depends on</p>
                      <Input
                        placeholder="Search by ID or title…"
                        value={depSearch}
                        onChange={e => setDepSearch(e.target.value)}
                      />
                      <div className="max-h-44 overflow-y-auto flex flex-col gap-0.5 border border-border rounded bg-surface-raised mt-1 p-1">
                        {filteredOtherStories.length === 0 ? (
                          <p className="text-xs text-on-surface-subtle p-2 text-center">No stories found.</p>
                        ) : (
                          filteredOtherStories.map(s => {
                            const feat = features.find(f => f.id === s.featureId);
                            return (
                              <label
                                key={s.id}
                                className="flex items-center gap-2 cursor-pointer text-sm text-on-surface hover:bg-surface rounded px-2 py-1 transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={editDependsOn.includes(s.id)}
                                  onChange={() => handleDependsOnToggle(s.id)}
                                  className="accent-primary shrink-0"
                                />
                                <span className="font-mono text-xs text-on-surface-muted shrink-0">{s.externalId}</span>
                                <span className="truncate flex-1">{s.title}</span>
                                {feat && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0" style={featureBadgeStyle(resolveFeatureHex(feat.id, feat.color))}>
                                    {feat.externalId}
                                  </span>
                                )}
                                <Badge className="shrink-0">{s.estimation} SP</Badge>
                              </label>
                            );
                          })
                        )}
                      </div>
                      {editDependsOn.length > 0 && (
                        <p className="text-xs text-on-surface-muted mt-1">{editDependsOn.length} selected</p>
                      )}
                    </div>
                    <div className="flex gap-2 mt-1 justify-end">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={handleSave}
                        disabled={updateMutation.isPending}
                      >
                        {updateMutation.isPending ? 'Saving…' : 'Save'}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleCancel}
                        disabled={updateMutation.isPending}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <h2 className="text-xl font-bold text-on-surface">{story.title}</h2>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                {!editing && (
                  <Button size="sm" variant="secondary" onClick={handleEditClick}>
                    Edit
                  </Button>
                )}
                <button onClick={onClose} className="text-on-surface-subtle hover:text-on-surface text-xl font-light">✕</button>
              </div>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-xs text-on-surface-subtle mb-1">Feature</p>
                {feature ? (
                  <button
                    onClick={() => { onClose(); navigate(`/pi/${piId}/features/${feature.id}`); }}
                    className="text-xs px-2 py-1 rounded border font-medium cursor-pointer hover:opacity-80 transition-opacity"
                    style={featureBadgeStyle(resolveFeatureHex(feature.id, feature.color))}
                  >
                    {feature.title}
                  </button>
                ) : <span className="text-sm text-on-surface-subtle">—</span>}
              </div>
              <div>
                <p className="text-xs text-on-surface-subtle mb-1">Sprint</p>
                <span className="text-sm font-semibold text-on-surface">{sprintName ?? 'Backlog'}</span>
              </div>
              <div>
                <p className="text-xs text-on-surface-subtle mb-1">Estimation</p>
                <span className="text-sm font-semibold text-on-surface">{story.estimation} SP</span>
              </div>
              <div>
                <p className="text-xs text-on-surface-subtle mb-1">External dep</p>
                <span className="text-sm font-semibold text-on-surface">
                  {story.externalDependencySprint != null ? `After Sprint ${story.externalDependencySprint}` : '—'}
                </span>
              </div>
            </div>

            {/* Dependencies */}
            <div className="mb-6">
              <p className="text-xs text-on-surface-subtle mb-2">Depends on {depStories.length > 0 ? `(${depStories.length})` : ''}</p>
              {depStories.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {depStories.map(dep => {
                    const depFeat = features.find(f => f.id === dep.featureId);
                    return (
                      <span key={dep.id} className="flex items-center gap-1.5 text-xs bg-surface-raised border border-border rounded px-2 py-1">
                        <span className="font-mono text-on-surface-muted">{dep.externalId}</span>
                        <span className="text-on-surface">{dep.title}</span>
                        {depFeat && (
                          <span className="text-[10px] px-1 py-0.5 rounded border font-medium" style={featureBadgeStyle(resolveFeatureHex(depFeat.id, depFeat.color))}>
                            {depFeat.externalId}
                          </span>
                        )}
                        <Badge>{dep.estimation} SP</Badge>
                      </span>
                    );
                  })}
                </div>
              ) : (
                <span className="text-sm font-semibold text-on-surface">—</span>
              )}
            </div>

            {/* Footer — Delete */}
            <div className="flex justify-end border-t border-border pt-4 mt-2">
              <Button size="sm" variant="danger" onClick={() => setShowDeleteConfirm(true)} disabled={deleteMutation.isPending}>
                Delete
              </Button>
            </div>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Story"
        message="Delete this story? This cannot be undone."
        confirmLabel="Delete"
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}
