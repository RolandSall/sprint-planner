import type { PI } from '../domain/entities/pi';
export const PI_REPOSITORY = Symbol('PI_REPOSITORY');
export interface IPIRepository {
  findByTeamId(teamId: string): Promise<PI[]>;
  findById(id: string): Promise<PI | null>;
  save(pi: PI): Promise<PI>;
  delete(id: string): Promise<void>;
}
