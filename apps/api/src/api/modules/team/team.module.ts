import { Module } from '@nestjs/common';
import { TeamController } from './team.controller';
import { CreateTeamHandler } from '../../../core/commands/team/create-team.handler';
import { FindAllTeamsHandler } from '../../../core/queries/team/find-all-teams.handler';
import { FindTeamByIdHandler } from '../../../core/queries/team/find-team-by-id.handler';
import { TEAM_REPOSITORY } from '../../../core/repositories/team.repository.interface';
import { TeamDrizzleRepository } from '../../../infra/database/drizzle/repositories/team.drizzle-repository';

@Module({
  controllers: [TeamController],
  providers: [
    CreateTeamHandler, FindAllTeamsHandler, FindTeamByIdHandler,
    { provide: TEAM_REPOSITORY, useClass: TeamDrizzleRepository },
  ],
})
export class TeamModule {}
