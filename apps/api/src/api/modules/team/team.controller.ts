import { Body, Controller, Get, Param, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { CreateTeamUseCase } from '../../../core/use-cases/team/create-team.use-case';
import { FindTeamsUseCase } from '../../../core/use-cases/team/find-teams.use-case';
import type { TeamProjection, CreateTeamApiRequest } from '@org/shared-types';
import { Team } from '../../../core/domain/entities/team';

class CreateTeamRequest implements CreateTeamApiRequest {
  @IsString() @IsNotEmpty() name!: string;
}

function toProjection(t: Team): TeamProjection { return { id: t.id, name: t.name }; }

@ApiTags('teams')
@Controller('teams')
export class TeamController {
  constructor(
    private readonly createTeam: CreateTeamUseCase,
    private readonly findTeams: FindTeamsUseCase,
  ) {}

  @Get() async findAll(): Promise<TeamProjection[]> {
    return (await this.findTeams.execute()).map(toProjection);
  }

  @Get(':id') async findOne(@Param('id') id: string): Promise<TeamProjection> {
    const team = await this.findTeams.executeById(id);
    if (!team) throw new Error('Team not found');
    return toProjection(team);
  }

  @Post() @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreateTeamRequest): Promise<TeamProjection> {
    return toProjection(await this.createTeam.execute(body.name));
  }
}
