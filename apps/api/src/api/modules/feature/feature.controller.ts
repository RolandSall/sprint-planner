import { Body, Controller, Delete, Get, Param, Patch, Post, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { MediatorBus } from '@rolandsall24/nest-mediator';
import { CreateFeatureCommand } from '../../../core/commands/feature/create-feature.command';
import { UpdateFeatureCommand } from '../../../core/commands/feature/update-feature.command';
import { DeleteFeatureCommand } from '../../../core/commands/feature/delete-feature.command';
import { FindFeaturesByPiIdQuery } from '../../../core/queries/feature/find-features-by-pi-id.query';
import type { FeatureProjection, CreateFeatureApiRequest, UpdateFeatureApiRequest } from '@org/shared-types';
import { Feature } from '../../../core/domain/entities/feature';

class CreateFeatureRequest implements CreateFeatureApiRequest {
  @IsString() @IsNotEmpty() piId!: string;
  @IsString() @IsNotEmpty() externalId!: string;
  @IsString() @IsNotEmpty() title!: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsString() releaseId?: string | null;
}
class UpdateFeatureRequest implements UpdateFeatureApiRequest {
  @IsOptional() @IsString() externalId?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() releaseId?: string | null;
}

function toProjection(f: Feature): FeatureProjection {
  return { id: f.id, piId: f.piId, externalId: f.externalId, title: f.title, totalEstimation: 0, color: f.color, releaseId: f.releaseId };
}

@ApiTags('features')
@Controller('features')
export class FeatureController {
  constructor(private readonly mediator: MediatorBus) {}

  @Get() async findByPi(@Query('piId') piId: string): Promise<FeatureProjection[]> {
    return (await this.mediator.query<FindFeaturesByPiIdQuery, Feature[]>(new FindFeaturesByPiIdQuery(piId))).map(toProjection);
  }

  @Post() @HttpCode(HttpStatus.CREATED)
  async create_(@Body() body: CreateFeatureRequest): Promise<FeatureProjection> {
    const command = new CreateFeatureCommand(body.piId, body.externalId, body.title, body.color, body.releaseId ?? null);
    await this.mediator.send(command);
    return toProjection(command.result!);
  }

  @Patch(':id') async update_(@Param('id') id: string, @Body() body: UpdateFeatureRequest): Promise<FeatureProjection> {
    const command = new UpdateFeatureCommand(id, body);
    await this.mediator.send(command);
    return toProjection(command.result!);
  }

  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT)
  async delete_(@Param('id') id: string): Promise<void> {
    await this.mediator.send(new DeleteFeatureCommand(id));
  }
}
