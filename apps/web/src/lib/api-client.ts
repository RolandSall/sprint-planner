import type {
  TeamProjection, CreateTeamApiRequest,
  PiProjection, CreatePiApiRequest,
  PiReleaseProjection, CreatePiReleaseApiRequest,
  SprintProjection, CreateSprintApiRequest, UpdateSprintApiRequest,
  FeatureProjection, CreateFeatureApiRequest, UpdateFeatureApiRequest,
  StoryProjection, CreateStoryApiRequest, UpdateStoryApiRequest, MoveStoryApiRequest,
  PiBoardProjection, SchedulingApiResponse, SuggestFixesApiResponse, ImportApiResponse,
} from '@org/shared-types';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Teams
  getTeams: () => request<TeamProjection[]>('/teams'),
  createTeam: (body: CreateTeamApiRequest) =>
    request<TeamProjection>('/teams', { method: 'POST', body: JSON.stringify(body) }),

  // PIs
  getPisByTeam: (teamId: string) => request<PiProjection[]>(`/pis?teamId=${teamId}`),
  createPi: (body: CreatePiApiRequest) =>
    request<PiProjection>('/pis', { method: 'POST', body: JSON.stringify(body) }),
  deletePi: (id: string) => request<void>(`/pis/${id}`, { method: 'DELETE' }),

  // PI Releases
  createPiRelease: (body: CreatePiReleaseApiRequest) =>
    request<PiReleaseProjection>('/pi-releases', { method: 'POST', body: JSON.stringify(body) }),
  updatePiRelease: (id: string, body: { name?: string; date?: string }) =>
    request<PiReleaseProjection>(`/pi-releases/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deletePiRelease: (id: string) => request<void>(`/pi-releases/${id}`, { method: 'DELETE' }),

  // Sprints
  createSprint: (body: CreateSprintApiRequest) =>
    request<SprintProjection>('/sprints', { method: 'POST', body: JSON.stringify(body) }),
  updateSprint: (id: string, body: UpdateSprintApiRequest) =>
    request<SprintProjection>(`/sprints/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteSprint: (id: string) => request<void>(`/sprints/${id}`, { method: 'DELETE' }),

  // Features
  getFeaturesByPi: (piId: string) => request<FeatureProjection[]>(`/features?piId=${piId}`),
  createFeature: (body: CreateFeatureApiRequest) =>
    request<FeatureProjection>('/features', { method: 'POST', body: JSON.stringify(body) }),
  updateFeature: (id: string, body: UpdateFeatureApiRequest) =>
    request<FeatureProjection>(`/features/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteFeature: (id: string) => request<void>(`/features/${id}`, { method: 'DELETE' }),

  // Stories
  getStoriesByFeature: (featureId: string) => request<StoryProjection[]>(`/stories?featureId=${featureId}`),
  createStory: (body: CreateStoryApiRequest) =>
    request<StoryProjection>('/stories', { method: 'POST', body: JSON.stringify(body) }),
  updateStory: (id: string, body: UpdateStoryApiRequest) =>
    request<StoryProjection>(`/stories/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteStory: (id: string) => request<void>(`/stories/${id}`, { method: 'DELETE' }),
  moveStory: (body: MoveStoryApiRequest) =>
    request<StoryProjection>('/stories/move', { method: 'POST', body: JSON.stringify(body) }),

  // Board
  getBoard: (piId: string) => request<PiBoardProjection>(`/board/${piId}`),

  // Scheduling
  autoSchedule: (piId: string) =>
    request<SchedulingApiResponse>('/scheduling/auto-schedule', { method: 'POST', body: JSON.stringify({ piId }) }),
  suggestFixes: (piId: string) =>
    request<SuggestFixesApiResponse>('/scheduling/suggest-fixes', { method: 'POST', body: JSON.stringify({ piId }) }),

  // Import
  importData: (piId: string, file: File): Promise<ImportApiResponse> => {
    const form = new FormData();
    form.append('file', file);
    return fetch(`${BASE}/import?piId=${piId}`, { method: 'POST', body: form }).then(r => r.json());
  },
};
