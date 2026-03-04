import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import type { CreatePiApiRequest } from '@org/shared-types';

export function usePis(teamId: string) {
  return useQuery({
    queryKey: ['pis', teamId],
    queryFn: () => api.getPisByTeam(teamId),
    enabled: !!teamId,
  });
}

export function useCreatePi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePiApiRequest) => api.createPi(body),
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['pis', data.teamId] }),
  });
}

export function useDeletePi(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (piId: string) => api.deletePi(piId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pis', teamId] }),
  });
}
