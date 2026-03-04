import { Injectable } from '@nestjs/common';
import { topologicalSort } from './algorithms/topological-sort';
import type { Sprint } from '../../domain/entities/sprint';
import type { Story } from '../../domain/entities/story';
import type { Feature } from '../../domain/entities/feature';
import type { PiRelease } from '../../domain/entities/pi-release';
import type {
  SchedulingInput, ScheduleOptions, ScheduleResult,
  SchedulingWeights,
  ValidationInput, ValidationOutput,
  InternalSuggestedMove, InternalSchedulingWarning, InternalSchedulingError,
} from './types/scheduling-types';
import { DEFAULT_WEIGHTS } from './types/scheduling-types';

interface MutableState {
  storySprintId: Map<string, string | null>;
  sprintLoad: Map<string, number>;
  /** Tracks how many stories of each feature are in each sprint: featureId → sprintId → count */
  featureSprintCount: Map<string, Map<string, number>>;
  movedStoryIds: Set<string>;
  /** Stories placed by Phase 2-3 (release/dep fixes) — protected from Phase 4 rebalancing */
  protectedStoryIds: Set<string>;
  moves: InternalSuggestedMove[];
}

@Injectable()
export class SchedulingService {

  schedule(
    { stories, sprints, dependencies, features, releases }: SchedulingInput,
    options: ScheduleOptions,
  ): ScheduleResult {
    // --- SETUP ---
    const weights: SchedulingWeights = { ...DEFAULT_WEIGHTS, ...options.weights };
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

    // Build feature → max sprint order map from release deadlines
    const featureMaxOrder = this.buildFeatureMaxOrder(features ?? [], releases ?? [], sortedSprints);

    // Mutable state
    const state: MutableState = {
      storySprintId: new Map<string, string | null>(),
      sprintLoad: new Map(sortedSprints.map(s => [s.id, 0])),
      featureSprintCount: new Map(),
      movedStoryIds: new Set(),
      protectedStoryIds: new Set(),
      moves: [],
    };

    // Initialize state from current story placements
    for (const story of stories) {
      state.storySprintId.set(story.id, story.sprintId);
      if (story.sprintId && state.sprintLoad.has(story.sprintId)) {
        state.sprintLoad.set(story.sprintId, (state.sprintLoad.get(story.sprintId) ?? 0) + story.estimation);
        this.incrementFeatureCount(state, story.featureId, story.sprintId);
      }
    }

    // --- PHASE 1: Schedule backlog ---
    if (options.scheduleBacklog) {
      for (const storyId of sorted) {
        const story = storyMap.get(storyId);
        if (!story || story.sprintId != null) continue; // skip already-placed

        const strictEarliest = this.computeEarliestOrder(story, depsOf, state.storySprintId, sprintMap, false);
        const maxOrder = featureMaxOrder.get(story.featureId);
        const lastOrder = sortedSprints[sortedSprints.length - 1].order;

        // Try strict dep ordering first; if it exceeds release deadline or last sprint, allow same-sprint as fallback
        let effectiveEarliest = strictEarliest;
        let depWarning = '';
        const ceiling = maxOrder ?? lastOrder;
        if (strictEarliest > ceiling) {
          const relaxedEarliest = this.computeEarliestOrder(story, depsOf, state.storySprintId, sprintMap, true);
          effectiveEarliest = relaxedEarliest;
          depWarning = maxOrder != null
            ? ` (same-sprint dep allowed to meet release deadline by sprint ${maxOrder})`
            : ` (same-sprint dep allowed — dependency chain exceeds available sprints)`;
        }

        let candidates = sortedSprints.filter(s =>
          s.order >= effectiveEarliest && (maxOrder == null || s.order <= maxOrder)
        );

        // Filter out sprints that would exceed same-sprint chain depth limit
        if (effectiveEarliest < strictEarliest) {
          candidates = candidates.filter(s =>
            this.computeSameSprintChainDepth(story.id, s.id, depsOf, state.storySprintId) <= weights.maxSameSprintChainDepth
            || s.order >= strictEarliest
          );
        }

        if (candidates.length === 0) {
          errors.push({ type: 'UNSCHEDULABLE', storyIds: [storyId], message: `${story.externalId} "${story.title}" has no eligible sprint.` });
          continue;
        }

        const target = this.findBestSprint(story.estimation, story.featureId, candidates, state, true, weights);
        if (target) {
          const reason = `Scheduled from backlog into ${target.name}` + depWarning;
          this.buildMove(storyId, story, null, null, target, reason, state);
          if (depWarning) {
            errors.push({ type: 'DEPENDENCY_VIOLATION', storyIds: [storyId], message: `${story.externalId} "${story.title}" placed in ${target.name} with same-sprint dep (strict ordering requires sprint ${strictEarliest}+).` });
          }
        } else {
          errors.push({ type: 'UNSCHEDULABLE', storyIds: [storyId], message: `${story.externalId} "${story.title}" (${story.estimation} SP) doesn't fit in any eligible sprint — all are over capacity.` });
        }
      }
    }

    // --- PHASE 2: Enforce release deadlines ---
    // Move stories that are in sprints past their feature's release deadline
    if (options.enforceReleaseDeadlines) {
      for (const story of stories) {
        const maxOrder = featureMaxOrder.get(story.featureId);
        if (maxOrder == null) continue;

        const currentSprintId = state.storySprintId.get(story.id);
        if (!currentSprintId) continue;
        const currentSprint = sprintMap.get(currentSprintId);
        if (!currentSprint || currentSprint.order <= maxOrder) continue;

        // Story is past the release deadline — move it earlier
        // Try strict deps first, then allow same-sprint as fallback for release
        const strictEarliest = this.computeEarliestOrder(story, depsOf, state.storySprintId, sprintMap, false);
        const relaxedEarliest = strictEarliest > maxOrder
          ? this.computeEarliestOrder(story, depsOf, state.storySprintId, sprintMap, true)
          : strictEarliest;
        const effectiveEarliest = relaxedEarliest;
        let candidates = sortedSprints.filter(s =>
          s.order >= effectiveEarliest && s.order <= maxOrder
        );
        if (effectiveEarliest < strictEarliest) {
          candidates = candidates.filter(s =>
            this.computeSameSprintChainDepth(story.id, s.id, depsOf, state.storySprintId) <= weights.maxSameSprintChainDepth
            || s.order >= strictEarliest
          );
        }
        const target = this.findBestSprint(story.estimation, story.featureId, candidates, state, true, weights);

        if (target) {
          const reason = `Release deadline requires completion by ${target.name} (max sprint ${maxOrder})`;
          this.buildMove(story.id, story, currentSprintId, currentSprint.name, target, reason, state);
          state.protectedStoryIds.add(story.id);
          if (strictEarliest > maxOrder) {
            errors.push({ type: 'DEPENDENCY_VIOLATION', storyIds: [story.id], message: `${story.externalId} "${story.title}" moved to ${target.name} for release deadline, but dependency requires sprint ${strictEarliest}+ (same-sprint allowed).` });
          }
        } else {
          errors.push({
            type: 'UNSCHEDULABLE',
            storyIds: [story.id],
            message: `${story.externalId} "${story.title}" cannot meet release deadline (max sprint ${maxOrder}) — no eligible sprint with capacity.`,
          });
        }
      }
    }

    // --- PHASE 3: Fix dep violations ---
    if (options.fixViolations) {
      for (const story of stories) {
        const currentSprintId = state.storySprintId.get(story.id);
        if (!currentSprintId) continue;
        const currentSprint = sprintMap.get(currentSprintId);
        if (!currentSprint) continue;

        const strictMinOrder = this.computeEarliestOrder(story, depsOf, state.storySprintId, sprintMap, false);

        if (strictMinOrder > currentSprint.order) {
          const maxOrder = featureMaxOrder.get(story.featureId);
          // Try strict first; if release conflicts, allow same-sprint as fallback
          let effectiveMin = strictMinOrder;
          const releaseCapped = maxOrder != null && strictMinOrder > maxOrder;
          if (releaseCapped) {
            effectiveMin = this.computeEarliestOrder(story, depsOf, state.storySprintId, sprintMap, true);
          }
          let candidates = sortedSprints.filter(s =>
            s.order >= effectiveMin && (maxOrder == null || s.order <= maxOrder) && s.id !== currentSprintId
          );
          if (releaseCapped) {
            candidates = candidates.filter(s =>
              this.computeSameSprintChainDepth(story.id, s.id, depsOf, state.storySprintId) <= weights.maxSameSprintChainDepth
              || s.order >= strictMinOrder
            );
          }
          const target = this.findBestSprint(story.estimation, story.featureId, candidates, state, true, weights);

          if (target && target.id !== currentSprintId) {
            const reason = releaseCapped
              ? `Release deadline (sprint ${maxOrder}) — placed in ${target.name} (same-sprint dep allowed)`
              : `Dependency requires this story to be in ${target.name} or later`;
            this.buildMove(story.id, story, currentSprintId, currentSprint.name, target, reason, state);
            state.protectedStoryIds.add(story.id);
            if (releaseCapped) {
              errors.push({ type: 'DEPENDENCY_VIOLATION', storyIds: [story.id], message: `${story.externalId} "${story.title}" moved to ${target.name} for release deadline, but dependency requires sprint ${strictMinOrder}+ (same-sprint allowed).` });
            }
          } else if (releaseCapped) {
            errors.push({ type: 'DEPENDENCY_VIOLATION', storyIds: [story.id], message: `${story.externalId} "${story.title}" has a dependency violation (needs sprint ${strictMinOrder}+) but release deadline caps at sprint ${maxOrder}.` });
          } else {
            unfixable.push({
              message: `${story.externalId} "${story.title}" has a dependency violation but no sprint exists after order ${strictMinOrder} to move it to.`,
            });
          }
        }
      }
    }

    // --- PHASE 4: Fix overcommit ---
    if (options.fixOvercommit) {
      for (const sprint of sortedSprints) {
        const load = state.sprintLoad.get(sprint.id) ?? 0;
        if (load <= sprint.capacity) continue;

        const sprintStories = stories
          .filter(s => state.storySprintId.get(s.id) === sprint.id)
          .sort((a, b) => b.estimation - a.estimation);

        for (const story of sprintStories) {
          if ((state.sprintLoad.get(sprint.id) ?? 0) <= sprint.capacity) break;
          if (state.protectedStoryIds.has(story.id)) continue;

          const minOrder = this.computeEarliestOrder(story, depsOf, state.storySprintId, sprintMap);
          const maxOrder = featureMaxOrder.get(story.featureId);
          const candidates = sortedSprints.filter(s =>
            s.id !== sprint.id && s.order >= minOrder && (maxOrder == null || s.order <= maxOrder)
          );
          const target = this.findBestSprint(story.estimation, story.featureId, candidates, state, false, weights);

          if (target) {
            const currentLoad = state.sprintLoad.get(sprint.id) ?? 0;
            this.buildMove(story.id, story, sprint.id, sprint.name, target,
              `${sprint.name} is overcommitted (${currentLoad}/${sprint.capacity} SP)`, state);
          }
        }
      }
    }

    // --- PHASE 5: Rebalance — pull stories from later sprints into earlier ones ---
    // Multi-pass: when a story moves earlier, its dependents' earliest sprint changes,
    // enabling cascading moves (e.g., S5→S3 lets S6 dependent move to S4).
    // Fill-balance weight in findBestSprint handles pull toward underfilled sprints.
    if (options.fixOvercommit) {
      let moved = true;
      let passes = 0;
      while (moved && passes < 10) {
        moved = false;
        passes++;
        const reversedSprints = [...sortedSprints].reverse();

        for (const sprint of reversedSprints) {
          const sprintStories = stories
            .filter(s => state.storySprintId.get(s.id) === sprint.id)
            .sort((a, b) => a.estimation - b.estimation); // smallest first — easier to fit

          for (const story of sprintStories) {
            if (state.protectedStoryIds.has(story.id)) continue;

            const strictMin = this.computeEarliestOrder(story, depsOf, state.storySprintId, sprintMap, false);
            const maxOrder = featureMaxOrder.get(story.featureId);

            const candidates = sortedSprints.filter(s => {
              if (s.order >= sprint.order) return false; // must be earlier
              if (s.order < strictMin) return false; // must respect deps
              if (maxOrder != null && s.order > maxOrder) return false;
              const projectedLoad = (state.sprintLoad.get(s.id) ?? 0) + story.estimation;
              if (projectedLoad > s.capacity) return false; // must fit within capacity
              return true;
            });

            if (candidates.length === 0) continue;

            const target = this.findBestSprint(story.estimation, story.featureId, candidates, state, true, weights);
            if (target) {
              const reason = `Rebalanced from ${sprint.name} to fill earlier capacity in ${target.name}`;
              this.buildMove(story.id, story, sprint.id, sprint.name, target, reason, state);
              moved = true;
            }
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
      if (depSprint && depSprint.order >= targetSprint.order) {
        errors.push({
          type: 'DEPENDENCY_VIOLATION',
          storyIds: [story.id, dep.dependsOnStoryId],
          message: `Dependency is in ${depSprint.name} (order ${depSprint.order}) — must be in an earlier sprint than ${targetSprint.name}.`,
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

  /**
   * Build a map of featureId → max allowed sprint order based on release deadlines.
   * If a feature has a releaseId, we resolve which sprint that release maps to:
   * 1. If the release has an explicit sprintId, use that sprint's order.
   * 2. Otherwise, find the sprint whose date range contains the release date.
   */
  private buildFeatureMaxOrder(
    features: Feature[],
    releases: PiRelease[],
    sortedSprints: Sprint[],
  ): Map<string, number> {
    const result = new Map<string, number>();
    const releaseMap = new Map(releases.map(r => [r.id, r]));

    for (const feature of features) {
      if (!feature.releaseId) continue;
      const release = releaseMap.get(feature.releaseId);
      if (!release) continue;

      let maxOrder: number | null = null;

      // Priority 1: explicit sprint assignment on the release
      if (release.sprintId) {
        const sprint = sortedSprints.find(s => s.id === release.sprintId);
        if (sprint) maxOrder = sprint.order;
      }

      // Priority 2: date-based matching (release date falls within sprint range)
      if (maxOrder == null) {
        const relDate = release.date.getTime();
        for (const s of sortedSprints) {
          if (s.startDate && s.endDate) {
            if (relDate >= s.startDate.getTime() && relDate <= s.endDate.getTime()) {
              maxOrder = s.order;
              break;
            }
          }
        }
      }

      if (maxOrder != null) {
        result.set(feature.id, maxOrder);
      }
    }

    return result;
  }

  /**
   * Compute earliest sprint order for a story based on its dependencies.
   * @param allowSameSprint When false (default), deps must be in strictly earlier sprints.
   *                        When true (last resort for hard deadlines), same sprint is allowed.
   */
  private computeEarliestOrder(
    story: Story,
    depsOf: Map<string, string[]>,
    storySprintId: Map<string, string | null>,
    sprintMap: Map<string, Sprint>,
    allowSameSprint = false,
  ): number {
    let earliest = 1;
    const offset = allowSameSprint ? 0 : 1;

    for (const depId of (depsOf.get(story.id) ?? [])) {
      const depSprintId = storySprintId.get(depId);
      if (depSprintId) {
        const depSprint = sprintMap.get(depSprintId);
        if (depSprint) earliest = Math.max(earliest, depSprint.order + offset);
      }
    }

    if (story.externalDependencySprint != null) {
      earliest = Math.max(earliest, story.externalDependencySprint + 1);
    }

    return earliest;
  }

  /**
   * Find the best sprint for a story considering capacity AND feature distribution.
   * Prefers sprints that have fewer stories of the same feature to spread work out.
   */
  /**
   * @param preferEarly When true, adds a sprint-order penalty so earlier sprints are preferred.
   *                    Use for Phases 1-3 to leave room for dependency chains.
   *                    Soft cap is always 120% capacity.
   */
  private findBestSprint(
    estimation: number,
    featureId: string,
    candidates: Sprint[],
    state: MutableState,
    preferEarly = false,
    weights: SchedulingWeights = DEFAULT_WEIGHTS,
  ): Sprint | null {
    if (candidates.length === 0) return null;

    const maxOrder = Math.max(...candidates.map(c => c.order));

    // Score each candidate: lower is better
    const scored = candidates.map(s => {
      const load = state.sprintLoad.get(s.id) ?? 0;
      const featureCounts = state.featureSprintCount.get(featureId);
      const featureCount = featureCounts?.get(s.id) ?? 0;
      const loadRatio = (load + estimation) / s.capacity;
      const featurePenalty = featureCount * weights.featureSpreadPenalty;
      const orderPenalty = preferEarly ? (s.order / maxOrder) * weights.earlyOrderPenalty : 0;
      const fillBalancePenalty = weights.fillBalance * Math.max(0, loadRatio - 1.0);
      return { sprint: s, load, loadRatio, featureCount, score: loadRatio + featurePenalty + orderPenalty + fillBalancePenalty };
    });

    // Tier 1: fits within capacity — pick lowest score (best spread + least loaded)
    const fits = scored
      .filter(s => s.load + estimation <= s.sprint.capacity)
      .sort((a, b) => a.score - b.score);
    if (fits.length > 0) return fits[0].sprint;

    // Tier 2: fits within soft cap
    const softFits = scored
      .filter(s => s.load + estimation <= s.sprint.capacity * weights.softCapMultiplier)
      .sort((a, b) => a.score - b.score);
    if (softFits.length > 0) return softFits[0].sprint;

    // Tier 3: least-loaded by score
    scored.sort((a, b) => a.score - b.score);
    return scored[0].sprint;
  }

  /**
   * Compute the same-sprint dependency chain depth if storyId were placed in targetSprintId.
   * DFS backwards through deps that are already in the target sprint.
   * Returns chain depth including the story itself (A→B = 2, A→B→C = 3).
   */
  private computeSameSprintChainDepth(
    storyId: string,
    targetSprintId: string,
    depsOf: Map<string, string[]>,
    storySprintId: Map<string, string | null>,
  ): number {
    const depIds = depsOf.get(storyId) ?? [];
    const sameSprintDeps = depIds.filter(d => storySprintId.get(d) === targetSprintId);
    if (sameSprintDeps.length === 0) return 1;
    let maxDepth = 0;
    for (const depId of sameSprintDeps) {
      const depth = this.computeSameSprintChainDepth(depId, targetSprintId, depsOf, storySprintId);
      maxDepth = Math.max(maxDepth, depth);
    }
    return 1 + maxDepth;
  }

  private incrementFeatureCount(state: MutableState, featureId: string, sprintId: string): void {
    if (!state.featureSprintCount.has(featureId)) {
      state.featureSprintCount.set(featureId, new Map());
    }
    const counts = state.featureSprintCount.get(featureId)!;
    counts.set(sprintId, (counts.get(sprintId) ?? 0) + 1);
  }

  private decrementFeatureCount(state: MutableState, featureId: string, sprintId: string): void {
    const counts = state.featureSprintCount.get(featureId);
    if (counts) {
      const c = (counts.get(sprintId) ?? 1) - 1;
      if (c <= 0) counts.delete(sprintId);
      else counts.set(sprintId, c);
    }
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
      this.decrementFeatureCount(state, story.featureId, fromSprintId);
    }
    state.sprintLoad.set(toSprint.id, (state.sprintLoad.get(toSprint.id) ?? 0) + story.estimation);
    this.incrementFeatureCount(state, story.featureId, toSprint.id);
    state.storySprintId.set(storyId, toSprint.id);
    state.movedStoryIds.add(storyId);
  }
}
