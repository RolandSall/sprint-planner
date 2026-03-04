import { Inject, Injectable } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@rolandsall24/nest-mediator';
import { FindPisByTeamIdQuery } from './find-pis-by-team-id.query';
import { PI } from '../../domain/entities/pi';
import { IPIRepository, PI_REPOSITORY } from '../../repositories/pi.repository.interface';

@Injectable()
@QueryHandler(FindPisByTeamIdQuery)
export class FindPisByTeamIdHandler implements IQueryHandler<FindPisByTeamIdQuery, PI[]> {
  constructor(@Inject(PI_REPOSITORY) private readonly repo: IPIRepository) {}
  async execute(query: FindPisByTeamIdQuery): Promise<PI[]> { return this.repo.findByTeamId(query.teamId); }
}
