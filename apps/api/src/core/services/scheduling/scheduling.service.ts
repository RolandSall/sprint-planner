import { Injectable } from '@nestjs/common';
import { topologicalSort } from './algorithms/topological-sort';
import type { Sprint } from '../../domain/entities/sprint';
import type { Story } from '../../domain/entities/story';
import type {
  SchedulingInput, ScheduleOptions, ScheduleResult,
  ValidationInput, ValidationOutput,
  InternalSuggestedMove, InternalSchedulingWarning, InternalSchedulingError,
} from './types/scheduling-types';

interface MutableState {
  storySprintId: Map<string, string | null>;
  sprintLoad: Map<string, number>;
  movedStoryIds: Set<string>;
  moves: InternalSuggestedMove[];
}

@Injectable()
export class SchedulingService {

  schedule(
    { stories, sprints, dependencies }: SchedulingInput,
    options: ScheduleOptions,
  ): ScheduleResult {
    // --- SETUP ---
    const sortedSprints = [...sprints].sort((a, b) => a.order - b.order);
    const errors: InternalSchedulingError[] = [];
    const unfixable: { message: string }[] = [];

    if (sortedSprints.length === 0) {
      errors.push({ type: 'UNSCHEDULABLE', storyIds: [], message: 'No sprints in this PI.' });
      return { moves: [], warnings: [], errors, unfixable };
    }

    const { sorted, cycleError } = topologicalSort(stories, dependencies);
    if (cycleError) {
      errors.push(cycleError);
      unfixable.push({ message: cycleError.message });
    }

    const storyMap = new Map(stories.map(s => [s.id, s]));
    const sprintMap = new Map(sortedSprints.map(s => [s.id, s]));

    // dep lookup: storyId → dependsOnStoryIds
    const depsOf = new Map<string, string[]>();
    for (const dep of dependencies) {
      if (!depsOf.has(dep.storyId)) depsOf.set(dep.storyId, []);
      depsOf.get(dep.storyId)!.push(dep.dependsOnStoryId);
    }

    // Mutable state
    const state: MutableState = {
      storySprintId: new Map<string, string | null>(),
      sprintLoad: new Map(sortedSprints.map(s => [s.id, 0])),
      movedStoryIds: new Set(),
      moves: [],
    };

    // Initialize state from current story placements
    for (const story of stories) {
      state.storySprintId.set(story.id, story.sprintId);
      if (story.sprintId && state.sprintLoad.has(story.sprintId)) {
        state.sprintLoad.set(story.sprintId, (state.sprintLoad.get(story.sprintId) ?? 0) + story.estimation);
      }
    }

    // --- PHASE 1: Schedule backlog ---
    if (options.scheduleBacklog) {
      for (const storyId of sorted) {
        const story = storyMap.get(storyId);
        if (!story || story.sprintId != null) continue; // skip already-placed

        const earliestOrder = this.computeEarliestOrder(story, depsOf, state.storySprintId, sprintMap);
        const candidates = sortedSprints.filter(s => s.order >= earliestOrder);

        if (candidates.length === 0) {
          errors.push({ type: 'UNSCHEDULABLE', storyIds: [storyId], message: `${story.externalId} "${story.title}" has no eligible sprint (all sprints before order ${earliestOrder} are blocked by dependencies).` });
          continue;
        }

        const target = this.findBestSprint(story.estimation, candidates, state.sprintLoad);
        if (target) {
          this.buildMove(storyId, story, null, null, target, `Scheduled from backlog into ${target.name}`, state);
        } else {
          errors.push({ type: 'UNSCHEDULABLE', storyIds: [storyId], message: `${story.externalId} "${story.title}" (${story.estimation} SP) doesn't fit in any eligible sprint — all are over capacity.` });
        }
      }
    }

    // --- PHASE 2: Fix dep violations ---
    if (options.fixViolations) {
      for (const story of stories) {
        const currentSprintId = state.storySprintId.get(story.id);
        if (!currentSprintId) continue;
        const currentSprint = sprintMap.get(currentSprintId);
        if (!currentSprint) continue;

        const requiredMinOrder = this.computeEarliestOrder(story, depsOf, state.storySprintId, sprintMap);

        if (requiredMinOrder > currentSprint.order) {
          const candidates = sortedSprints.filter(s => s.order >= requiredMinOrder);
          const target = this.findBestSprint(story.estimation, candidates, state.sprintLoad);

          if (target) {
            this.buildMove(story.id, story, currentSprintId, currentSprint.name, target,
              `Dependency requires this story to be in ${target.name} or later`, state);
          } else {
            unfixable.push({
              message: `${story.externalId} "${story.title}" has a dependency violation but no sprint exists after order ${requiredMinOrder} to move it to.`,
            });
          }
        }
      }
    }

    // --- PHASE 3: Fix overcommit ---
    if (options.fixOvercommit) {
      for (const sprint of sortedSprints) {
        const load = state.sprintLoad.get(sprint.id) ?? 0;
        if (load <= sprint.capacity) continue;

        const sprintStories = stories
          .filter(s => state.storySprintId.get(s.id) === sprint.id)
          .sort((a, b) => b.estimation - a.estimation);

        for (const story of sprintStories) {
          if ((state.sprintLoad.get(sprint.id) ?? 0) <= sprint.capacity) break;
          if (state.movedStoryIds.has(story.id)) continue;

          const minOrder = this.computeEarliestOrder(story, depsOf, state.storySprintId, sprintMap);
          const candidates = sortedSprints.filter(s => s.id !== sprint.id && s.order >= minOrder);
          const target = this.findBestSprint(story.estimation, candidates, state.sprintLoad);

          if (target) {
            const currentLoad = state.sprintLoad.get(sprint.id) ?? 0;
            this.buildMove(story.id, story, sprint.id, sprint.name, target,
              `${sprint.name} is overcommitted (${currentLoad}/${sprint.capacity} SP)`, state);
          }
        }
      }
    }

    // --- FINALIZE: compute overcommit warnings ---
    const warnings: InternalSchedulingWarning[] = [];
    for (const sprint of sortedSprints) {
      const load = state.sprintLoad.get(sprint.id) ?? 0;
      if (load > sprint.capacity) {
        warnings.push({
          type: 'OVERCOMMIT',
          sprintId: sprint.id,
          sprintName: sprint.name,
          currentLoad: load,
          capacity: sprint.capacity,
          overcommitPercent: Math.round(((load - sprint.capacity) / sprint.capacity) * 100),
        });
      }
    }

    return { moves: state.moves, warnings, errors, unfixable };
  }

