import type { Sprint } from '../domain/entities/sprint';
export const SPRINT_REPOSITORY = Symbol('SPRINT_REPOSITORY');
export interface ISprintRepository {
  findByPiId(piId: string): Promise<Sprint[]>;
  findById(id: string): Promise<Sprint | null>;
  save(sprint: Sprint): Promise<Sprint>;
  delete(id: string): Promise<void>;
}
