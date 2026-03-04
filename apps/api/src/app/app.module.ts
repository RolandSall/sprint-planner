import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DrizzleModule } from '../infra/database/drizzle/drizzle.module';
import { TeamModule } from '../api/modules/team/team.module';
import { PiModule } from '../api/modules/pi/pi.module';
import { SprintModule } from '../api/modules/sprint/sprint.module';
import { FeatureModule } from '../api/modules/feature/feature.module';
import { StoryModule } from '../api/modules/story/story.module';
import { SchedulingModule } from '../api/modules/scheduling/scheduling.module';
import { ImportModule } from '../api/modules/import/import.module';
import { BoardModule } from '../api/modules/board/board.module';
import { PiReleaseModule } from '../api/modules/pi-release/pi-release.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DrizzleModule,
    TeamModule, PiModule, SprintModule, FeatureModule,
    StoryModule, SchedulingModule, ImportModule, BoardModule, PiReleaseModule,
  ],
})
export class AppModule {}
