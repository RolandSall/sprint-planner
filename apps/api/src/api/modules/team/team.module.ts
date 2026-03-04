import { Module } from '@nestjs/common';
import { TeamController } from './team.controller';
import { CreateTeamUseCase } from '../../../core/use-cases/team/create-team.use-case';
import { FindTeamsUseCase } from '../../../core/use-cases/team/find-teams.use-case';
import { TEAM_REPOSITORY } from '../../../core/repositories/team.repository.interface';
import { TeamDrizzleRepository } from '../../../infra/database/drizzle/repositories/team.drizzle-repository';

@Module({
  controllers: [TeamController],
  providers: [
    CreateTeamUseCase, FindTeamsUseCase,
    { provide: TEAM_REPOSITORY, useClass: TeamDrizzleRepository },
  ],
})
export class TeamModule {}
