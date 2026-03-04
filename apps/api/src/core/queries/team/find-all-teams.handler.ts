import { Inject, Injectable } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@rolandsall24/nest-mediator';
import { FindAllTeamsQuery } from './find-all-teams.query';
import { Team } from '../../domain/entities/team';
import { ITeamRepository, TEAM_REPOSITORY } from '../../repositories/team.repository.interface';

@Injectable()
@QueryHandler(FindAllTeamsQuery)
export class FindAllTeamsHandler implements IQueryHandler<FindAllTeamsQuery, Team[]> {
  constructor(@Inject(TEAM_REPOSITORY) private readonly repo: ITeamRepository) {}
  async execute(_query: FindAllTeamsQuery): Promise<Team[]> { return this.repo.findAll(); }
}
