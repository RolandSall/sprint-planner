import type { Team } from '../domain/entities/team';
export const TEAM_REPOSITORY = Symbol('TEAM_REPOSITORY');
export interface ITeamRepository {
  findAll(): Promise<Team[]>;
  findById(id: string): Promise<Team | null>;
  save(team: Team): Promise<Team>;
  delete(id: string): Promise<void>;
}
