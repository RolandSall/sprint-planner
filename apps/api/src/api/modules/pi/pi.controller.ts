import { Body, Controller, Delete, Get, Param, Post, Query, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDateString } from 'class-validator';
import { CreatePiUseCase } from '../../../core/use-cases/pi/create-pi.use-case';
import { FindPiUseCase } from '../../../core/use-cases/pi/find-pi.use-case';
import { DeletePiUseCase } from '../../../core/use-cases/pi/delete-pi.use-case';
import type { PiProjection, CreatePiApiRequest } from '@org/shared-types';
import { PI } from '../../../core/domain/entities/pi';

class CreatePiRequest implements CreatePiApiRequest {
  @IsString() @IsNotEmpty() teamId!: string;
  @IsString() @IsNotEmpty() name!: string;
  @IsDateString() startDate!: string;
  @IsDateString() endDate!: string;
}

function toProjection(pi: PI, totalCapacity = 0): PiProjection {
  return {
    id: pi.id, teamId: pi.teamId, name: pi.name,
    startDate: pi.startDate.toISOString().split('T')[0],
    endDate: pi.endDate.toISOString().split('T')[0],
    totalCapacity,
  };
}

@ApiTags('pis')
@Controller('pis')
export class PiController {
  constructor(
    private readonly createPi: CreatePiUseCase,
    private readonly findPi: FindPiUseCase,
    private readonly deletePi: DeletePiUseCase,
  ) {}

  @Get() async findByTeam(@Query('teamId') teamId: string): Promise<PiProjection[]> {
    return (await this.findPi.byTeamId(teamId)).map(pi => toProjection(pi));
  }

  @Get(':id') async findOne(@Param('id') id: string): Promise<PiProjection> {
    const pi = await this.findPi.byId(id);
    if (!pi) throw new NotFoundException(`PI ${id} not found`);
    return toProjection(pi);
  }

  @Post() @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreatePiRequest): Promise<PiProjection> {
    return toProjection(await this.createPi.execute(body));
  }

  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return this.deletePi.execute(id);
  }
}
