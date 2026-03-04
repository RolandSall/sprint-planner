import { Body, Controller, Delete, Get, Param, Patch, Post, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsArray, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { MediatorBus } from '@rolandsall24/nest-mediator';
import { CreateStoryCommand } from '../../../core/commands/story/create-story.command';
import { UpdateStoryCommand } from '../../../core/commands/story/update-story.command';
import { DeleteStoryCommand } from '../../../core/commands/story/delete-story.command';
import { MoveStoryCommand } from '../../../core/commands/story/move-story.command';
import { FindStoryProjectionsByFeatureIdQuery } from '../../../core/queries/story/find-story-projections-by-feature-id.query';
import { FindStoryDepsQuery } from '../../../core/queries/story/find-story-deps.query';
import { ValidateMoveQuery } from '../../../core/queries/scheduling/validate-move.query';
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
  constructor(private readonly mediator: MediatorBus) {}

  @Get() async findByFeature(@Query('featureId') featureId: string): Promise<StoryProjection[]> {
    return this.mediator.query(new FindStoryProjectionsByFeatureIdQuery(featureId));
  }

  @Post() @HttpCode(HttpStatus.CREATED)
  async createStory(@Body() body: CreateStoryRequest): Promise<StoryProjection> {
    const command = new CreateStoryCommand(body.featureId, body.externalId, body.title, body.estimation, body.externalDependencySprint, body.dependsOnStoryIds);
    await this.mediator.send(command);
    return toProjection(command.result!, body.dependsOnStoryIds ?? []);
  }

  @Patch(':id') async updateStory(@Param('id') id: string, @Body() body: UpdateStoryRequest): Promise<StoryProjection> {
    const command = new UpdateStoryCommand(id, body);
    await this.mediator.send(command);
    const depIds = await this.mediator.query<FindStoryDepsQuery, string[]>(new FindStoryDepsQuery(id));
    return toProjection(command.result!, depIds);
  }

  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT)
  async deleteStory(@Param('id') id: string): Promise<void> {
    await this.mediator.send(new DeleteStoryCommand(id));
  }

  @Post('move') async moveStory(@Body() body: MoveStoryRequest): Promise<StoryProjection> {
    const command = new MoveStoryCommand(body.storyId, body.targetSprintId);
    await this.mediator.send(command);
    const depIds = await this.mediator.query<FindStoryDepsQuery, string[]>(new FindStoryDepsQuery(command.result!.id));
    return toProjection(command.result!, depIds);
  }

  @Post('validate-move') async validateMove(@Body() body: ValidateMoveRequest): Promise<ValidationApiResponse> {
    return this.mediator.query(new ValidateMoveQuery(body.storyId, body.targetSprintId));
  }
}
