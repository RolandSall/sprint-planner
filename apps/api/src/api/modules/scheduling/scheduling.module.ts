import { Module } from '@nestjs/common';
import { SchedulingController } from './scheduling.controller';
import { SchedulingService } from '../../../core/services/scheduling/scheduling.service';
import { AutoScheduleHandler } from '../../../core/commands/scheduling/auto-schedule.handler';
import { SuggestFixesHandler } from '../../../core/queries/scheduling/suggest-fixes.handler';
import { STORY_REPOSITORY } from '../../../core/repositories/story.repository.interface';
import { SPRINT_REPOSITORY } from '../../../core/repositories/sprint.repository.interface';
import { STORY_DEPENDENCY_REPOSITORY } from '../../../core/repositories/story-dependency.repository.interface';
import { FEATURE_REPOSITORY } from '../../../core/repositories/feature.repository.interface';
import { PI_RELEASE_REPOSITORY } from '../../../core/repositories/pi-release.repository.interface';
import { StoryDrizzleRepository } from '../../../infra/database/drizzle/repositories/story.drizzle-repository';
import { SprintDrizzleRepository } from '../../../infra/database/drizzle/repositories/sprint.drizzle-repository';
import { StoryDependencyDrizzleRepository } from '../../../infra/database/drizzle/repositories/story-dependency.drizzle-repository';
import { FeatureDrizzleRepository } from '../../../infra/database/drizzle/repositories/feature.drizzle-repository';
import { PiReleaseDrizzleRepository } from '../../../infra/database/drizzle/repositories/pi-release.drizzle-repository';

@Module({
  controllers: [SchedulingController],
  providers: [
    SchedulingService, AutoScheduleHandler, SuggestFixesHandler,
    { provide: STORY_REPOSITORY, useClass: StoryDrizzleRepository },
    { provide: SPRINT_REPOSITORY, useClass: SprintDrizzleRepository },
    { provide: STORY_DEPENDENCY_REPOSITORY, useClass: StoryDependencyDrizzleRepository },
    { provide: FEATURE_REPOSITORY, useClass: FeatureDrizzleRepository },
    { provide: PI_RELEASE_REPOSITORY, useClass: PiReleaseDrizzleRepository },
  ],
})
export class SchedulingModule {}
