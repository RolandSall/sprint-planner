import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { PiBoardProjection } from '@org/shared-types';
import { api } from '../lib/api-client';

export function usePiBoard(piId: string) {
  return useQuery({
    queryKey: ['board', piId],
    queryFn: () => api.getBoard(piId),
    enabled: !!piId,
  });
}

export function useMoveStory(piId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.moveStory,
    onMutate: async ({ storyId, targetSprintId }) => {
      await qc.cancelQueries({ queryKey: ['board', piId] });
      const previous = qc.getQueryData<PiBoardProjection>(['board', piId]);

      qc.setQueryData<PiBoardProjection>(['board', piId], (old) => {
        if (!old) return old;

        // Find the story in sprints or backlog
        let movedStory = old.backlog.find(s => s.id === storyId);
        const newSprints = old.sprints.map(sprint => {
          const idx = sprint.stories.findIndex(s => s.id === storyId);
          if (idx === -1) return sprint;
          movedStory = sprint.stories[idx];
          return {
            ...sprint,
            stories: sprint.stories.filter(s => s.id !== storyId),
            currentLoad: sprint.currentLoad - sprint.stories[idx].estimation,
          };
        });

        if (!movedStory) return old;

        const updatedStory = { ...movedStory, sprintId: targetSprintId };

        const newBacklog = targetSprintId === null
          ? [...old.backlog.filter(s => s.id !== storyId), updatedStory]
          : old.backlog.filter(s => s.id !== storyId);

        const finalSprints = newSprints.map(sprint =>
          sprint.id === targetSprintId
            ? { ...sprint, stories: [...sprint.stories, updatedStory], currentLoad: sprint.currentLoad + updatedStory.estimation }
            : sprint,
        );

        return { ...old, sprints: finalSprints, backlog: newBacklog };
      });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(['board', piId], context.previous);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board', piId] }),
  });
}

export function useAutoSchedule(piId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.autoSchedule(piId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board', piId] }),
  });
}

export function useSuggestFixes(piId: string) {
  return useMutation({
    mutationFn: () => api.suggestFixes(piId),
  });
}

export function useValidateBoard(piId: string) {
  return useMutation({
    mutationFn: () => api.suggestFixes(piId),
  });
}

export function useExploreArrangements(piId: string) {
  return useMutation({
    mutationFn: () => api.exploreArrangements(piId),
  });
}

export function useApplyFixes(piId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (moves: { storyId: string; toSprintId: string | null }[]) => {
      for (const move of moves) {
        await api.moveStory({ storyId: move.storyId, targetSprintId: move.toSprintId });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board', piId] }),
  });
}
