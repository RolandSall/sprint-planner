import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Feature } from '../../domain/entities/feature';
import { IFeatureRepository, FEATURE_REPOSITORY } from '../../repositories/feature.repository.interface';

@Injectable()
export class UpdateFeatureUseCase {
  constructor(@Inject(FEATURE_REPOSITORY) private readonly repo: IFeatureRepository) {}
  async execute(id: string, dto: { externalId?: string; title?: string; color?: string }): Promise<Feature> {
    const f = await this.repo.findById(id);
    if (!f) throw new NotFoundException(`Feature ${id} not found`);
    if (dto.externalId !== undefined) f.externalId = dto.externalId;
    if (dto.title !== undefined) f.title = dto.title;
    if (dto.color !== undefined) f.color = dto.color;
    return this.repo.save(f);
  }
}
