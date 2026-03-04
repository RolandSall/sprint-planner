import { Body, Controller, Delete, Get, Param, Patch, Post, Query, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CreateFeatureUseCase } from '../../../core/use-cases/feature/create-feature.use-case';
import { UpdateFeatureUseCase } from '../../../core/use-cases/feature/update-feature.use-case';
import { DeleteFeatureUseCase } from '../../../core/use-cases/feature/delete-feature.use-case';
import { FindFeaturesUseCase } from '../../../core/use-cases/feature/find-features.use-case';
import type { FeatureProjection, CreateFeatureApiRequest, UpdateFeatureApiRequest } from '@org/shared-types';
import { Feature } from '../../../core/domain/entities/feature';

class CreateFeatureRequest implements CreateFeatureApiRequest {
  @IsString() @IsNotEmpty() piId!: string;
  @IsString() @IsNotEmpty() externalId!: string;
  @IsString() @IsNotEmpty() title!: string;
  @IsOptional() @IsString() color?: string;
}
class UpdateFeatureRequest implements UpdateFeatureApiRequest {
  @IsOptional() @IsString() externalId?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() color?: string;
}

function toProjection(f: Feature): FeatureProjection {
  return { id: f.id, piId: f.piId, externalId: f.externalId, title: f.title, totalEstimation: 0, color: f.color };
}

@ApiTags('features')
@Controller('features')
export class FeatureController {
  constructor(
    private readonly create: CreateFeatureUseCase,
    private readonly update: UpdateFeatureUseCase,
    private readonly remove: DeleteFeatureUseCase,
    private readonly find: FindFeaturesUseCase,
  ) {}

  @Get() async findByPi(@Query('piId') piId: string): Promise<FeatureProjection[]> {
    return (await this.find.byPiId(piId)).map(toProjection);
  }

  @Post() @HttpCode(HttpStatus.CREATED)
  async create_(@Body() body: CreateFeatureRequest): Promise<FeatureProjection> {
    return toProjection(await this.create.execute(body));
  }

  @Patch(':id') async update_(@Param('id') id: string, @Body() body: UpdateFeatureRequest): Promise<FeatureProjection> {
    return toProjection(await this.update.execute(id, body));
  }

  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT)
  async delete_(@Param('id') id: string): Promise<void> { return this.remove.execute(id); }
}
