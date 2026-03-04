import type { Sprint } from '../../../domain/entities/sprint';
import type { Story } from '../../../domain/entities/story';
import type { StoryDependency } from '../../../domain/entities/story-dependency';

export interface SchedulingInput {
  stories: Story[];
  sprints: Sprint[];
  dependencies: StoryDependency[];
}

export interface ScheduleOptions {
  scheduleBacklog: boolean;
  fixViolations: boolean;
  fixOvercommit: boolean;
}

export interface ScheduleResult {
  moves: InternalSuggestedMove[];
  warnings: InternalSchedulingWarning[];
  errors: InternalSchedulingError[];
  unfixable: { message: string }[];
}

export interface InternalSchedulingWarning {
  type: 'OVERCOMMIT';
  sprintId: string; sprintName: string;
  currentLoad: number; capacity: number; overcommitPercent: number;
}

export interface InternalSchedulingError {
  type: 'DEPENDENCY_VIOLATION' | 'CYCLE_DETECTED' | 'UNSCHEDULABLE' | 'EXTERNAL_DEPENDENCY_VIOLATION';
  storyIds: string[]; message: string;
}

export interface InternalSuggestedMove {
  storyId: string;
  storyExternalId: string;
  storyTitle: string;
  fromSprintId: string | null;
  fromSprintName: string | null;
  toSprintId: string | null;
  toSprintName: string | null;
  reason: string;
}

export interface ValidationInput {
  story: Story;
  targetSprint: Sprint;
  dependencies: StoryDependency[];
  storySprintMap: Map<string, Sprint>;
  sprintCurrentLoad: Map<string, number>;
}

export interface ValidationOutput {
  valid: boolean;
  warnings: InternalSchedulingWarning[];
  errors: InternalSchedulingError[];
  canForceAccept: boolean;
}
