import { Body, Controller, Delete, Param, Patch, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsDateString, Min, IsNotEmpty } from 'class-validator';
import { CreateSprintUseCase } from '../../../core/use-cases/sprint/create-sprint.use-case';
import { UpdateSprintUseCase } from '../../../core/use-cases/sprint/update-sprint.use-case';
import { DeleteSprintUseCase } from '../../../core/use-cases/sprint/delete-sprint.use-case';
import type { SprintProjection, CreateSprintApiRequest, UpdateSprintApiRequest } from '@org/shared-types';
import { Sprint } from '../../../core/domain/entities/sprint';

class CreateSprintRequest implements CreateSprintApiRequest {
  @IsString() @IsNotEmpty() piId!: string;
  @IsString() @IsNotEmpty() name!: string;
  @IsInt() @Min(1) order!: number;
  @IsInt() @Min(0) capacity!: number;
  @IsOptional() @IsDateString() startDate?: string | null;
  @IsOptional() @IsDateString() endDate?: string | null;
}

class UpdateSprintRequest implements UpdateSprintApiRequest {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsInt() @Min(0) capacity?: number;
  @IsOptional() @IsDateString() startDate?: string | null;
  @IsOptional() @IsDateString() endDate?: string | null;
}

function toProjection(s: Sprint, currentLoad = 0): SprintProjection {
  return {
    id: s.id, piId: s.piId, name: s.name, order: s.order, capacity: s.capacity, currentLoad,
    startDate: s.startDate ? s.startDate.toISOString().split('T')[0] : null,
    endDate: s.endDate ? s.endDate.toISOString().split('T')[0] : null,
  };
}

@ApiTags('sprints')
@Controller('sprints')
export class SprintController {
  constructor(
    private readonly create: CreateSprintUseCase,
    private readonly update: UpdateSprintUseCase,
    private readonly remove: DeleteSprintUseCase,
  ) {}

  @Post() @HttpCode(HttpStatus.CREATED)
  async createSprint(@Body() body: CreateSprintRequest): Promise<SprintProjection> {
    return toProjection(await this.create.execute(body));
  }

  @Patch(':id') async updateSprint(@Param('id') id: string, @Body() body: UpdateSprintRequest): Promise<SprintProjection> {
    return toProjection(await this.update.execute(id, body));
  }

  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSprint(@Param('id') id: string): Promise<void> {
    return this.remove.execute(id);
  }
}
