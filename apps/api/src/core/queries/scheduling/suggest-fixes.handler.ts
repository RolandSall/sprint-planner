import { Inject, Injectable } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@rolandsall24/nest-mediator';
import { SuggestFixesQuery } from './suggest-fixes.query';
import { IStoryRepository, STORY_REPOSITORY } from '../../repositories/story.repository.interface';
import { ISprintRepository, SPRINT_REPOSITORY } from '../../repositories/sprint.repository.interface';
import { IStoryDependencyRepository, STORY_DEPENDENCY_REPOSITORY } from '../../repositories/story-dependency.repository.interface';
import { IFeatureRepository, FEATURE_REPOSITORY } from '../../repositories/feature.repository.interface';
import { IPiReleaseRepository, PI_RELEASE_REPOSITORY } from '../../repositories/pi-release.repository.interface';
import { SchedulingService } from '../../services/scheduling/scheduling.service';
import type { SuggestFixesApiResponse } from '@org/shared-types';

@Injectable()
@QueryHandler(SuggestFixesQuery)
export class SuggestFixesHandler implements IQueryHandler<SuggestFixesQuery, SuggestFixesApiResponse> {
  constructor(
    @Inject(STORY_REPOSITORY) private readonly storyRepo: IStoryRepository,
    @Inject(SPRINT_REPOSITORY) private readonly sprintRepo: ISprintRepository,
    @Inject(STORY_DEPENDENCY_REPOSITORY) private readonly depRepo: IStoryDependencyRepository,
    @Inject(FEATURE_REPOSITORY) private readonly featureRepo: IFeatureRepository,
    @Inject(PI_RELEASE_REPOSITORY) private readonly releaseRepo: IPiReleaseRepository,
    private readonly schedulingService: SchedulingService,
  ) {}

  async execute(query: SuggestFixesQuery): Promise<SuggestFixesApiResponse> {
    const [stories, sprints, dependencies, features, releases] = await Promise.all([
      this.storyRepo.findByPiId(query.piId),
      this.sprintRepo.findByPiId(query.piId),
      this.depRepo.findByPiId(query.piId),
      this.featureRepo.findByPiId(query.piId),
      this.releaseRepo.findByPiId(query.piId),
    ]);
    const result = this.schedulingService.schedule(
      { stories, sprints, dependencies, features, releases },
      { scheduleBacklog: true, enforceReleaseDeadlines: true, fixViolations: true, fixOvercommit: true },
    );
    return { moves: result.moves, unfixable: result.unfixable };
  }
}
