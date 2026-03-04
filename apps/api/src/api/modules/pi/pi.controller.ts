import { Body, Controller, Delete, Get, Param, Post, Query, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDateString } from 'class-validator';
import { MediatorBus } from '@rolandsall24/nest-mediator';
import { CreatePiCommand } from '../../../core/commands/pi/create-pi.command';
import { DeletePiCommand } from '../../../core/commands/pi/delete-pi.command';
import { FindPisByTeamIdQuery } from '../../../core/queries/pi/find-pis-by-team-id.query';
import { FindPiByIdQuery } from '../../../core/queries/pi/find-pi-by-id.query';
import type { PiProjection, CreatePiApiRequest } from '@org/shared-types';
import { PI } from '../../../core/domain/entities/pi';

class CreatePiRequest implements CreatePiApiRequest {
  @IsString() @IsNotEmpty() teamId!: string;
  @IsString() @IsNotEmpty() name!: string;
  @IsDateString() startDate!: string;
  @IsDateString() endDate!: string;
}

function toProjection(pi: PI, totalCapacity = 0): PiProjection {
  return { id: pi.id, teamId: pi.teamId, name: pi.name, startDate: pi.startDate.toISOString().split('T')[0], endDate: pi.endDate.toISOString().split('T')[0], totalCapacity };
}

@ApiTags('pis')
@Controller('pis')
export class PiController {
  constructor(private readonly mediator: MediatorBus) {}

  @Get() async findByTeam(@Query('teamId') teamId: string): Promise<PiProjection[]> {
    return (await this.mediator.query<FindPisByTeamIdQuery, PI[]>(new FindPisByTeamIdQuery(teamId))).map(pi => toProjection(pi));
  }

  @Get(':id') async findOne(@Param('id') id: string): Promise<PiProjection> {
    const pi = await this.mediator.query<FindPiByIdQuery, PI | null>(new FindPiByIdQuery(id));
    if (!pi) throw new NotFoundException(`PI ${id} not found`);
    return toProjection(pi);
  }

  @Post() @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreatePiRequest): Promise<PiProjection> {
    const command = new CreatePiCommand(body.teamId, body.name, body.startDate, body.endDate);
    await this.mediator.send(command);
    return toProjection(command.result!);
  }

  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.mediator.send(new DeletePiCommand(id));
  }
}
