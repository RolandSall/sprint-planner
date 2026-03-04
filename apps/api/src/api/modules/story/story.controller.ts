import { Body, Controller, Delete, Get, Param, Patch, Post, Query, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsArray, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CreateStoryUseCase } from '../../../core/use-cases/story/create-story.use-case';
import { UpdateStoryUseCase } from '../../../core/use-cases/story/update-story.use-case';
import { DeleteStoryUseCase } from '../../../core/use-cases/story/delete-story.use-case';
import { MoveStoryUseCase } from '../../../core/use-cases/story/move-story.use-case';
import { FindStoriesUseCase } from '../../../core/use-cases/story/find-stories.use-case';
import { SchedulingService } from '../../../core/services/scheduling/scheduling.service';
import type { StoryProjection, CreateStoryApiRequest, UpdateStoryApiRequest, MoveStoryApiRequest, ValidateMoveApiRequest, ValidationApiResponse } from '@org/shared-types';
import { Story } from '../../../core/domain/entities/story';
import { Sprint } from '../../../core/domain/entities/sprint';
import { ISprintRepository, SPRINT_REPOSITORY } from '../../../core/repositories/sprint.repository.interface';
import { IStoryDependencyRepository, STORY_DEPENDENCY_REPOSITORY } from '../../../core/repositories/story-dependency.repository.interface';
import { Inject } from '@nestjs/common';

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
    private readonly scheduling: SchedulingService,
    @Inject(SPRINT_REPOSITORY) private readonly sprintRepo: ISprintRepository,
    @Inject(STORY_DEPENDENCY_REPOSITORY) private readonly depRepo: IStoryDependencyRepository,
  ) {}

  @Get() async findByFeature(@Query('featureId') featureId: string): Promise<StoryProjection[]> {
    const stories = await this.find.byFeatureId(featureId);
    const deps = await Promise.all(stories.map(s => this.depRepo.findByStoryId(s.id)));
    return stories.map((s, i) => toProjection(s, deps[i].map(d => d.dependsOnStoryId)));
  }

  @Post() @HttpCode(HttpStatus.CREATED)
  async createStory(@Body() body: CreateStoryRequest): Promise<StoryProjection> {
    const story = await this.create.execute(body);
    return toProjection(story, body.dependsOnStoryIds ?? []);
  }

  @Patch(':id') async updateStory(@Param('id') id: string, @Body() body: UpdateStoryRequest): Promise<StoryProjection> {
    const story = await this.update.execute(id, body);
    const deps = await this.depRepo.findByStoryId(id);
    return toProjection(story, deps.map(d => d.dependsOnStoryId));
  }

  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT)
  async deleteStory(@Param('id') id: string): Promise<void> { return this.remove.execute(id); }

  @Post('move') async moveStory(@Body() body: MoveStoryRequest): Promise<StoryProjection> {
    const story = await this.move.execute(body.storyId, body.targetSprintId);
    const deps = await this.depRepo.findByStoryId(story.id);
    return toProjection(story, deps.map(d => d.dependsOnStoryId));
  }

  @Post('validate-move') async validateMove(@Body() body: ValidateMoveRequest): Promise<ValidationApiResponse> {
    const [story, targetSprint] = await Promise.all([
      this.find.byId(body.storyId),
      this.sprintRepo.findById(body.targetSprintId),
    ]);
    if (!story) throw new NotFoundException(`Story ${body.storyId} not found`);
    if (!targetSprint) throw new NotFoundException(`Sprint ${body.targetSprintId} not found`);

    const piId = targetSprint.piId;
    const [allStories, allSprints, allDeps] = await Promise.all([
      this.find.byPiId(piId),
      this.sprintRepo.findByPiId(piId),
      this.depRepo.findByPiId(piId),
    ]);

    const sprintById = new Map(allSprints.map(s => [s.id, s]));
    const storySprintMap = new Map<string, Sprint>();
    const sprintCurrentLoad = new Map<string, number>();
    for (const s of allStories) {
      if (s.sprintId) {
        const sprint = sprintById.get(s.sprintId);
        if (sprint) storySprintMap.set(s.id, sprint);
        sprintCurrentLoad.set(s.sprintId, (sprintCurrentLoad.get(s.sprintId) ?? 0) + s.estimation);
      }
    }

    return this.scheduling.validateMove({ story, targetSprint, dependencies: allDeps, storySprintMap, sprintCurrentLoad });
  }
}
