import { Module } from '@nestjs/common';
import { ImportController } from './import.controller';
import { ImportDataHandler } from '../../../core/commands/import/import-data.handler';
import { IMPORT_PARSER } from '../../../core/ports/import-parser.port';
import { ImportParserService } from '../../../infra/parsers/import-parser.service';
import { FEATURE_REPOSITORY } from '../../../core/repositories/feature.repository.interface';
import { STORY_REPOSITORY } from '../../../core/repositories/story.repository.interface';
import { STORY_DEPENDENCY_REPOSITORY } from '../../../core/repositories/story-dependency.repository.interface';
import { FeatureDrizzleRepository } from '../../../infra/database/drizzle/repositories/feature.drizzle-repository';
import { StoryDrizzleRepository } from '../../../infra/database/drizzle/repositories/story.drizzle-repository';
import { StoryDependencyDrizzleRepository } from '../../../infra/database/drizzle/repositories/story-dependency.drizzle-repository';

@Module({
  controllers: [ImportController],
  providers: [
    ImportDataHandler,
    { provide: IMPORT_PARSER, useClass: ImportParserService },
    { provide: FEATURE_REPOSITORY, useClass: FeatureDrizzleRepository },
    { provide: STORY_REPOSITORY, useClass: StoryDrizzleRepository },
    { provide: STORY_DEPENDENCY_REPOSITORY, useClass: StoryDependencyDrizzleRepository },
  ],
})
export class ImportModule {}
