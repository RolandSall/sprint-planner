import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { IFeatureRepository, FEATURE_REPOSITORY } from '../../repositories/feature.repository.interface';
import { IStoryRepository, STORY_REPOSITORY } from '../../repositories/story.repository.interface';
import { IStoryDependencyRepository, STORY_DEPENDENCY_REPOSITORY } from '../../repositories/story-dependency.repository.interface';
import { ICsvParser, CSV_PARSER } from '../../ports/csv-parser.port';
import { StoryDependency } from '../../domain/entities/story-dependency';
import { CreateFeatureUseCase } from '../feature/create-feature.use-case';
import { CreateStoryUseCase } from '../story/create-story.use-case';
import type { ImportApiResponse } from '@org/shared-types';

@Injectable()
export class ImportCsvUseCase {
  constructor(
    @Inject(CSV_PARSER) private readonly csvParser: ICsvParser,
    private readonly createFeature: CreateFeatureUseCase,
    private readonly createStory: CreateStoryUseCase,
    @Inject(FEATURE_REPOSITORY) private readonly featureRepo: IFeatureRepository,
    @Inject(STORY_REPOSITORY) private readonly storyRepo: IStoryRepository,
    @Inject(STORY_DEPENDENCY_REPOSITORY) private readonly depRepo: IStoryDependencyRepository,
  ) {}

  async execute(piId: string, csvBuffer: Buffer): Promise<ImportApiResponse> {
    if (!piId) throw new BadRequestException('piId is required');

    const { features, stories, errors } = this.csvParser.parse(csvBuffer);

    if (errors.length > 0) return { imported: 0, skipped: 0, errors };

    let imported = 0;
    const featureIdMap = new Map<string, string>();

    for (const [externalId, f] of features) {
      const existing = (await this.featureRepo.findByPiId(piId)).find(feat => feat.externalId === externalId);
      if (existing) { featureIdMap.set(externalId, existing.id); }
      else {
        const created = await this.createFeature.execute({ piId, externalId: f.externalId, title: f.name, color: '#9ca3af' });
        featureIdMap.set(externalId, created.id);
      }
    }

    const storyExternalIdMap = new Map<string, string>();
    for (const s of stories) {
      const featureId = featureIdMap.get(s.featureExternalId);
      if (!featureId) { errors.push({ row: 0, field: 'feature_id', message: `Feature ${s.featureExternalId} not found` }); continue; }
      const existing = (await this.storyRepo.findByFeatureId(featureId)).find(st => st.externalId === s.externalId);
      if (existing) { storyExternalIdMap.set(s.externalId, existing.id); }
      else {
        const created = await this.createStory.execute({ featureId, externalId: s.externalId, title: s.title, estimation: s.estimation, externalDependencySprint: s.externalDependencySprint });
        storyExternalIdMap.set(s.externalId, created.id);
        imported++;
      }
    }

    for (const s of stories) {
      if (!s.dependsOnExternalIds.length) continue;
      const storyId = storyExternalIdMap.get(s.externalId);
      if (!storyId) continue;
      const depIds = s.dependsOnExternalIds
        .map(extId => storyExternalIdMap.get(extId))
        .filter((id): id is string => id != null);
      if (!depIds.length) continue;
      await this.depRepo.deleteByStoryId(storyId);
      await this.depRepo.saveMany(depIds.map(depId => new StoryDependency(storyId, depId)));
    }

    return { imported, skipped: stories.length - imported, errors };
  }
}
