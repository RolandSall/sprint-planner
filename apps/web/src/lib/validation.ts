import type { StoryProjection, SprintProjection, SchedulingWarning, SchedulingError } from '@org/shared-types';

export interface ClientValidationResult {
  warnings: SchedulingWarning[];
  errors: SchedulingError[];
  canForceAccept: boolean;
}

export function validateMove(
  story: StoryProjection,
  targetSprint: SprintProjection,
  allSprints: SprintProjection[],
  allStories: StoryProjection[],
): ClientValidationResult {
  const errors: SchedulingError[] = [];
  const warnings: SchedulingWarning[] = [];

  const storySprintMap = new Map(allStories.filter(s => s.sprintId).map(s => [s.id, allSprints.find(sp => sp.id === s.sprintId)!]));

  // Internal dependency check
  for (const depId of story.dependsOnStoryIds) {
    const depSprint = storySprintMap.get(depId);
    if (depSprint && depSprint.order >= targetSprint.order) {
      errors.push({ type: 'DEPENDENCY_VIOLATION', storyIds: [story.id, depId], message: `Dependency is in ${depSprint.name} — must precede ${targetSprint.name}.` });
    }
  }

  // External dependency check
  if (story.externalDependencySprint != null && targetSprint.order <= story.externalDependencySprint) {
    errors.push({ type: 'EXTERNAL_DEPENDENCY_VIOLATION', storyIds: [story.id], message: `External dependency available after Sprint ${story.externalDependencySprint}.` });
  }

  // Capacity check
  const sprintStories = allStories.filter(s => s.sprintId === targetSprint.id && s.id !== story.id);
  const currentLoad = sprintStories.reduce((sum, s) => sum + s.estimation, 0);
  const projectedLoad = currentLoad + story.estimation;
  const overcommitPercent = Math.round(((projectedLoad - targetSprint.capacity) / targetSprint.capacity) * 100);

  if (projectedLoad > targetSprint.capacity * 1.1) {
    errors.push({ type: 'UNSCHEDULABLE', storyIds: [story.id], message: `Exceeds 110% cap: ${projectedLoad} SP vs ${Math.round(targetSprint.capacity * 1.1)} max.` });
  } else if (projectedLoad > targetSprint.capacity) {
    warnings.push({ type: 'OVERCOMMIT', sprintId: targetSprint.id, sprintName: targetSprint.name, currentLoad: projectedLoad, capacity: targetSprint.capacity, overcommitPercent });
  }

  return { errors, warnings, canForceAccept: true };
}
