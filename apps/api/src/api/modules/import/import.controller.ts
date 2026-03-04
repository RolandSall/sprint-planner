import { Controller, Post, UploadedFile, UseInterceptors, BadRequestException, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes } from '@nestjs/swagger';
import { CsvImportService } from '../../../infra/csv/csv-import.service';
import { CreateFeatureUseCase } from '../../../core/use-cases/feature/create-feature.use-case';
import { CreateStoryUseCase } from '../../../core/use-cases/story/create-story.use-case';
import { IStoryRepository, STORY_REPOSITORY } from '../../../core/repositories/story.repository.interface';
import { IFeatureRepository, FEATURE_REPOSITORY } from '../../../core/repositories/feature.repository.interface';
import { IStoryDependencyRepository, STORY_DEPENDENCY_REPOSITORY } from '../../../core/repositories/story-dependency.repository.interface';
import { StoryDependency } from '../../../core/domain/entities/story-dependency';
import type { ImportApiResponse } from '@org/shared-types';
import { Inject } from '@nestjs/common';

@ApiTags('import')
@Controller('import')
export class ImportController {
  constructor(
    private readonly csvParser: CsvImportService,
    private readonly createFeature: CreateFeatureUseCase,
    private readonly createStory: CreateStoryUseCase,
    @Inject(FEATURE_REPOSITORY) private readonly featureRepo: IFeatureRepository,
    @Inject(STORY_REPOSITORY) private readonly storyRepo: IStoryRepository,
    @Inject(STORY_DEPENDENCY_REPOSITORY) private readonly depRepo: IStoryDependencyRepository,
  ) {}

  @Post('csv')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async importCsv(
    @Query('piId') piId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ImportApiResponse> {
    if (!file) throw new BadRequestException('CSV file is required');
    if (!piId) throw new BadRequestException('piId query param is required');

    const { features, stories, errors } = this.csvParser.parse(file.buffer);

    if (errors.length > 0) return { imported: 0, skipped: 0, errors };

    let imported = 0;
    const featureIdMap = new Map<string, string>(); // externalId -> internal UUID

    for (const [externalId, f] of features) {
      const existing = (await this.featureRepo.findByPiId(piId)).find(feat => feat.externalId === externalId);
      if (existing) { featureIdMap.set(externalId, existing.id); }
      else {
        const created = await this.createFeature.execute({ piId, externalId: f.externalId, title: f.name, color: '#9ca3af' });
        featureIdMap.set(externalId, created.id);
      }
    }

    const storyExternalIdMap = new Map<string, string>(); // externalId -> internal UUID
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

    // Pass 2: resolve and upsert dependencies now that all storyExternalIdMap entries exist
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
