import { Inject, Injectable } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@rolandsall24/nest-mediator';
import { FindPiReleasesByPiIdQuery } from './find-pi-releases-by-pi-id.query';
import { PiRelease } from '../../domain/entities/pi-release';
import { IPiReleaseRepository, PI_RELEASE_REPOSITORY } from '../../repositories/pi-release.repository.interface';

@Injectable()
@QueryHandler(FindPiReleasesByPiIdQuery)
export class FindPiReleasesByPiIdHandler implements IQueryHandler<FindPiReleasesByPiIdQuery, PiRelease[]> {
  constructor(@Inject(PI_RELEASE_REPOSITORY) private readonly repo: IPiReleaseRepository) {}
  async execute(query: FindPiReleasesByPiIdQuery): Promise<PiRelease[]> { return this.repo.findByPiId(query.piId); }
}
