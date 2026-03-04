import { Module } from '@nestjs/common';
import { SprintController } from './sprint.controller';
import { CreateSprintHandler } from '../../../core/commands/sprint/create-sprint.handler';
import { UpdateSprintHandler } from '../../../core/commands/sprint/update-sprint.handler';
import { DeleteSprintHandler } from '../../../core/commands/sprint/delete-sprint.handler';
import { SPRINT_REPOSITORY } from '../../../core/repositories/sprint.repository.interface';
import { SprintDrizzleRepository } from '../../../infra/database/drizzle/repositories/sprint.drizzle-repository';

@Module({
  controllers: [SprintController],
  providers: [
    CreateSprintHandler, UpdateSprintHandler, DeleteSprintHandler,
    { provide: SPRINT_REPOSITORY, useClass: SprintDrizzleRepository },
  ],
})
export class SprintModule {}
