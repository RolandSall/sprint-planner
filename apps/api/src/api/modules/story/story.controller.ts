import { Body, Controller, Delete, Get, Param, Patch, Post, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsArray, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CreateStoryUseCase } from '../../../core/use-cases/story/create-story.use-case';
import { UpdateStoryUseCase } from '../../../core/use-cases/story/update-story.use-case';
import { DeleteStoryUseCase } from '../../../core/use-cases/story/delete-story.use-case';
import { MoveStoryUseCase } from '../../../core/use-cases/story/move-story.use-case';
import { FindStoriesUseCase } from '../../../core/use-cases/story/find-stories.use-case';
import { ValidateMoveUseCase } from '../../../core/use-cases/scheduling/validate-move.use-case';
import type { StoryProjection, CreateStoryApiRequest, UpdateStoryApiRequest, MoveStoryApiRequest, ValidateMoveApiRequest, ValidationApiResponse } from '@org/shared-types';
import { Story } from '../../../core/domain/entities/story';

class CreateStoryRequest implements CreateStoryApiRequest {
  @IsString() @IsNotEmpty() featureId!: string;
  @IsString() @IsNotEmpty() externalId!: string;
  @IsString() @IsNotEmpty() title!: string;
  @IsInt() @Min(1) estimation!: number;
  @IsOptional() @IsNumber() externalDependencySprint?: number | null;
  @IsOptional() @IsArray() dependsOnStoryIds?: string[];
}
class UpdateStoryRequest implements UpdateStoryApiRequest {
  @IsOptional() @IsString() externalId?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsInt() @Min(1) estimation?: number;
  @IsOptional() @IsNumber() externalDependencySprint?: number | null;
  @IsOptional() @IsArray() dependsOnStoryIds?: string[];
}
class MoveStoryRequest implements MoveStoryApiRequest {
  @IsString() @IsNotEmpty() storyId!: string;
  @IsOptional() @IsString() targetSprintId!: string | null;
  @IsOptional() force?: boolean;
}
class ValidateMoveRequest implements ValidateMoveApiRequest {
  @IsString() @IsNotEmpty() storyId!: string;
  @IsString() @IsNotEmpty() targetSprintId!: string;
}

function toProjection(s: Story, depIds: string[] = []): StoryProjection {
  return { id: s.id, featureId: s.featureId, sprintId: s.sprintId, externalId: s.externalId, title: s.title, estimation: s.estimation, externalDependencySprint: s.externalDependencySprint, dependsOnStoryIds: depIds };
}

@ApiTags('stories')
@Controller('stories')
export class StoryController {
  constructor(
    private readonly create: CreateStoryUseCase,
    private readonly update: UpdateStoryUseCase,
    private readonly remove: DeleteStoryUseCase,
    private readonly move: MoveStoryUseCase,
    private readonly find: FindStoriesUseCase,
    private readonly validateMoveUseCase: ValidateMoveUseCase,
  ) {}

  @Get() async findByFeature(@Query('featureId') featureId: string): Promise<StoryProjection[]> {
    return this.find.byFeatureIdAsProjections(featureId);
  }

  @Post() @HttpCode(HttpStatus.CREATED)
  async createStory(@Body() body: CreateStoryRequest): Promise<StoryProjection> {
    const story = await this.create.execute(body);
    return toProjection(story, body.dependsOnStoryIds ?? []);
  }

  @Patch(':id') async updateStory(@Param('id') id: string, @Body() body: UpdateStoryRequest): Promise<StoryProjection> {
    const story = await this.update.execute(id, body);
    const depIds = await this.find.depIdsForStory(id);
    return toProjection(story, depIds);
  }

  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT)
  async deleteStory(@Param('id') id: string): Promise<void> { return this.remove.execute(id); }

  @Post('move') async moveStory(@Body() body: MoveStoryRequest): Promise<StoryProjection> {
    const story = await this.move.execute(body.storyId, body.targetSprintId);
    const depIds = await this.find.depIdsForStory(story.id);
    return toProjection(story, depIds);
  }

  @Post('validate-move') async validateMove(@Body() body: ValidateMoveRequest): Promise<ValidationApiResponse> {
    return this.validateMoveUseCase.execute(body.storyId, body.targetSprintId);
  }
}
