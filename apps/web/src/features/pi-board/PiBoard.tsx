import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  DndContext, DragEndEvent, DragMoveEvent, DragOverlay, DragStartEvent,
  closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import type { StoryProjection, SchedulingApiResponse, SuggestFixesApiResponse } from '@org/shared-types';
import { usePiBoard, useMoveStory, useAutoSchedule, useSuggestFixes, useApplyFixes } from '../../hooks/use-pi-board';
import { useBoardDerivedData } from '../../hooks/use-board-derived';
import { SprintColumn } from '../../components/sprint-column/SprintColumn';
import { StoryCardOverlay } from '../../components/story-card/StoryCard';
import { BacklogColumn } from '../../components/backlog-column/BacklogColumn';
import { StoryDrawer } from '../../components/story-drawer/StoryDrawer';
import { FeatureLegend } from '../../components/feature-legend/FeatureLegend';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Dialog } from '../../components/ui/Dialog';
import { CreateFeatureDialog } from '../../components/create-feature-dialog/CreateFeatureDialog';
import { CreateStoryDialog } from '../../components/create-story-dialog/CreateStoryDialog';
import { ReleaseManager } from '../../components/release-manager/ReleaseManager';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { validateMove } from '../../lib/validation';
import { resolveFeatureHex } from '../../lib/colors';
import { api } from '../../lib/api-client';
import { useQueryClient } from '@tanstack/react-query';

// ── Dependency line overlay ───────────────────────────────────────────────────
interface DepLine { id: string; x1: number; y1: number; x2: number; y2: number; color: string }

function DependencyOverlay({ lines, container }: { lines: DepLine[]; container: HTMLDivElement }) {
  if (lines.length === 0) return null;
  const uniqueColors = [...new Set(lines.map(l => l.color))];
  const markerId = (c: string) => `dep-arrow-${c.replace('#', '')}`;

  return (
    <svg
      className="absolute top-0 left-0 pointer-events-none z-10"
      style={{ width: container.scrollWidth, height: container.scrollHeight }}
    >
      <defs>
        {uniqueColors.map(color => (
          <marker key={color} id={markerId(color)} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill={color} opacity="0.9" />
          </marker>
        ))}
      </defs>
      {lines.map(l => (
        <path
          key={l.id}
          d={`M ${l.x1} ${l.y1} C ${l.x1} ${l.y1 + 50}, ${l.x2} ${l.y2 - 50}, ${l.x2} ${l.y2}`}
          stroke={l.color}
          strokeWidth="1.5"
          strokeDasharray="6 3"
          fill="none"
          opacity="0.75"
          markerEnd={`url(#${markerId(l.color)})`}
        />
      ))}
    </svg>
  );
}

type DepFilterMode = 'all' | 'story' | 'feature';

