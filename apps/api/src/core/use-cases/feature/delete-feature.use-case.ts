import { Inject, Injectable } from '@nestjs/common';
import { IFeatureRepository, FEATURE_REPOSITORY } from '../../repositories/feature.repository.interface';

@Injectable()
export class DeleteFeatureUseCase {
  constructor(@Inject(FEATURE_REPOSITORY) private readonly repo: IFeatureRepository) {}
  async execute(id: string): Promise<void> { return this.repo.delete(id); }
}
