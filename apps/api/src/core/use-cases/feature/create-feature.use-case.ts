import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Feature } from '../../domain/entities/feature';
import { IFeatureRepository, FEATURE_REPOSITORY } from '../../repositories/feature.repository.interface';

@Injectable()
export class CreateFeatureUseCase {
  constructor(@Inject(FEATURE_REPOSITORY) private readonly repo: IFeatureRepository) {}
  async execute(dto: { piId: string; externalId: string; title: string; color?: string }): Promise<Feature> {
    return this.repo.save(new Feature(randomUUID(), dto.piId, dto.externalId, dto.title, dto.color ?? null));
  }
}