// ── PiBoard ───────────────────────────────────────────────────────────────────
export function PiBoard() {
  const { piId = '' } = useParams<{ piId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: board, isLoading, error } = usePiBoard(piId);
  const moveStory = useMoveStory(piId);
  const autoSchedule = useAutoSchedule(piId);
  const suggestFixes = useSuggestFixes(piId);
  const applyFixes = useApplyFixes(piId);

  const {
    allStories, featureMap, sprintMap,
    deliverySprintMap, deliveryFeaturesBySprint,
    releaseSprintMap, totalLoad, depOrderWarnings,
    hasReleases, hasSprintDates,
  } = useBoardDerivedData(board);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStory, setActiveStory] = useState<StoryProjection | null>(null);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const selectedStory = selectedStoryId ? allStories.find(s => s.id === selectedStoryId) ?? null : null;
  const [showDeps, setShowDeps] = useState(false);
  const [depFilterMode, setDepFilterMode] = useState<DepFilterMode>('all');
  const [depFilterStoryId, setDepFilterStoryId] = useState('');
  const [depFilterFeatureId, setDepFilterFeatureId] = useState('');
  const [showReleaseLine, setShowReleaseLine] = useState(true);
  const [showCreateFeature, setShowCreateFeature] = useState(false);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ storyId: string; targetSprintId: string | null; message: string } | null>(null);
  const [showDeletePiConfirm, setShowDeletePiConfirm] = useState(false);
  const [showReleaseManager, setShowReleaseManager] = useState(false);
  const [showWarningsPopup, setShowWarningsPopup] = useState(false);
  const [scheduleResult, setScheduleResult] = useState<SchedulingApiResponse | null>(null);
  const [fixPreview, setFixPreview] = useState<SuggestFixesApiResponse | null>(null);
  const [depLines, setDepLines] = useState<DepLine[]>([]);
  const [hiddenFeatureIds, setHiddenFeatureIds] = useState<Set<string>>(new Set());

  const handleToggleFeature = useCallback((featureId: string) => {
    setHiddenFeatureIds(prev => {
      const next = new Set(prev);
      next.has(featureId) ? next.delete(featureId) : next.add(featureId);
      return next;
    });
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragMovedRef = useRef(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // ── Dependency lines ──────────────────────────────────────────────────────
  const computeDepLines = useCallback(() => {
    if (!showDeps || !containerRef.current || !board) { setDepLines([]); return; }
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const lines: DepLine[] = [];

    for (const story of allStories) {
      // Apply filter
      if (depFilterMode === 'story' && depFilterStoryId && story.id !== depFilterStoryId) continue;
      if (depFilterMode === 'feature' && depFilterFeatureId && story.featureId !== depFilterFeatureId) continue;
      if (!story.dependsOnStoryIds.length) continue;

      const feat = board!.features.find(f => f.id === story.featureId);
      const color = resolveFeatureHex(story.featureId, feat?.color);
      for (const depId of story.dependsOnStoryIds) {
        const fromEl = container.querySelector(`[data-story-id="${story.id}"]`);
        const toEl = container.querySelector(`[data-story-id="${depId}"]`);
        if (!fromEl || !toEl) continue;
        const fr = fromEl.getBoundingClientRect();
        const tr = toEl.getBoundingClientRect();
        lines.push({
          id: `${story.id}-${depId}`,
          x1: fr.left - rect.left + container.scrollLeft + fr.width / 2,
          y1: fr.top - rect.top + container.scrollTop + fr.height,
          x2: tr.left - rect.left + container.scrollLeft + tr.width / 2,
          y2: tr.top - rect.top + container.scrollTop,
          color,
        });
      }
    }
    setDepLines(lines);
  }, [showDeps, board, allStories, depFilterMode, depFilterStoryId, depFilterFeatureId, hiddenFeatureIds]);

  useEffect(() => { computeDepLines(); }, [computeDepLines]);

  // Reset filter sub-selections when mode changes or deps toggled off
  useEffect(() => {
    if (!showDeps) { setDepFilterMode('all'); setDepFilterStoryId(''); setDepFilterFeatureId(''); }
  }, [showDeps]);

  // ── DnD handlers ─────────────────────────────────────────────────────────
  const handleDragStart = (event: DragStartEvent) => {
    dragMovedRef.current = false;
    const story = allStories.find(s => s.id === event.active.id);
    if (story && hiddenFeatureIds.has(story.featureId)) return;
    setActiveStory(story ?? null);
  };

  const handleDragMove = (event: DragMoveEvent) => {
    if (Math.abs(event.delta.x) > 3 || Math.abs(event.delta.y) > 3) {
      dragMovedRef.current = true;
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveStory(null);
    setTimeout(() => { dragMovedRef.current = false; }, 0);

    if (!over || !board) return;

    const story = allStories.find(s => s.id === active.id);
    if (!story) return;

    const sprintIds = new Set(board.sprints.map(s => s.id));
    let targetSprintId: string | null;

    if (over.id === 'backlog') {
      targetSprintId = null;
    } else if (sprintIds.has(over.id as string)) {
      targetSprintId = over.id as string;
    } else {
      targetSprintId = allStories.find(s => s.id === over.id)?.sprintId ?? null;
    }

    if (targetSprintId === story.sprintId) return;

    if (targetSprintId !== null) {
      const targetSprint = board.sprints.find(s => s.id === targetSprintId);
      if (targetSprint) {
        const { errors } = validateMove(story, targetSprint, board.sprints, allStories);
        if (errors.length > 0) {
          setPendingMove({ storyId: story.id, targetSprintId, message: errors[0].message });
          return;
        }
      }
    }

    await moveStory.mutateAsync({ storyId: story.id, targetSprintId });
  };

  const handleStoryClick = useCallback((story: StoryProjection) => {
    if (dragMovedRef.current) return;
    setSelectedStoryId(story.id);
  }, []);

  const handleDeletePi = async () => {
    if (!board) return;
    await api.deletePi(piId);
    qc.invalidateQueries({ queryKey: ['pis'] });
    navigate('/');
  };

  // ── Feature visibility filtering ──────────────────────────────────────────
  const ghostStoryIds = useMemo(() => {
    if (!showDeps || hiddenFeatureIds.size === 0) return new Set<string>();
    const visibleStories = allStories.filter(s => !hiddenFeatureIds.has(s.featureId));
    const neededDepIds = new Set<string>();
    for (const story of visibleStories) {
      for (const depId of story.dependsOnStoryIds) {
        const depStory = allStories.find(s => s.id === depId);
        if (depStory && hiddenFeatureIds.has(depStory.featureId)) {
          neededDepIds.add(depId);
        }
      }
    }
    return neededDepIds;
  }, [allStories, hiddenFeatureIds, showDeps]);

  const filteredSprints = useMemo(() => {
    if (!board || hiddenFeatureIds.size === 0) return board?.sprints ?? [];
    return board.sprints.map(sprint => ({
      ...sprint,
      stories: sprint.stories.filter(s =>
        !hiddenFeatureIds.has(s.featureId) || ghostStoryIds.has(s.id)
      ),
    }));
  }, [board, hiddenFeatureIds, ghostStoryIds]);

  const filteredBacklog = useMemo(() => {
    if (!board || hiddenFeatureIds.size === 0) return board?.backlog ?? [];
    return board.backlog.filter(s =>
      !hiddenFeatureIds.has(s.featureId) || ghostStoryIds.has(s.id)
    );
  }, [board, hiddenFeatureIds, ghostStoryIds]);

  // ── Guard: loading / error ────────────────────────────────────────────────
  if (isLoading) return <div className="p-8 text-center text-on-surface-muted">Loading board…</div>;
  if (error || !board) return <div className="p-8 text-center text-red-500">Failed to load board.</div>;

  const selectedSprintName = selectedStory?.sprintId ? sprintMap.get(selectedStory.sprintId)?.name : undefined;
  const releasesWithSprint = board.releases.filter(r =>
    [...releaseSprintMap.values()].some(names => names.includes(r.name))
  );
  const showReleaseToggle = hasReleases && hasSprintDates && releasesWithSprint.length > 0;

  // Stories that have outgoing deps (for filter dropdown)
  const storiesWithDeps = allStories.filter(s => s.dependsOnStoryIds.length > 0);

  const selectCls = 'bg-surface border border-border rounded px-2 py-1 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-accent';

  // Search — null means no active search, Set means active filter
  const q = searchQuery.trim().toLowerCase();
  const matchingStoryIds: Set<string> | null = q
    ? new Set(allStories.filter(s =>
        s.externalId.toLowerCase().includes(q) || s.title.toLowerCase().includes(q)
      ).map(s => s.id))
    : null;

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="border-b border-border bg-surface px-6 py-3 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-bold text-lg text-on-surface truncate">{board.pi.name}</h1>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <p className={`text-sm ${totalLoad > board.pi.totalCapacity ? 'text-red-600 font-semibold' : 'text-on-surface-muted'}`}>
              {totalLoad}/{board.pi.totalCapacity} SP
              {totalLoad > board.pi.totalCapacity && ' — Overcommitting PI'}
            </p>
            {hasReleases && (
              <span className="text-xs text-on-surface-muted">
                🚩 {board.releases.map(r => r.name).join(' · ')}
                {!hasSprintDates && (
                  <span className="ml-1 text-yellow-600">(add sprint dates to see release lines)</span>
                )}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search stories…"
              className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-on-surface placeholder:text-on-surface-subtle focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent w-44"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-muted hover:text-on-surface text-sm"
              >
                &times;
              </button>
            )}
          </div>
          <div className="relative flex">
            {showReleaseToggle && (
              <button
                onClick={() => setShowReleaseLine(v => !v)}
                className={`px-3 py-1.5 rounded-l-lg border text-sm font-medium transition-all ${
                  showReleaseLine
                    ? 'bg-red-500 text-white border-red-500'
                    : 'bg-surface text-on-surface-muted border-border hover:border-red-400'
                }`}
              >
                🚩 Release lines
              </button>
            )}
            <button
              onClick={() => setShowReleaseManager(v => !v)}
              className={`px-2 py-1.5 border text-sm font-medium transition-all ${
                showReleaseToggle
                  ? 'rounded-r-lg border-l-0'
                  : 'rounded-lg'
              } ${
                showReleaseManager
                  ? 'bg-red-500 text-white border-red-500'
                  : 'bg-surface text-on-surface-muted border-border hover:border-red-400'
              }`}
              title="Manage releases"
            >
              {showReleaseToggle ? '\u25BE' : '\uD83D\uDEA9 \u25BE'}
            </button>
            <ReleaseManager
              piId={piId}
              releases={board.releases}
              open={showReleaseManager}
              onClose={() => setShowReleaseManager(false)}
            />
          </div>

          {/* Dep lines toggle + filter controls */}
          <button
            onClick={() => setShowDeps(v => !v)}
            className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
              showDeps
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-surface text-on-surface-muted border-border hover:border-indigo-400'
            }`}
          >
            🔗 Dep lines
          </button>
          {showDeps && (
            <>
              <select
                className={selectCls}
                value={depFilterMode}
                onChange={e => {
                  setDepFilterMode(e.target.value as DepFilterMode);
                  setDepFilterStoryId('');
                  setDepFilterFeatureId('');
                }}
              >
                <option value="all">All deps</option>
                <option value="story">By story</option>
                <option value="feature">By feature</option>
              </select>
              {depFilterMode === 'story' && (
                <SearchableSelect
                  value={depFilterStoryId}
                  onChange={setDepFilterStoryId}
                  placeholder="Pick story…"
                  options={storiesWithDeps.map(s => ({ value: s.id, label: `${s.externalId} — ${s.title}` }))}
                />
              )}
              {depFilterMode === 'feature' && (
                <SearchableSelect
                  value={depFilterFeatureId}
                  onChange={setDepFilterFeatureId}
                  placeholder="Pick feature…"
                  options={board.features.map(f => ({ value: f.id, label: `${f.externalId} — ${f.title}` }))}
                />
              )}
            </>
          )}

          <Button variant="secondary" size="sm" onClick={() => setShowCreateFeature(true)}>+ Feature</Button>
          <Button variant="secondary" size="sm" onClick={() => setShowCreateStory(true)}>+ Story</Button>
          <Link to={`/pi/${piId}/import`}>
            <Button variant="secondary" size="sm">Import</Button>
          </Link>
          <Button size="sm" onClick={async () => {
            const result = await autoSchedule.mutateAsync();
            if (result.errors.length > 0 || result.warnings.length > 0) {
              setScheduleResult(result);
            }
          }} disabled={autoSchedule.isPending}>
            {autoSchedule.isPending ? 'Scheduling…' : '⚡ Auto Schedule'}
          </Button>
          <button
            onClick={() => setShowDeletePiConfirm(true)}
            className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            🗑 Delete
          </button>
        </div>
      </div>

      {/* ── Feature legend ──────────────────────────────────────────────── */}
      <div className="px-6 py-2 border-b border-border bg-surface-raised">
        <FeatureLegend features={board.features} piId={piId} deliverySprintMap={deliverySprintMap} hiddenFeatureIds={hiddenFeatureIds} onToggleFeature={handleToggleFeature} />
      </div>

      {/* ── Board canvas ────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="flex-1 overflow-x-auto overflow-y-auto relative"
        onScroll={computeDepLines}
      >
        {showDeps && containerRef.current && (
          <DependencyOverlay lines={depLines} container={containerRef.current} />
        )}

        <div className="p-6 pt-8">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 items-start">
              {filteredSprints.map(sprint => (
                <SprintColumn
                  key={sprint.id}
                  sprint={sprint}
                  piId={piId}
                  stories={sprint.stories}
                  features={board.features}
                  warnings={board.warnings}
                  depOrderWarnings={depOrderWarnings}
                  matchingStoryIds={matchingStoryIds}
                  ghostStoryIds={ghostStoryIds}
                  onStoryClick={handleStoryClick}
                  releaseNames={showReleaseLine ? (releaseSprintMap.get(sprint.id) ?? []) : []}
                  deliveryFeatureNames={deliveryFeaturesBySprint.get(sprint.id) ?? []}
                />
              ))}
              <BacklogColumn
                stories={filteredBacklog}
                featureMap={featureMap}
                matchingStoryIds={matchingStoryIds}
                ghostStoryIds={ghostStoryIds}
                onStoryClick={handleStoryClick}
              />
            </div>

            <DragOverlay>
              {activeStory && (
                <StoryCardOverlay
                  story={activeStory}
                  featureTitle={featureMap.get(activeStory.featureId)?.title}
                  featureHexColor={resolveFeatureHex(activeStory.featureId, featureMap.get(activeStory.featureId)?.color)}
                />
              )}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      {/* ── Story drawer ────────────────────────────────────────────────── */}
      <StoryDrawer
        story={selectedStory}
        allStories={allStories}
        features={board.features}
        sprints={board.sprints}
        piId={piId}
        sprintName={selectedSprintName}
        onClose={() => setSelectedStoryId(null)}
      />

      {/* ── Dialogs ─────────────────────────────────────────────────────── */}
      <CreateFeatureDialog
        piId={piId}
        open={showCreateFeature}
        onClose={() => setShowCreateFeature(false)}
      />
      <CreateStoryDialog
        piId={piId}
        features={board.features}
        allStories={allStories}
        open={showCreateStory}
        onClose={() => setShowCreateStory(false)}
      />
      <ConfirmDialog
        open={!!pendingMove}
        title="Constraint Violation"
        message={pendingMove ? `⚠️ ${pendingMove.message}\n\nProceed anyway?` : undefined}
        confirmLabel="Move Anyway"
        variant="primary"
        onConfirm={async () => {
          if (pendingMove) await moveStory.mutateAsync({ storyId: pendingMove.storyId, targetSprintId: pendingMove.targetSprintId });
          setPendingMove(null);
        }}
        onCancel={() => setPendingMove(null)}
      />
      <ConfirmDialog
        open={showDeletePiConfirm}
        title="Delete PI"
        message={`Delete "${board.pi.name}"? This will remove all sprints, features, and stories.`}
        confirmLabel="Delete PI"
        onConfirm={async () => { await handleDeletePi(); setShowDeletePiConfirm(false); }}
        onCancel={() => setShowDeletePiConfirm(false)}
      />

      {/* ── Bottom-center warnings pill ─────────────────────────────── */}
      {(board.warnings.length > 0 || depOrderWarnings.size > 0) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <button
            onClick={() => setShowWarningsPopup(true)}
            className="px-4 py-2 rounded-full shadow-lg border border-orange-300 bg-orange-50 text-orange-700 dark:bg-orange-900/80 dark:text-orange-200 dark:border-orange-700 text-sm font-medium hover:shadow-xl transition-shadow"
          >
            {board.warnings.length + depOrderWarnings.size} {board.warnings.length + depOrderWarnings.size === 1 ? 'warning' : 'warnings'}
          </button>
        </div>
      )}

      {/* ── Warnings full-page modal ─────────────────────────────────── */}
      {showWarningsPopup && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[60]" onClick={() => setShowWarningsPopup(false)} />
          <div className="fixed inset-0 z-[61] flex items-center justify-center p-8 pointer-events-none">
            <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto pointer-events-auto">
              <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-surface rounded-t-xl">
                <h2 className="text-base font-bold text-on-surface">Warnings</h2>
                <button
                  onClick={() => setShowWarningsPopup(false)}
                  className="text-on-surface-muted hover:text-on-surface text-xl leading-none p-1"
                >
                  &times;
                </button>
              </div>
              <div className="p-5 flex flex-col gap-4">
                {/* Overcommit warnings */}
                {board.warnings.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-on-surface-muted uppercase tracking-wide mb-2">Overcommitting Sprints</h3>
                    <ul className="flex flex-col gap-2">
                      {board.warnings.map(w => (
                        <li key={w.sprintId} className="text-sm text-on-surface bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
                          <span className="font-semibold">{w.sprintName}</span> — {w.currentLoad}/{w.capacity} SP ({w.overcommitPercent}% over capacity)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Dependency ordering violations */}
                {depOrderWarnings.size > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-on-surface-muted uppercase tracking-wide mb-2">Dependency Violations</h3>
                    <ul className="flex flex-col gap-2">
                      {[...depOrderWarnings.entries()].map(([storyId, msgs]) => {
                        const story = allStories.find(s => s.id === storyId);
                        return (
                          <li key={storyId} className="text-sm text-on-surface bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
                            <span className="font-semibold font-mono text-xs">{story?.externalId ?? storyId}</span>
                            {story && <span className="ml-1.5">{story.title}</span>}
                            <ul className="mt-1 ml-3 list-disc text-xs text-on-surface-muted">
                              {msgs.map((m, i) => <li key={i}>{m}</li>)}
                            </ul>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {board.warnings.length === 0 && depOrderWarnings.size === 0 && (
                  <p className="text-sm text-on-surface-muted text-center py-4">No warnings.</p>
                )}

                {(board.warnings.length > 0 || depOrderWarnings.size > 0) && (
                  <div className="flex justify-end pt-2 border-t border-border">
                    <Button
                      size="sm"
                      onClick={async () => {
                        const result = await suggestFixes.mutateAsync();
                        setFixPreview(result);
                        setShowWarningsPopup(false);
                      }}
                      disabled={suggestFixes.isPending}
                    >
                      {suggestFixes.isPending ? 'Analyzing…' : '🔧 Quick Fix'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Auto-schedule result dialog ──────────────────────────────── */}
      {/* ── Quick Fix preview dialog ─────────────────────────────────── */}
      <Dialog open={!!fixPreview} onClose={() => setFixPreview(null)} title="Quick Fix Preview" maxWidth="lg">
        {fixPreview && (
          <div className="flex flex-col gap-4 -mt-2">
            {fixPreview.moves.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-on-surface-muted uppercase tracking-wide mb-2">
                  Proposed moves ({fixPreview.moves.length})
                </h3>
                <div className="flex flex-col gap-2">
                  {fixPreview.moves.map(move => (
                    <div key={move.storyId} className="text-sm text-on-surface bg-surface-sunken rounded-lg p-3 border border-border">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-on-surface-subtle">{move.storyExternalId}</span>
                        <span className="font-medium">{move.storyTitle}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-on-surface-muted">
                        <span className="px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
                          {move.fromSprintName ?? 'Backlog'}
                        </span>
                        <span>→</span>
                        <span className="px-1.5 py-0.5 rounded bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300">
                          {move.toSprintName ?? 'Backlog'}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-subtle mt-1">{move.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {fixPreview.unfixable.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">Cannot auto-fix</h3>
                <ul className="flex flex-col gap-2">
                  {fixPreview.unfixable.map((item, i) => (
                    <li key={i} className="text-sm text-on-surface bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800 whitespace-pre-line">
                      {item.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {fixPreview.moves.length === 0 && fixPreview.unfixable.length === 0 && (
              <p className="text-sm text-on-surface-muted text-center py-4">No fixes needed — everything looks good!</p>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-border sticky bottom-0 bg-surface -mx-6 px-6 -mb-6 pb-5">
              <Button variant="secondary" size="sm" onClick={() => setFixPreview(null)}>Cancel</Button>
              {fixPreview.moves.length > 0 && (
                <Button
                  size="sm"
                  onClick={async () => {
                    await applyFixes.mutateAsync(fixPreview.moves.map(m => ({
                      storyId: m.storyId,
                      toSprintId: m.toSprintId,
                    })));
                    setFixPreview(null);
                  }}
                  disabled={applyFixes.isPending}
                >
                  {applyFixes.isPending ? 'Applying…' : `Apply All (${fixPreview.moves.length} moves)`}
                </Button>
              )}
            </div>
          </div>
        )}
      </Dialog>

      {/* ── Auto-schedule result dialog ──────────────────────────────── */}
      <Dialog open={!!scheduleResult} onClose={() => setScheduleResult(null)} title="Auto Schedule Result" maxWidth="md">
        {scheduleResult && (
          <div className="flex flex-col gap-4 -mt-2">
            {scheduleResult.assignments.length > 0 && (
              <p className="text-sm text-on-surface">
                Scheduled <strong>{scheduleResult.assignments.length}</strong> {scheduleResult.assignments.length === 1 ? 'story' : 'stories'}.
              </p>
            )}
            {scheduleResult.errors.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">Errors</h3>
                <ul className="flex flex-col gap-2">
                  {scheduleResult.errors.map((err, i) => (
                    <li key={i} className="text-sm text-on-surface bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800 whitespace-pre-line">
                      {err.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {scheduleResult.warnings.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-2">Warnings</h3>
                <ul className="flex flex-col gap-2">
                  {scheduleResult.warnings.map(w => (
                    <li key={w.sprintId} className="text-sm text-on-surface bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
                      <span className="font-semibold">{w.sprintName}</span> — {w.currentLoad}/{w.capacity} SP ({w.overcommitPercent}% over capacity)
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex justify-end pt-1">
              <Button variant="secondary" size="sm" onClick={() => setScheduleResult(null)}>Close</Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
