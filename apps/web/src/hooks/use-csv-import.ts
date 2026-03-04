import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';

export function useCsvImport(piId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => api.importCsv(piId, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board', piId] }),
  });
}
