import { Module } from '@nestjs/common';
import { StoryController } from './story.controller';
import { CreateStoryHandler } from '../../../core/commands/story/create-story.handler';
import { UpdateStoryHandler } from '../../../core/commands/story/update-story.handler';
import { DeleteStoryHandler } from '../../../core/commands/story/delete-story.handler';
import { MoveStoryHandler } from '../../../core/commands/story/move-story.handler';
import { FindStoryProjectionsByFeatureIdHandler } from '../../../core/queries/story/find-story-projections-by-feature-id.handler';
import { FindStoryDepsHandler } from '../../../core/queries/story/find-story-deps.handler';
import { ValidateMoveHandler } from '../../../core/queries/scheduling/validate-move.handler';
import { SchedulingService } from '../../../core/services/scheduling/scheduling.service';
import { STORY_REPOSITORY } from '../../../core/repositories/story.repository.interface';
import { STORY_DEPENDENCY_REPOSITORY } from '../../../core/repositories/story-dependency.repository.interface';
import { SPRINT_REPOSITORY } from '../../../core/repositories/sprint.repository.interface';
import { StoryDrizzleRepository } from '../../../infra/database/drizzle/repositories/story.drizzle-repository';
import { StoryDependencyDrizzleRepository } from '../../../infra/database/drizzle/repositories/story-dependency.drizzle-repository';
import { SprintDrizzleRepository } from '../../../infra/database/drizzle/repositories/sprint.drizzle-repository';

@Module({
  controllers: [StoryController],
  providers: [
    CreateStoryHandler, UpdateStoryHandler, DeleteStoryHandler, MoveStoryHandler,
    FindStoryProjectionsByFeatureIdHandler, FindStoryDepsHandler, ValidateMoveHandler, SchedulingService,
    { provide: STORY_REPOSITORY, useClass: StoryDrizzleRepository },
    { provide: STORY_DEPENDENCY_REPOSITORY, useClass: StoryDependencyDrizzleRepository },
    { provide: SPRINT_REPOSITORY, useClass: SprintDrizzleRepository },
  ],
})
export class StoryModule {}
