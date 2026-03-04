import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { StoryProjection, FeatureProjection } from '@org/shared-types';
import { StoryCard } from '../story-card/StoryCard';
import { resolveFeatureHex } from '../../lib/colors';

interface BacklogColumnProps {
  stories: StoryProjection[];
  featureMap: Map<string, FeatureProjection>;
  matchingStoryIds?: Set<string> | null;
  ghostStoryIds?: Set<string>;
  onStoryClick: (s: StoryProjection) => void;
}

export function BacklogColumn({ stories, featureMap, matchingStoryIds = null, ghostStoryIds, onStoryClick }: BacklogColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'backlog' });

  return (
    <div
      className={`flex flex-col w-64 shrink-0 rounded-xl border-2 transition-colors ${
        isOver ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : 'border-transparent'
      }`}
    >
      <div className="bg-surface-sunken rounded-t-xl border border-border px-3 py-2">
        <span className="font-semibold text-sm text-on-surface-muted">Backlog ({stories.length})</span>
      </div>
      <div
        ref={setNodeRef}
        className="flex flex-col gap-2 p-2 min-h-[200px] border border-border border-t-0 rounded-b-xl bg-surface"
      >
        {stories.map(story => (
          <StoryCard
            key={story.id}
            story={story}
            featureTitle={featureMap.get(story.featureId)?.title}
            featureHexColor={resolveFeatureHex(story.featureId, featureMap.get(story.featureId)?.color)}
            dimmed={matchingStoryIds !== null && !matchingStoryIds.has(story.id)}
            isGhost={ghostStoryIds?.has(story.id)}
            onStoryClick={onStoryClick}
          />
        ))}
        {stories.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-xs text-on-surface-muted border-2 border-dashed border-border rounded-lg py-8">
            Drop stories here
          </div>
        )}
      </div>
    </div>
  );
}
