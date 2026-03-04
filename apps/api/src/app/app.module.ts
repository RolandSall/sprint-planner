import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestMediatorModule } from '@rolandsall24/nest-mediator';
import { DrizzleModule } from '../infra/database/drizzle/drizzle.module';
import { DATABASE_POOL } from '../infra/database/drizzle/db';
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
    NestMediatorModule.forRoot({
      eventStore: {
        type: 'postgres',
        useExistingPool: DATABASE_POOL,
        mode: (process.env.EVENT_STORE_MODE as 'audit' | 'source') || 'audit',
      },
      ...(process.env.MEDIATOR_FLOW_ENABLED === 'true' && {
        mediatorFlow: {
          enabled: true,
          collectorUrl: process.env.MEDIATOR_FLOW_URL || 'http://localhost:4800',
          serviceName: process.env.MEDIATOR_FLOW_SERVICE_NAME || 'pi-planning',
        },
      }),
    }),
    TeamModule, PiModule, SprintModule, FeatureModule,
    StoryModule, SchedulingModule, ImportModule, BoardModule, PiReleaseModule,
  ],
})
export class AppModule {}
