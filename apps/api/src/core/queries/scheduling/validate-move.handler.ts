import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@rolandsall24/nest-mediator';
import { ValidateMoveQuery } from './validate-move.query';
import { IStoryRepository, STORY_REPOSITORY } from '../../repositories/story.repository.interface';
import { ISprintRepository, SPRINT_REPOSITORY } from '../../repositories/sprint.repository.interface';
import { IStoryDependencyRepository, STORY_DEPENDENCY_REPOSITORY } from '../../repositories/story-dependency.repository.interface';
import { SchedulingService } from '../../services/scheduling/scheduling.service';
import type { Sprint } from '../../domain/entities/sprint';
import type { ValidationApiResponse } from '@org/shared-types';

@Injectable()
@QueryHandler(ValidateMoveQuery)
export class ValidateMoveHandler implements IQueryHandler<ValidateMoveQuery, ValidationApiResponse> {
  constructor(
    @Inject(STORY_REPOSITORY) private readonly storyRepo: IStoryRepository,
    @Inject(SPRINT_REPOSITORY) private readonly sprintRepo: ISprintRepository,
    @Inject(STORY_DEPENDENCY_REPOSITORY) private readonly depRepo: IStoryDependencyRepository,
    private readonly schedulingService: SchedulingService,
  ) {}

  async execute(query: ValidateMoveQuery): Promise<ValidationApiResponse> {
    const [story, targetSprint] = await Promise.all([
      this.storyRepo.findById(query.storyId),
      this.sprintRepo.findById(query.targetSprintId),
    ]);
    if (!story) throw new NotFoundException(`Story ${query.storyId} not found`);
    if (!targetSprint) throw new NotFoundException(`Sprint ${query.targetSprintId} not found`);

    const piId = targetSprint.piId;
    const [allStories, allSprints, allDeps] = await Promise.all([
      this.storyRepo.findByPiId(piId),
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

    return this.schedulingService.validateMove({ story, targetSprint, dependencies: allDeps, storySprintMap, sprintCurrentLoad });
  }
}
