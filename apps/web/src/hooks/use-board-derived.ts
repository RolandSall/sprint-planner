import { useMemo } from 'react';
import type { PiBoardProjection, FeatureProjection } from '@org/shared-types';

function buildReleaseSprintMap(
  sprints: { id: string; startDate: string | null; endDate: string | null }[],
  releases: { name: string; date: string; sprintId: string | null }[],
): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const release of releases) {
    // Priority 1: explicit sprint assignment
    if (release.sprintId) {
      const sprint = sprints.find(s => s.id === release.sprintId);
      if (sprint) {
        result.set(sprint.id, [...(result.get(sprint.id) ?? []), release.name]);
        continue;
      }
    }
    // Priority 2: date-based matching
    const rel = new Date(release.date).getTime();
    for (const s of sprints) {
      if (s.startDate && s.endDate) {
        if (rel >= new Date(s.startDate).getTime() && rel <= new Date(s.endDate).getTime()) {
          result.set(s.id, [...(result.get(s.id) ?? []), release.name]);
          break;
        }
      }
    }
  }
  return result;
}

export function useBoardDerivedData(board: PiBoardProjection | undefined) {
  // Flat list of all stories across sprints and backlog
  const allStories = useMemo(
    () => (board ? [...board.sprints.flatMap(s => s.stories), ...board.backlog] : []),
    [board],
  );

  // featureId → FeatureProjection
  const featureMap = useMemo(
    () => new Map<string, FeatureProjection>(board?.features.map(f => [f.id, f]) ?? []),
    [board],
  );

  // sprintId → SprintProjection
  const sprintMap = useMemo(
    () => new Map(board?.sprints.map(s => [s.id, s]) ?? []),
    [board],
  );

  // featureId → name of the last sprint (by order) that contains one of its stories
  const deliverySprintMap = useMemo((): Map<string, string> => {
    if (!board) return new Map();
    const map = new Map<string, { order: number; name: string }>();
    for (const sprint of board.sprints) {
      for (const story of sprint.stories) {
        const cur = map.get(story.featureId);
        if (!cur || sprint.order > cur.order) {
          map.set(story.featureId, { order: sprint.order, name: sprint.name });
        }
      }
    }
    return new Map([...map.entries()].map(([id, v]) => [id, v.name]));
  }, [board]);

  // sprintId → feature externalIds delivered in that sprint
  const deliveryFeaturesBySprint = useMemo((): Map<string, string[]> => {
    if (!board) return new Map();
    const result = new Map<string, string[]>();
    for (const sprint of board.sprints) {
      const names: string[] = [];
      for (const [featureId, sprintName] of deliverySprintMap.entries()) {
        if (sprintName === sprint.name) {
          const feature = featureMap.get(featureId);
          if (feature) names.push(feature.externalId ?? feature.title);
        }
      }
      if (names.length > 0) result.set(sprint.id, names);
    }
    return result;
  }, [board, deliverySprintMap, featureMap]);

  // sprintId → release names whose date falls within that sprint's date range
  const releaseSprintMap = useMemo(
    () => (board ? buildReleaseSprintMap(board.sprints, board.releases) : new Map<string, string[]>()),
    [board],
  );

  // Total load across all stories (scheduled + backlog)
  const totalLoad = useMemo(
    () => allStories.reduce((sum, s) => sum + s.estimation, 0),
    [allStories],
  );

  // storyId → dependency ordering violation messages
  // A violation occurs when story A is in sprint N and depends on story B which is in sprint M > N
  const depOrderWarnings = useMemo((): Map<string, string[]> => {
    const map = new Map<string, string[]>();
    if (!board) return map;
    const storySprintMap = new Map<string, { order: number; name: string }>();
    for (const sprint of board.sprints) {
      for (const story of sprint.stories) {
        storySprintMap.set(story.id, { order: sprint.order, name: sprint.name });
      }
    }
    for (const sprint of board.sprints) {
      for (const story of sprint.stories) {
        const msgs: string[] = [];
        // Internal dep ordering violation
        for (const depId of story.dependsOnStoryIds) {
          const depSprint = storySprintMap.get(depId);
          if (depSprint && depSprint.order > sprint.order) {
            const depStory = allStories.find(s => s.id === depId);
            msgs.push(
              `Depends on ${depStory?.externalId ?? depId} (in ${depSprint.name}), which comes after ${sprint.name}`
            );
          }
        }
        // External dependency violation: story in sprint N but ext dep not ready until after sprint M >= N
        if (story.externalDependencySprint != null && story.externalDependencySprint >= sprint.order) {
          msgs.push(
            `External team dependency not ready until after Sprint ${story.externalDependencySprint}, but story is in ${sprint.name} (Sprint ${sprint.order})`
          );
        }
        if (msgs.length > 0) map.set(story.id, msgs);
      }
    }
    return map;
  }, [board, allStories]);

  // releaseId → max sprint order allowed for that release
  const releaseMaxOrder = useMemo((): Map<string, number> => {
    if (!board) return new Map();
    const map = new Map<string, number>();
    for (const release of board.releases) {
      if (release.sprintId) {
        const sprint = board.sprints.find(s => s.id === release.sprintId);
        if (sprint) { map.set(release.id, sprint.order); continue; }
      }
      const rel = new Date(release.date).getTime();
      for (const s of board.sprints) {
        if (s.startDate && s.endDate) {
          if (rel >= new Date(s.startDate).getTime() && rel <= new Date(s.endDate).getTime()) {
            map.set(release.id, s.order);
            break;
          }
        }
      }
    }
    return map;
  }, [board]);

  // storyId → release constraint violation messages
  const releaseViolationWarnings = useMemo((): Map<string, string[]> => {
    const map = new Map<string, string[]>();
    if (!board) return map;
    for (const sprint of board.sprints) {
      for (const story of sprint.stories) {
        const feature = featureMap.get(story.featureId);
        if (!feature?.releaseId) continue;
        const maxOrder = releaseMaxOrder.get(feature.releaseId);
        if (maxOrder != null && sprint.order > maxOrder) {
          const release = board.releases.find(r => r.id === feature.releaseId);
          const relSprint = board.sprints.find(s => s.order === maxOrder);
          map.set(story.id, [
            `Feature "${feature.title}" must complete before ${release?.name ?? 'release'} (${relSprint?.name ?? `Sprint ${maxOrder}`}), but this story is in ${sprint.name}`,
          ]);
        }
      }
    }
    return map;
  }, [board, featureMap, releaseMaxOrder]);

  const hasReleases = (board?.releases.length ?? 0) > 0;
  const hasSprintDates = board?.sprints.some(s => s.startDate) ?? false;

  return {
    allStories,
    featureMap,
    sprintMap,
    deliverySprintMap,
    deliveryFeaturesBySprint,
    releaseSprintMap,
    totalLoad,
    depOrderWarnings,
    releaseViolationWarnings,
    hasReleases,
    hasSprintDates,
  };
}
