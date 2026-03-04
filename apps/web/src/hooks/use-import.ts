import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';

export function useImport(piId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => api.importData(piId, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board', piId] }),
  });
}
