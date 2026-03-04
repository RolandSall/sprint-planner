import { Body, Controller, Delete, Get, Param, Patch, Post, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDateString, IsOptional } from 'class-validator';
import { CreatePiReleaseUseCase } from '../../../core/use-cases/pi-release/create-pi-release.use-case';
import { DeletePiReleaseUseCase } from '../../../core/use-cases/pi-release/delete-pi-release.use-case';
import { UpdatePiReleaseUseCase } from '../../../core/use-cases/pi-release/update-pi-release.use-case';
import { IPiReleaseRepository, PI_RELEASE_REPOSITORY } from '../../../core/repositories/pi-release.repository.interface';
import { Inject } from '@nestjs/common';
import type { PiReleaseProjection, CreatePiReleaseApiRequest, UpdatePiReleaseApiRequest } from '@org/shared-types';
import { PiRelease } from '../../../core/domain/entities/pi-release';

class CreatePiReleaseRequest implements CreatePiReleaseApiRequest {
  @IsString() @IsNotEmpty() piId!: string;
  @IsString() @IsNotEmpty() name!: string;
  @IsDateString() date!: string;
}

class UpdatePiReleaseRequest implements UpdatePiReleaseApiRequest {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsDateString() date?: string;
}

function toProjection(r: PiRelease): PiReleaseProjection {
  return { id: r.id, piId: r.piId, name: r.name, date: r.date.toISOString().split('T')[0] };
}

@ApiTags('pi-releases')
@Controller('pi-releases')
export class PiReleaseController {
  constructor(
    private readonly create: CreatePiReleaseUseCase,
    private readonly update: UpdatePiReleaseUseCase,
    private readonly remove: DeletePiReleaseUseCase,
    @Inject(PI_RELEASE_REPOSITORY) private readonly repo: IPiReleaseRepository,
  ) {}

  @Get() async findByPi(@Query('piId') piId: string): Promise<PiReleaseProjection[]> {
    return (await this.repo.findByPiId(piId)).map(toProjection);
  }

  @Post() @HttpCode(HttpStatus.CREATED)
  async createRelease(@Body() body: CreatePiReleaseRequest): Promise<PiReleaseProjection> {
    return toProjection(await this.create.execute(body));
  }

  @Patch(':id')
  async updateRelease(@Param('id') id: string, @Body() body: UpdatePiReleaseRequest): Promise<PiReleaseProjection> {
    return toProjection(await this.update.execute(id, body));
  }

  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRelease(@Param('id') id: string): Promise<void> {
    return this.remove.execute(id);
  }
}
