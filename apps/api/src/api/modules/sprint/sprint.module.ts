import { Module } from '@nestjs/common';
import { SprintController } from './sprint.controller';
import { CreateSprintUseCase } from '../../../core/use-cases/sprint/create-sprint.use-case';
import { UpdateSprintUseCase } from '../../../core/use-cases/sprint/update-sprint.use-case';
import { DeleteSprintUseCase } from '../../../core/use-cases/sprint/delete-sprint.use-case';
import { SPRINT_REPOSITORY } from '../../../core/repositories/sprint.repository.interface';
import { SprintDrizzleRepository } from '../../../infra/database/drizzle/repositories/sprint.drizzle-repository';

@Module({
  controllers: [SprintController],
  providers: [
    CreateSprintUseCase, UpdateSprintUseCase, DeleteSprintUseCase,
    { provide: SPRINT_REPOSITORY, useClass: SprintDrizzleRepository },
  ],
})
export class SprintModule {}
