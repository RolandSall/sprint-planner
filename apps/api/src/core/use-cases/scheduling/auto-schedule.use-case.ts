import { Inject, Injectable } from '@nestjs/common';
import { IStoryRepository, STORY_REPOSITORY } from '../../repositories/story.repository.interface';
import { ISprintRepository, SPRINT_REPOSITORY } from '../../repositories/sprint.repository.interface';
import { IStoryDependencyRepository, STORY_DEPENDENCY_REPOSITORY } from '../../repositories/story-dependency.repository.interface';
import { SchedulingService } from '../../services/scheduling/scheduling.service';
import type { SchedulingApiResponse } from '@org/shared-types';

@Injectable()
export class AutoScheduleUseCase {
  constructor(
    @Inject(STORY_REPOSITORY) private readonly storyRepo: IStoryRepository,
    @Inject(SPRINT_REPOSITORY) private readonly sprintRepo: ISprintRepository,
    @Inject(STORY_DEPENDENCY_REPOSITORY) private readonly depRepo: IStoryDependencyRepository,
    private readonly schedulingService: SchedulingService,
  ) {}

  async execute(piId: string): Promise<SchedulingApiResponse> {
    const [stories, sprints, dependencies] = await Promise.all([
      this.storyRepo.findByPiId(piId),
      this.sprintRepo.findByPiId(piId),
      this.depRepo.findByPiId(piId),
    ]);

    const result = this.schedulingService.schedule(
      { stories, sprints, dependencies },
      { scheduleBacklog: true, fixViolations: false, fixOvercommit: false },
    );

    for (const move of result.moves) {
      if (move.toSprintId) {
        const story = stories.find(s => s.id === move.storyId);
        if (story) {
          story.sprintId = move.toSprintId;
          await this.storyRepo.save(story);
        }
      }
    }

    return {
      assignments: result.moves.map(m => ({ storyId: m.storyId, sprintId: m.toSprintId! })),
      warnings: result.warnings,
      errors: result.errors,
    };
  }
}
