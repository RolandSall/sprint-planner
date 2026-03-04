import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import type { CreateTeamApiRequest } from '@org/shared-types';

export function useTeams() {
  return useQuery({ queryKey: ['teams'], queryFn: api.getTeams });
}

export function useCreateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTeamApiRequest) => api.createTeam(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] }),
  });
}
