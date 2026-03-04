import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePiBoard } from '../../hooks/use-pi-board';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { resolveFeatureHex, FEATURE_COLOR_PRESETS } from '../../lib/colors';
import { api } from '../../lib/api-client';
import { CreateStoryDialog } from '../../components/create-story-dialog/CreateStoryDialog';

export function FeatureDetail() {
  const { piId = '', featureId = '' } = useParams<{ piId: string; featureId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: board, isLoading } = usePiBoard(piId);

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editColor, setEditColor] = useState('');
  const [showAddStory, setShowAddStory] = useState(false);
  const [showDeleteFeatureConfirm, setShowDeleteFeatureConfirm] = useState(false);
  const [deleteStoryId, setDeleteStoryId] = useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: (data: { title: string; color: string }) => api.updateFeature(featureId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', piId] });
      setEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteFeature(featureId),
    onSuccess: () => {
      navigate(`/pi/${piId}`);
    },
  });

  const deleteStoryMutation = useMutation({
    mutationFn: (storyId: string) => api.deleteStory(storyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', piId] });
      setDeleteStoryId(null);
    },
  });

  if (isLoading) return <div className="p-8 text-center text-on-surface-muted">Loading…</div>;
  if (!board) return <div className="p-8 text-center text-red-500">Failed to load.</div>;

  const feature = board.features.find(f => f.id === featureId);
  if (!feature) return <div className="p-8 text-center text-red-500">Feature not found.</div>;

  const allStories = [...board.sprints.flatMap(s => s.stories), ...board.backlog];
  const featureStories = allStories.filter(s => s.featureId === featureId);
  const storyMap = new Map(allStories.map(s => [s.id, s]));
  const sprintMap = new Map(board.sprints.map(s => [s.id, s]));

  const scheduled = featureStories.filter(s => s.sprintId).length;
  const totalSP = featureStories.reduce((sum, s) => sum + s.estimation, 0);
  const scheduledSP = featureStories.filter(s => s.sprintId).reduce((sum, s) => sum + s.estimation, 0);

  const deliverySprint = featureStories
    .filter(s => s.sprintId)
    .map(s => sprintMap.get(s.sprintId!))
    .filter(Boolean)
    .sort((a, b) => b!.order - a!.order)[0] ?? null;

  const hexColor = resolveFeatureHex(feature.id, feature.color);

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-on-surface-muted mb-6">
        <Link to="/" className="hover:text-indigo-600">Home</Link>
        <span>/</span>
        <Link to={`/pi/${piId}`} className="hover:text-indigo-600">{board.pi.name}</Link>
        <span>/</span>
        <span className="text-on-surface font-medium">{feature.title}</span>
      </div>

      {/* Feature header */}
      <div
        className="rounded-2xl border-2 p-6 mb-6"
        style={{ backgroundColor: hexColor + '1A', borderColor: hexColor }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm" style={{ color: hexColor }}>{feature.externalId}</span>
            </div>
            {editing ? (
              <div className="flex flex-col gap-3">
                <Input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="text-lg font-bold min-w-0 flex-1"
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') updateMutation.mutate({ title: editTitle, color: editColor });
                    if (e.key === 'Escape') setEditing(false);
                  }}
                />
                {/* Color picker */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-on-surface-muted">Color:</span>
                  {FEATURE_COLOR_PRESETS.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setEditColor(preset)}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        editColor === preset ? 'border-on-surface scale-110 ring-2 ring-accent ring-offset-1' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: preset }}
                    />
                  ))}
                  <input
                    type="color"
                    value={editColor}
                    onChange={e => setEditColor(e.target.value)}
                    className="w-6 h-6 rounded border border-border cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={updateMutation.isPending || !editTitle.trim()}
                    onClick={() => updateMutation.mutate({ title: editTitle, color: editColor })}
                  >
                    {updateMutation.isPending ? 'Saving…' : 'Save'}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={updateMutation.isPending}
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <h1 className="text-2xl font-bold text-on-surface">{feature.title}</h1>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="text-3xl font-bold text-on-surface">{totalSP} SP</div>
            <div className="text-sm text-on-surface-muted">total estimation</div>
            {!editing && (
              <div className="flex items-center justify-end gap-2 mt-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setEditTitle(feature.title);
                    setEditColor(hexColor);
                    setEditing(true);
                  }}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={deleteMutation.isPending}
                  onClick={() => setShowDeleteFeatureConfirm(true)}
                >
                  {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-4 pt-4 border-t border-black/10">
          <div className="text-center">
            <div className="text-2xl font-bold text-on-surface">{featureStories.length}</div>
            <div className="text-xs text-on-surface-muted">total stories</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-on-surface">{scheduled}</div>
            <div className="text-xs text-on-surface-muted">scheduled</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-on-surface">{featureStories.length - scheduled}</div>
            <div className="text-xs text-on-surface-muted">in backlog</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-on-surface">
              {totalSP > 0 ? Math.round((scheduledSP / totalSP) * 100) : 0}%
            </div>
            <div className="text-xs text-on-surface-muted">SP scheduled</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-on-surface">
              {deliverySprint ? deliverySprint.name : '—'}
            </div>
            <div className="text-xs text-on-surface-muted">delivery sprint</div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {totalSP > 0 && (
        <div className="mb-6">
          <div className="flex justify-between text-sm text-on-surface-muted mb-1">
            <span>{scheduledSP} SP scheduled</span>
            <span>{totalSP - scheduledSP} SP remaining</span>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-surface-raised rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.round((scheduledSP / totalSP) * 100)}%`, backgroundColor: hexColor }}
            />
          </div>
        </div>
      )}

      {/* Stories grid */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-on-surface">Stories ({featureStories.length})</h2>
        <Button size="sm" variant="primary" onClick={() => setShowAddStory(true)}>+ Add Story</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {featureStories
          .sort((a, b) => (a.sprintId ? 0 : 1) - (b.sprintId ? 0 : 1))
          .map(story => {
            const sprint = story.sprintId ? sprintMap.get(story.sprintId) : null;
            const deps = story.dependsOnStoryIds.map(id => storyMap.get(id)).filter(Boolean);

            return (
              <Card key={story.id} className="p-4 flex flex-col gap-3">
                {/* Story header */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-on-surface-subtle font-mono">{story.externalId}</span>
                  <div className="flex items-center gap-1">
                    <Badge>{story.estimation} SP</Badge>
                    {story.externalDependencySprint != null && (
                      <Badge variant="info">Ext S{story.externalDependencySprint}</Badge>
                    )}
                  </div>
                </div>

                {/* Title */}
                <p className="text-sm font-semibold text-on-surface leading-snug">{story.title}</p>

                {/* Sprint assignment */}
                <div>
                  {sprint ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded font-medium" style={{ backgroundColor: hexColor + '20', color: hexColor }}>
                      {sprint.name}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs bg-surface-raised text-on-surface-muted px-2 py-1 rounded">
                      Backlog
                    </span>
                  )}
                </div>

                {/* Dependencies */}
                {deps.length > 0 && (
                  <div>
                    <p className="text-xs text-on-surface-subtle mb-1">Depends on:</p>
                    <div className="flex flex-wrap gap-1">
                      {deps.map(dep => dep && (
                        <span key={dep.id} className="text-xs bg-surface-raised border border-border rounded px-1.5 py-0.5 font-mono text-on-surface-muted">
                          {dep.externalId}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Delete button */}
                <div className="flex justify-end pt-1 border-t border-border">
                  <button
                    onClick={() => setDeleteStoryId(story.id)}
                    className="text-xs text-danger-fg hover:text-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </Card>
            );
          })}
      </div>

      {/* Back to board */}
      <div className="mt-8">
        <Link to={`/pi/${piId}`} className="text-sm text-indigo-600 hover:underline">← Back to board</Link>
      </div>

      <ConfirmDialog
        open={showDeleteFeatureConfirm}
        title="Delete Feature"
        message="Delete this feature? All its stories will also be deleted."
        confirmLabel="Delete Feature"
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setShowDeleteFeatureConfirm(false)}
      />
      <ConfirmDialog
        open={!!deleteStoryId}
        title="Delete Story"
        message="Delete this story? This cannot be undone."
        confirmLabel="Delete"
        isPending={deleteStoryMutation.isPending}
        onConfirm={() => { if (deleteStoryId) deleteStoryMutation.mutate(deleteStoryId); }}
        onCancel={() => setDeleteStoryId(null)}
      />
      <CreateStoryDialog
        piId={piId}
        features={board.features}
        allStories={allStories}
        open={showAddStory}
        onClose={() => setShowAddStory(false)}
        defaultFeatureId={featureId}
      />
    </div>
  );
}
