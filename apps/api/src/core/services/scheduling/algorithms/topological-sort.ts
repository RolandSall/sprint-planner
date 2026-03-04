import type { Story } from '../../../domain/entities/story';
import type { StoryDependency } from '../../../domain/entities/story-dependency';
import type { InternalSchedulingError } from '../types/scheduling-types';

export interface TopologicalSortResult {
  sorted: string[];
  cycleError?: InternalSchedulingError;
}

export function topologicalSort(stories: Story[], deps: StoryDependency[]): TopologicalSortResult {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const s of stories) {
    inDegree.set(s.id, 0);
    adj.set(s.id, []);
  }

  for (const dep of deps) {
    if (!inDegree.has(dep.storyId) || !inDegree.has(dep.dependsOnStoryId)) continue;
    adj.get(dep.dependsOnStoryId)?.push(dep.storyId);
    inDegree.set(dep.storyId, (inDegree.get(dep.storyId) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    sorted.push(node);
    for (const neighbor of adj.get(node) ?? []) {
      const newDegree = (inDegree.get(neighbor) ?? 0) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) queue.push(neighbor);
    }
  }

  if (sorted.length !== stories.length) {
    const storyMap = new Map(stories.map(s => [s.id, s]));
    const cycleStoryIds = stories.filter(s => !sorted.includes(s.id)).map(s => s.id);
    const cycleLabels = cycleStoryIds.map(id => {
      const s = storyMap.get(id);
      return s ? `${s.externalId} (${s.title})` : id;
    });
    return {
      sorted,
      cycleError: {
        type: 'CYCLE_DETECTED',
        storyIds: cycleStoryIds,
        message: `Circular dependency detected. The following stories form a cycle — remove one dependency link to fix:\n${cycleLabels.join(' → ')} → ${cycleLabels[0]}`,
      },
    };
  }

  return { sorted };
}
