import { Body, Controller, Get, Param, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { MediatorBus } from '@rolandsall24/nest-mediator';
import { CreateTeamCommand } from '../../../core/commands/team/create-team.command';
import { FindAllTeamsQuery } from '../../../core/queries/team/find-all-teams.query';
import { FindTeamByIdQuery } from '../../../core/queries/team/find-team-by-id.query';
import type { TeamProjection, CreateTeamApiRequest } from '@org/shared-types';
import { Team } from '../../../core/domain/entities/team';

class CreateTeamRequest implements CreateTeamApiRequest {
  @IsString() @IsNotEmpty() name!: string;
}

function toProjection(t: Team): TeamProjection { return { id: t.id, name: t.name }; }

@ApiTags('teams')
@Controller('teams')
export class TeamController {
  constructor(private readonly mediator: MediatorBus) {}

  @Get() async findAll(): Promise<TeamProjection[]> {
    return (await this.mediator.query<FindAllTeamsQuery, Team[]>(new FindAllTeamsQuery())).map(toProjection);
  }

  @Get(':id') async findOne(@Param('id') id: string): Promise<TeamProjection> {
    const team = await this.mediator.query<FindTeamByIdQuery, Team | null>(new FindTeamByIdQuery(id));
    if (!team) throw new Error('Team not found');
    return toProjection(team);
  }

  @Post() @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreateTeamRequest): Promise<TeamProjection> {
    const command = new CreateTeamCommand(body.name);
    await this.mediator.send(command);
    return toProjection(command.result!);
  }
}
