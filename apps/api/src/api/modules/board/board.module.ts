import { Module } from '@nestjs/common';
import { BoardController } from './board.controller';
import { GetBoardUseCase } from '../../../core/use-cases/board/get-board.use-case';
import { PI_REPOSITORY } from '../../../core/repositories/pi.repository.interface';
import { SPRINT_REPOSITORY } from '../../../core/repositories/sprint.repository.interface';
import { FEATURE_REPOSITORY } from '../../../core/repositories/feature.repository.interface';
import { STORY_REPOSITORY } from '../../../core/repositories/story.repository.interface';
import { STORY_DEPENDENCY_REPOSITORY } from '../../../core/repositories/story-dependency.repository.interface';
import { PiDrizzleRepository } from '../../../infra/database/drizzle/repositories/pi.drizzle-repository';
import { SprintDrizzleRepository } from '../../../infra/database/drizzle/repositories/sprint.drizzle-repository';
import { FeatureDrizzleRepository } from '../../../infra/database/drizzle/repositories/feature.drizzle-repository';
import { StoryDrizzleRepository } from '../../../infra/database/drizzle/repositories/story.drizzle-repository';
import { StoryDependencyDrizzleRepository } from '../../../infra/database/drizzle/repositories/story-dependency.drizzle-repository';
import { PiReleaseModule } from '../pi-release/pi-release.module';

@Module({
  imports: [PiReleaseModule],
  controllers: [BoardController],
  providers: [
    GetBoardUseCase,
    { provide: PI_REPOSITORY, useClass: PiDrizzleRepository },
    { provide: SPRINT_REPOSITORY, useClass: SprintDrizzleRepository },
    { provide: FEATURE_REPOSITORY, useClass: FeatureDrizzleRepository },
    { provide: STORY_REPOSITORY, useClass: StoryDrizzleRepository },
    { provide: STORY_DEPENDENCY_REPOSITORY, useClass: StoryDependencyDrizzleRepository },
  ],
})
export class BoardModule {}
