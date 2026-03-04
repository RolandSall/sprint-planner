import { Inject, Injectable } from '@nestjs/common';
import { Feature } from '../../domain/entities/feature';
import { IFeatureRepository, FEATURE_REPOSITORY } from '../../repositories/feature.repository.interface';

@Injectable()
export class FindFeaturesUseCase {
  constructor(@Inject(FEATURE_REPOSITORY) private readonly repo: IFeatureRepository) {}
  async byPiId(piId: string): Promise<Feature[]> { return this.repo.findByPiId(piId); }
}
