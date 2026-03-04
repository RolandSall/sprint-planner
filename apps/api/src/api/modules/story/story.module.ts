import { Module } from '@nestjs/common';
import { StoryController } from './story.controller';
import { CreateStoryUseCase } from '../../../core/use-cases/story/create-story.use-case';
import { UpdateStoryUseCase } from '../../../core/use-cases/story/update-story.use-case';
import { DeleteStoryUseCase } from '../../../core/use-cases/story/delete-story.use-case';
import { MoveStoryUseCase } from '../../../core/use-cases/story/move-story.use-case';
import { FindStoriesUseCase } from '../../../core/use-cases/story/find-stories.use-case';
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
    CreateStoryUseCase, UpdateStoryUseCase, DeleteStoryUseCase, MoveStoryUseCase, FindStoriesUseCase, SchedulingService,
    { provide: STORY_REPOSITORY, useClass: StoryDrizzleRepository },
    { provide: STORY_DEPENDENCY_REPOSITORY, useClass: StoryDependencyDrizzleRepository },
    { provide: SPRINT_REPOSITORY, useClass: SprintDrizzleRepository },
  ],
})
export class StoryModule {}
