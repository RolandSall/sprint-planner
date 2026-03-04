import { Module } from '@nestjs/common';
import { SchedulingController } from './scheduling.controller';
import { SchedulingService } from '../../../core/services/scheduling/scheduling.service';
import { MoveStoryUseCase } from '../../../core/use-cases/story/move-story.use-case';
import { STORY_REPOSITORY } from '../../../core/repositories/story.repository.interface';
import { SPRINT_REPOSITORY } from '../../../core/repositories/sprint.repository.interface';
import { STORY_DEPENDENCY_REPOSITORY } from '../../../core/repositories/story-dependency.repository.interface';
import { StoryDrizzleRepository } from '../../../infra/database/drizzle/repositories/story.drizzle-repository';
import { SprintDrizzleRepository } from '../../../infra/database/drizzle/repositories/sprint.drizzle-repository';
import { StoryDependencyDrizzleRepository } from '../../../infra/database/drizzle/repositories/story-dependency.drizzle-repository';

@Module({
  controllers: [SchedulingController],
  providers: [
    SchedulingService, MoveStoryUseCase,
    { provide: STORY_REPOSITORY, useClass: StoryDrizzleRepository },
    { provide: SPRINT_REPOSITORY, useClass: SprintDrizzleRepository },
    { provide: STORY_DEPENDENCY_REPOSITORY, useClass: StoryDependencyDrizzleRepository },
  ],
})
export class SchedulingModule {}
