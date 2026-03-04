export type WarningType = 'OVERCOMMIT';
export type ErrorType =
  | 'DEPENDENCY_VIOLATION'
  | 'CYCLE_DETECTED'
  | 'UNSCHEDULABLE'
  | 'EXTERNAL_DEPENDENCY_VIOLATION';

// --- Projections (read models) ---
export interface TeamProjection { id: string; name: string }
export interface PiProjection {
  id: string; teamId: string; name: string;
  startDate: string; endDate: string; totalCapacity: number;
}
export interface PiReleaseProjection {
  id: string; piId: string; name: string; date: string;
}
export interface SprintProjection {
  id: string; piId: string; name: string; order: number;
  capacity: number; currentLoad: number;
  startDate: string | null; endDate: string | null;
}
export interface FeatureProjection {
  id: string; piId: string; externalId: string; title: string;
  totalEstimation: number; color: string | null;
}
export interface StoryProjection {
  id: string; featureId: string; sprintId: string | null;
  externalId: string; title: string; estimation: number;
  externalDependencySprint: number | null;
  dependsOnStoryIds: string[];
}
export interface PiBoardProjection {
  pi: PiProjection;
  releases: PiReleaseProjection[];
  sprints: (SprintProjection & { stories: StoryProjection[] })[];
  backlog: StoryProjection[];
  features: FeatureProjection[];
  warnings: SchedulingWarning[];
}

// --- API Requests ---
export interface CreateTeamApiRequest { name: string }
export interface CreatePiApiRequest { teamId: string; name: string; startDate: string; endDate: string }
export interface CreatePiReleaseApiRequest { piId: string; name: string; date: string }
export interface UpdatePiReleaseApiRequest { name?: string; date?: string }
export interface CreateSprintApiRequest { piId: string; name: string; order: number; capacity: number; startDate?: string | null; endDate?: string | null }
export interface UpdateSprintApiRequest { name?: string; capacity?: number; startDate?: string | null; endDate?: string | null }
export interface CreateFeatureApiRequest { piId: string; externalId: string; title: string; color?: string }
export interface UpdateFeatureApiRequest { externalId?: string; title?: string; color?: string }
export interface CreateStoryApiRequest {
  featureId: string; externalId: string; title: string; estimation: number;
  externalDependencySprint?: number | null; dependsOnStoryIds?: string[];
}
export interface UpdateStoryApiRequest {
  externalId?: string; title?: string; estimation?: number;
  externalDependencySprint?: number | null; dependsOnStoryIds?: string[];
}
export interface MoveStoryApiRequest { storyId: string; targetSprintId: string | null; force?: boolean }
export interface ValidateMoveApiRequest { storyId: string; targetSprintId: string }
export interface AutoScheduleApiRequest { piId: string }
export interface SuggestFixesApiRequest { piId: string }

// --- API Responses ---
export interface SchedulingWarning {
  type: WarningType; sprintId: string; sprintName: string;
  currentLoad: number; capacity: number; overcommitPercent: number;
}
export interface SchedulingError {
  type: ErrorType; storyIds: string[]; message: string;
}
export interface SchedulingApiResponse {
  assignments: { storyId: string; sprintId: string }[];
  warnings: SchedulingWarning[];
  errors: SchedulingError[];
}
export interface ValidationApiResponse {
  valid: boolean;
  warnings: SchedulingWarning[];
  errors: SchedulingError[];
  canForceAccept: boolean;
}
export interface SuggestedMove {
  storyId: string;
  storyExternalId: string;
  storyTitle: string;
  fromSprintId: string | null;
  fromSprintName: string | null;
  toSprintId: string | null;
  toSprintName: string | null;
  reason: string;
}
export interface SuggestFixesApiResponse {
  moves: SuggestedMove[];
  unfixable: { message: string }[];
}
export interface ImportApiResponse {
  imported: number; skipped: number;
  errors: { row: number; field: string; message: string }[];
}
