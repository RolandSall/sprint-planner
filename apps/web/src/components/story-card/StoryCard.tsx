import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { StoryProjection } from '@org/shared-types';
import { Badge } from '../ui/Badge';
import { featureBadgeStyle, resolveFeatureHex } from '../../lib/colors';

interface StoryCardProps {
  story: StoryProjection;
  featureTitle?: string;
  featureHexColor?: string;
  isDragging?: boolean;
  isBlocked?: boolean;
  dimmed?: boolean;
  isGhost?: boolean;
  onStoryClick?: (story: StoryProjection) => void;
}

export function StoryCard({ story, featureTitle, featureHexColor, isDragging = false, isBlocked = false, dimmed = false, isGhost = false, onStoryClick }: StoryCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: story.id, disabled: isGhost });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const hexColor = featureHexColor ?? resolveFeatureHex(story.featureId);

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-story-id={story.id}
      {...attributes}
      {...listeners}
      onClick={() => { if (!isGhost) onStoryClick?.(story); }}
      className={`relative bg-surface border rounded-lg p-3 select-none transition-all
        ${isGhost ? 'opacity-30 cursor-default pointer-events-none' : 'cursor-grab active:cursor-grabbing'}
        ${isDragging ? 'opacity-50 shadow-lg rotate-2' : dimmed ? 'opacity-25' : isGhost ? '' : 'shadow-sm hover:shadow-md'}
        ${isBlocked && !dimmed && !isGhost ? 'opacity-60' : ''}
        border-border`}
    >
      {/* Drag handle icon — visual cue only, drag works from entire card */}
      <div className="absolute top-2 right-2 text-on-surface-subtle p-0.5 leading-none pointer-events-none">
        ⠿
      </div>
      <div className="flex items-start justify-between gap-2 mb-2 pr-5">
        <span className="text-xs text-on-surface-subtle font-mono">{story.externalId}</span>
        <Badge className="shrink-0">{story.estimation} SP</Badge>
      </div>
      <p className="text-sm font-medium text-on-surface mb-2 leading-snug">{story.title}</p>
      <div className="flex items-center gap-1 flex-wrap">
        {featureTitle && (
          <span
            className="text-xs px-1.5 py-0.5 rounded border font-medium truncate max-w-[120px]"
            style={featureBadgeStyle(hexColor)}
          >
            {featureTitle}
          </span>
        )}
        {story.externalDependencySprint != null && (
          <Badge variant="info">Ext S{story.externalDependencySprint}</Badge>
        )}
      </div>
    </div>
  );
}

export function StoryCardOverlay({ story, featureTitle, featureHexColor }: { story: StoryProjection; featureTitle?: string; featureHexColor?: string }) {
  return <StoryCard story={story} featureTitle={featureTitle} featureHexColor={featureHexColor} isDragging />;
}
