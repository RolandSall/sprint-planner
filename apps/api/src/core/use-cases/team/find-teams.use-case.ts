import { Inject, Injectable } from '@nestjs/common';
import { Team } from '../../domain/entities/team';
import { ITeamRepository, TEAM_REPOSITORY } from '../../repositories/team.repository.interface';

@Injectable()
export class FindTeamsUseCase {
  constructor(@Inject(TEAM_REPOSITORY) private readonly repo: ITeamRepository) {}
  async execute(): Promise<Team[]> { return this.repo.findAll(); }
  async executeById(id: string): Promise<Team | null> { return this.repo.findById(id); }
}
