import { Module } from '@nestjs/common';
import { ImportController } from './import.controller';
import { CsvImportService } from '../../../infra/csv/csv-import.service';
import { CreateFeatureUseCase } from '../../../core/use-cases/feature/create-feature.use-case';
import { CreateStoryUseCase } from '../../../core/use-cases/story/create-story.use-case';
import { FEATURE_REPOSITORY } from '../../../core/repositories/feature.repository.interface';
import { STORY_REPOSITORY } from '../../../core/repositories/story.repository.interface';
import { STORY_DEPENDENCY_REPOSITORY } from '../../../core/repositories/story-dependency.repository.interface';
import { FeatureDrizzleRepository } from '../../../infra/database/drizzle/repositories/feature.drizzle-repository';
import { StoryDrizzleRepository } from '../../../infra/database/drizzle/repositories/story.drizzle-repository';
import { StoryDependencyDrizzleRepository } from '../../../infra/database/drizzle/repositories/story-dependency.drizzle-repository';

@Module({
  controllers: [ImportController],
  providers: [
    CsvImportService, CreateFeatureUseCase, CreateStoryUseCase,
    { provide: FEATURE_REPOSITORY, useClass: FeatureDrizzleRepository },
    { provide: STORY_REPOSITORY, useClass: StoryDrizzleRepository },
    { provide: STORY_DEPENDENCY_REPOSITORY, useClass: StoryDependencyDrizzleRepository },
  ],
})
export class ImportModule {}
