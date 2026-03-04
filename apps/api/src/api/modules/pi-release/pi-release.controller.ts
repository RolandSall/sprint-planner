import { Body, Controller, Delete, Get, Param, Patch, Post, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDateString, IsOptional } from 'class-validator';
import { MediatorBus } from '@rolandsall24/nest-mediator';
import { CreatePiReleaseCommand } from '../../../core/commands/pi-release/create-pi-release.command';
import { UpdatePiReleaseCommand } from '../../../core/commands/pi-release/update-pi-release.command';
import { DeletePiReleaseCommand } from '../../../core/commands/pi-release/delete-pi-release.command';
import { FindPiReleasesByPiIdQuery } from '../../../core/queries/pi-release/find-pi-releases-by-pi-id.query';
import type { PiReleaseProjection, CreatePiReleaseApiRequest, UpdatePiReleaseApiRequest } from '@org/shared-types';
import { PiRelease } from '../../../core/domain/entities/pi-release';

class CreatePiReleaseRequest implements CreatePiReleaseApiRequest {
  @IsString() @IsNotEmpty() piId!: string;
  @IsString() @IsNotEmpty() name!: string;
  @IsDateString() date!: string;
  @IsOptional() @IsString() sprintId?: string | null;
}

class UpdatePiReleaseRequest implements UpdatePiReleaseApiRequest {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() sprintId?: string | null;
}

function toProjection(r: PiRelease): PiReleaseProjection {
  return { id: r.id, piId: r.piId, name: r.name, date: r.date.toISOString().split('T')[0], sprintId: r.sprintId };
}

@ApiTags('pi-releases')
@Controller('pi-releases')
export class PiReleaseController {
  constructor(private readonly mediator: MediatorBus) {}

  @Get() async findByPi(@Query('piId') piId: string): Promise<PiReleaseProjection[]> {
    return (await this.mediator.query<FindPiReleasesByPiIdQuery, PiRelease[]>(new FindPiReleasesByPiIdQuery(piId))).map(toProjection);
  }

  @Post() @HttpCode(HttpStatus.CREATED)
  async createRelease(@Body() body: CreatePiReleaseRequest): Promise<PiReleaseProjection> {
    const command = new CreatePiReleaseCommand(body.piId, body.name, body.date, body.sprintId ?? null);
    await this.mediator.send(command);
    return toProjection(command.result!);
  }

  @Patch(':id')
  async updateRelease(@Param('id') id: string, @Body() body: UpdatePiReleaseRequest): Promise<PiReleaseProjection> {
    const command = new UpdatePiReleaseCommand(id, body);
    await this.mediator.send(command);
    return toProjection(command.result!);
  }

  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRelease(@Param('id') id: string): Promise<void> {
    await this.mediator.send(new DeletePiReleaseCommand(id));
  }
}
