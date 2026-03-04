import { Inject, Injectable } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@rolandsall24/nest-mediator';
import { FindTeamByIdQuery } from './find-team-by-id.query';
import { Team } from '../../domain/entities/team';
import { ITeamRepository, TEAM_REPOSITORY } from '../../repositories/team.repository.interface';

@Injectable()
@QueryHandler(FindTeamByIdQuery)
export class FindTeamByIdHandler implements IQueryHandler<FindTeamByIdQuery, Team | null> {
  constructor(@Inject(TEAM_REPOSITORY) private readonly repo: ITeamRepository) {}
  async execute(query: FindTeamByIdQuery): Promise<Team | null> { return this.repo.findById(query.teamId); }
}
