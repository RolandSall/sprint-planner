import { Module } from '@nestjs/common';
import { ImportController } from './import.controller';
import { ImportCsvHandler } from '../../../core/commands/import/import-csv.handler';
import { CSV_PARSER } from '../../../core/ports/csv-parser.port';
import { CsvImportService } from '../../../infra/csv/csv-import.service';
import { FEATURE_REPOSITORY } from '../../../core/repositories/feature.repository.interface';
import { STORY_REPOSITORY } from '../../../core/repositories/story.repository.interface';
import { STORY_DEPENDENCY_REPOSITORY } from '../../../core/repositories/story-dependency.repository.interface';
import { FeatureDrizzleRepository } from '../../../infra/database/drizzle/repositories/feature.drizzle-repository';
import { StoryDrizzleRepository } from '../../../infra/database/drizzle/repositories/story.drizzle-repository';
import { StoryDependencyDrizzleRepository } from '../../../infra/database/drizzle/repositories/story-dependency.drizzle-repository';

@Module({
  controllers: [ImportController],
  providers: [
    ImportCsvHandler,
    { provide: CSV_PARSER, useClass: CsvImportService },
    { provide: FEATURE_REPOSITORY, useClass: FeatureDrizzleRepository },
    { provide: STORY_REPOSITORY, useClass: StoryDrizzleRepository },
    { provide: STORY_DEPENDENCY_REPOSITORY, useClass: StoryDependencyDrizzleRepository },
  ],
})
export class ImportModule {}