  validateMove({ story, targetSprint, dependencies, storySprintMap, sprintCurrentLoad }: ValidationInput): ValidationOutput {
    const errors: ValidationOutput['errors'] = [];
    const warnings: ValidationOutput['warnings'] = [];

    for (const dep of dependencies.filter(d => d.storyId === story.id)) {
      const depSprint = storySprintMap.get(dep.dependsOnStoryId);
      if (depSprint && depSprint.order > targetSprint.order) {
        errors.push({
          type: 'DEPENDENCY_VIOLATION',
          storyIds: [story.id, dep.dependsOnStoryId],
          message: `Dependency is in ${depSprint.name} (order ${depSprint.order}) — must precede ${targetSprint.name}.`,
        });
      }
    }

    if (story.externalDependencySprint != null && targetSprint.order <= story.externalDependencySprint) {
      errors.push({
        type: 'EXTERNAL_DEPENDENCY_VIOLATION',
        storyIds: [story.id],
        message: `External dependency available after Sprint ${story.externalDependencySprint}. Cannot place in ${targetSprint.name}.`,
      });
    }

    const currentLoad = sprintCurrentLoad.get(targetSprint.id) ?? 0;
    const projectedLoad = currentLoad + story.estimation;
    const overcommitPercent = Math.round(((projectedLoad - targetSprint.capacity) / targetSprint.capacity) * 100);

    if (projectedLoad > targetSprint.capacity * 1.1) {
      errors.push({
        type: 'UNSCHEDULABLE',
        storyIds: [story.id],
        message: `Exceeds 110% cap: ${projectedLoad} SP vs ${Math.round(targetSprint.capacity * 1.1)} SP max.`,
      });
    } else if (projectedLoad > targetSprint.capacity) {
      warnings.push({ type: 'OVERCOMMIT', sprintId: targetSprint.id, sprintName: targetSprint.name, currentLoad: projectedLoad, capacity: targetSprint.capacity, overcommitPercent });
    }

    return { valid: errors.length === 0, warnings, errors, canForceAccept: errors.length === 0 && warnings.length > 0 };
  }

  // --- Shared helpers ---

  private computeEarliestOrder(
    story: Story,
    depsOf: Map<string, string[]>,
    storySprintId: Map<string, string | null>,
    sprintMap: Map<string, Sprint>,
  ): number {
    let earliest = 1;

    for (const depId of (depsOf.get(story.id) ?? [])) {
      const depSprintId = storySprintId.get(depId);
      if (depSprintId) {
        const depSprint = sprintMap.get(depSprintId);
        if (depSprint) earliest = Math.max(earliest, depSprint.order);
      }
    }

    if (story.externalDependencySprint != null) {
      earliest = Math.max(earliest, story.externalDependencySprint + 1);
    }

    return earliest;
  }

  private findBestSprint(
    estimation: number,
    candidates: Sprint[],
    sprintLoad: Map<string, number>,
  ): Sprint | null {
    if (candidates.length === 0) return null;

    // Tier 1: fits within capacity
    const fits = candidates.find(s => (sprintLoad.get(s.id) ?? 0) + estimation <= s.capacity);
    if (fits) return fits;

    // Tier 2: fits within 110% (slight overcommit, acceptable)
    const softFits = candidates.find(s => (sprintLoad.get(s.id) ?? 0) + estimation <= s.capacity * 1.1);
    if (softFits) return softFits;

    // Tier 3: least-loaded candidate by ratio
    const leastLoaded = [...candidates].sort((a, b) => {
      const loadA = (sprintLoad.get(a.id) ?? 0) / a.capacity;
      const loadB = (sprintLoad.get(b.id) ?? 0) / b.capacity;
      return loadA - loadB;
    });
    return leastLoaded[0];
  }

  private buildMove(
    storyId: string,
    story: Story,
    fromSprintId: string | null,
    fromSprintName: string | null,
    toSprint: Sprint,
    reason: string,
    state: MutableState,
  ): void {
    state.moves.push({
      storyId,
      storyExternalId: story.externalId,
      storyTitle: story.title,
      fromSprintId,
      fromSprintName,
      toSprintId: toSprint.id,
      toSprintName: toSprint.name,
      reason,
    });

    // Update load: subtract from old sprint, add to new sprint
    if (fromSprintId && state.sprintLoad.has(fromSprintId)) {
      state.sprintLoad.set(fromSprintId, (state.sprintLoad.get(fromSprintId) ?? 0) - story.estimation);
    }
    state.sprintLoad.set(toSprint.id, (state.sprintLoad.get(toSprint.id) ?? 0) + story.estimation);
    state.storySprintId.set(storyId, toSprint.id);
    state.movedStoryIds.add(storyId);
  }
}
