import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { SprintProjection, StoryProjection, FeatureProjection, SchedulingWarning } from '@org/shared-types';
import { StoryCard } from '../story-card/StoryCard';
import { Badge } from '../ui/Badge';
import { SprintEditor } from './SprintEditor';
import { resolveFeatureHex } from '../../lib/colors';

interface SprintColumnProps {
  sprint: SprintProjection;
  piId: string;
  stories: StoryProjection[];
  features: FeatureProjection[];
  warnings: SchedulingWarning[];
  depOrderWarnings: Map<string, string[]>;
  matchingStoryIds?: Set<string> | null;
  ghostStoryIds?: Set<string>;
  onStoryClick?: (story: StoryProjection) => void;
  releaseNames?: string[];
  deliveryFeatureNames?: string[];
}

function capacityColor(load: number, capacity: number): string {
  if (load > capacity) return 'bg-red-500';
  return 'bg-green-500';
}

function headerBg(load: number, capacity: number): string {
  if (load > capacity) return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700';
  return 'bg-surface-raised border-border';
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function SprintColumn({
  sprint, piId, stories, features, warnings, depOrderWarnings, matchingStoryIds = null,
  ghostStoryIds, onStoryClick, releaseNames = [], deliveryFeatureNames = [],
}: SprintColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: sprint.id });
  const [showEditor, setShowEditor] = useState(false);
  const featureMap = new Map(features.map(f => [f.id, f]));
  const sprintWarning = warnings.find(w => w.sprintId === sprint.id);
  const pct = Math.round((sprint.currentLoad / sprint.capacity) * 100);
  const showRelease = releaseNames.length > 0;

  return (
    <div className={[
      'flex flex-col w-64 shrink-0 rounded-xl border-2 transition-colors relative',
      isOver ? 'border-indigo-400 bg-indigo-50' : 'border-transparent',
      showRelease ? 'ring-2 ring-red-400 ring-offset-1' : '',
    ].join(' ')}>
      {/* Release ribbons */}
      {showRelease && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1">
          {releaseNames.map(name => (
            <span key={name} className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow whitespace-nowrap">
              🚩 {name}
            </span>
          ))}
        </div>
      )}

      <div className={`rounded-t-xl border px-3 py-2 relative ${headerBg(sprint.currentLoad, sprint.capacity)}`}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1">
            <span className="font-semibold text-sm text-on-surface">{sprint.name}</span>
            <button
              onClick={() => setShowEditor(v => !v)}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-surface-sunken transition-colors text-on-surface-muted hover:text-on-surface"
              title="Edit sprint"
            >
              &#9998;
            </button>
          </div>
          {sprintWarning && <Badge variant="error">{sprintWarning.overcommitPercent}% over</Badge>}
        </div>
        <SprintEditor sprint={sprint} piId={piId} open={showEditor} onClose={() => setShowEditor(false)} />

        {/* Sprint date range */}
        {(sprint.startDate || sprint.endDate) && (
          <p className="text-[10px] text-on-surface-subtle mb-1">
            {formatDate(sprint.startDate)} {sprint.startDate && sprint.endDate ? '–' : ''} {formatDate(sprint.endDate)}
          </p>
        )}

        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-surface-sunken rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${capacityColor(sprint.currentLoad, sprint.capacity)}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <span className="text-xs text-on-surface-muted shrink-0">{sprint.currentLoad}/{sprint.capacity} SP</span>
        </div>

        {/* Feature delivery badges */}
        {deliveryFeatureNames.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {deliveryFeatureNames.map(name => (
              <span key={name} className="text-[10px] bg-success text-success-fg dark:bg-success/20 border border-green-200 rounded px-1.5 py-0.5 font-medium">
                ✓ {name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div ref={setNodeRef} className="flex-1 min-h-[200px] p-2 flex flex-col gap-2">
        <SortableContext items={stories.map(s => s.id)} strategy={verticalListSortingStrategy}>
          {stories.map(story => (
            <StoryCard
              key={story.id}
              story={story}
              featureTitle={featureMap.get(story.featureId)?.title}
              featureHexColor={resolveFeatureHex(story.featureId, featureMap.get(story.featureId)?.color)}
              isBlocked={story.externalDependencySprint != null && story.externalDependencySprint >= sprint.order}
              dimmed={matchingStoryIds !== null && !matchingStoryIds.has(story.id)}
              isGhost={ghostStoryIds?.has(story.id)}
              onStoryClick={onStoryClick}
            />
          ))}
        </SortableContext>
        {stories.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-xs text-on-surface-subtle border-2 border-dashed border-border-subtle rounded-lg py-8">
            Drop stories here
          </div>
        )}
      </div>
    </div>
  );
}
