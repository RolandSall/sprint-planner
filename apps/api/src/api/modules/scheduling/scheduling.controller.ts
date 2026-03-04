import { Body, Controller, Post, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { SchedulingService } from '../../../core/services/scheduling/scheduling.service';
import { IStoryRepository, STORY_REPOSITORY } from '../../../core/repositories/story.repository.interface';
import { ISprintRepository, SPRINT_REPOSITORY } from '../../../core/repositories/sprint.repository.interface';
import { IStoryDependencyRepository, STORY_DEPENDENCY_REPOSITORY } from '../../../core/repositories/story-dependency.repository.interface';
import { MoveStoryUseCase } from '../../../core/use-cases/story/move-story.use-case';
import type { SchedulingApiResponse, AutoScheduleApiRequest, SuggestFixesApiResponse, SuggestFixesApiRequest } from '@org/shared-types';
import type { SchedulingInput } from '../../../core/services/scheduling/types/scheduling-types';

class AutoScheduleRequest implements AutoScheduleApiRequest {
  @IsString() @IsNotEmpty() piId!: string;
}

class SuggestFixesRequest implements SuggestFixesApiRequest {
  @IsString() @IsNotEmpty() piId!: string;
}

@ApiTags('scheduling')
@Controller('scheduling')
export class SchedulingController {
  constructor(
    private readonly schedulingService: SchedulingService,
    private readonly moveStory: MoveStoryUseCase,
    @Inject(STORY_REPOSITORY) private readonly storyRepo: IStoryRepository,
    @Inject(SPRINT_REPOSITORY) private readonly sprintRepo: ISprintRepository,
    @Inject(STORY_DEPENDENCY_REPOSITORY) private readonly depRepo: IStoryDependencyRepository,
  ) {}

  private async fetchPiData(piId: string): Promise<SchedulingInput> {
    const [stories, sprints, dependencies] = await Promise.all([
      this.storyRepo.findByPiId(piId),
      this.sprintRepo.findByPiId(piId),
      this.depRepo.findByPiId(piId),
    ]);
    return { stories, sprints, dependencies };
  }

  @Post('auto-schedule')
  async autoSchedule(@Body() body: AutoScheduleRequest): Promise<SchedulingApiResponse> {
    const input = await this.fetchPiData(body.piId);
    const result = this.schedulingService.schedule(input, {
      scheduleBacklog: true, fixViolations: false, fixOvercommit: false,
    });

    for (const move of result.moves) {
      if (move.toSprintId) {
        await this.moveStory.execute(move.storyId, move.toSprintId);
      }
    }

    return {
      assignments: result.moves.map(m => ({ storyId: m.storyId, sprintId: m.toSprintId! })),
      warnings: result.warnings,
      errors: result.errors,
    };
  }

  @Post('suggest-fixes')
  async suggestFixes(@Body() body: SuggestFixesRequest): Promise<SuggestFixesApiResponse> {
    const input = await this.fetchPiData(body.piId);
    const result = this.schedulingService.schedule(input, {
      scheduleBacklog: false, fixViolations: true, fixOvercommit: true,
    });

    return { moves: result.moves, unfixable: result.unfixable };
  }
}
