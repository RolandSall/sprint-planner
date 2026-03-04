import { Inject, Injectable } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@rolandsall24/nest-mediator';
import { FindFeaturesByPiIdQuery } from './find-features-by-pi-id.query';
import { Feature } from '../../domain/entities/feature';
import { IFeatureRepository, FEATURE_REPOSITORY } from '../../repositories/feature.repository.interface';

@Injectable()
@QueryHandler(FindFeaturesByPiIdQuery)
export class FindFeaturesByPiIdHandler implements IQueryHandler<FindFeaturesByPiIdQuery, Feature[]> {
  constructor(@Inject(FEATURE_REPOSITORY) private readonly repo: IFeatureRepository) {}
  async execute(query: FindFeaturesByPiIdQuery): Promise<Feature[]> { return this.repo.findByPiId(query.piId); }
}
