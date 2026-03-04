import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Team } from '../../domain/entities/team';
import { ITeamRepository, TEAM_REPOSITORY } from '../../repositories/team.repository.interface';

@Injectable()
export class CreateTeamUseCase {
  constructor(@Inject(TEAM_REPOSITORY) private readonly repo: ITeamRepository) {}
  async execute(name: string): Promise<Team> {
    return this.repo.save(new Team(randomUUID(), name));
  }
}
