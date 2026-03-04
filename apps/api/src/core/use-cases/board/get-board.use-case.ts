import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IPIRepository, PI_REPOSITORY } from '../../repositories/pi.repository.interface';
import { ISprintRepository, SPRINT_REPOSITORY } from '../../repositories/sprint.repository.interface';
import { IFeatureRepository, FEATURE_REPOSITORY } from '../../repositories/feature.repository.interface';
import { IStoryRepository, STORY_REPOSITORY } from '../../repositories/story.repository.interface';
import { IStoryDependencyRepository, STORY_DEPENDENCY_REPOSITORY } from '../../repositories/story-dependency.repository.interface';
import { IPiReleaseRepository, PI_RELEASE_REPOSITORY } from '../../repositories/pi-release.repository.interface';
import type { PiBoardProjection, StoryProjection, FeatureProjection, SchedulingWarning } from '@org/shared-types';

@Injectable()
export class GetBoardUseCase {
  constructor(
    @Inject(PI_REPOSITORY) private readonly piRepo: IPIRepository,
    @Inject(SPRINT_REPOSITORY) private readonly sprintRepo: ISprintRepository,
    @Inject(FEATURE_REPOSITORY) private readonly featureRepo: IFeatureRepository,
    @Inject(STORY_REPOSITORY) private readonly storyRepo: IStoryRepository,
    @Inject(STORY_DEPENDENCY_REPOSITORY) private readonly depRepo: IStoryDependencyRepository,
    @Inject(PI_RELEASE_REPOSITORY) private readonly releaseRepo: IPiReleaseRepository,
  ) {}

  async execute(piId: string): Promise<PiBoardProjection> {
    const pi = await this.piRepo.findById(piId);
    if (!pi) throw new NotFoundException(`PI ${piId} not found`);

    const [sprints, features, allStories, allDeps, rawReleases] = await Promise.all([
      this.sprintRepo.findByPiId(piId),
      this.featureRepo.findByPiId(piId),
      this.storyRepo.findByPiId(piId),
      this.depRepo.findByPiId(piId),
      this.releaseRepo.findByPiId(piId),
    ]);
    sprints.sort((a, b) => a.order - b.order);

    const depMap = new Map<string, string[]>();
    for (const dep of allDeps) {
      depMap.set(dep.storyId, [...(depMap.get(dep.storyId) ?? []), dep.dependsOnStoryId]);
    }

    const toStoryProjection = (s: typeof allStories[0]): StoryProjection => ({
      id: s.id, featureId: s.featureId, sprintId: s.sprintId, externalId: s.externalId,
      title: s.title, estimation: s.estimation, externalDependencySprint: s.externalDependencySprint,
      dependsOnStoryIds: depMap.get(s.id) ?? [],
    });

    const sprintLoad = new Map<string, number>();
    for (const story of allStories) {
      if (story.sprintId) sprintLoad.set(story.sprintId, (sprintLoad.get(story.sprintId) ?? 0) + story.estimation);
    }

    const totalCapacity = sprints.reduce((sum, s) => sum + s.capacity, 0);

    const scheduledStories = new Map<string, typeof allStories>();
    for (const s of allStories.filter(s => s.sprintId)) {
      const list = scheduledStories.get(s.sprintId!) ?? [];
      list.push(s);
      scheduledStories.set(s.sprintId!, list);
    }

    const warnings: SchedulingWarning[] = [];
    for (const sprint of sprints) {
      const load = sprintLoad.get(sprint.id) ?? 0;
      if (load > sprint.capacity) {
        warnings.push({
          type: 'OVERCOMMIT',
          sprintId: sprint.id,
          sprintName: sprint.name,
          currentLoad: load,
          capacity: sprint.capacity,
          overcommitPercent: Math.round(((load - sprint.capacity) / sprint.capacity) * 100),
        });
      }
    }

    const featureEstimations = new Map<string, number>();
    for (const s of allStories) {
      featureEstimations.set(s.featureId, (featureEstimations.get(s.featureId) ?? 0) + s.estimation);
    }

    const releases = rawReleases.map(r => ({ id: r.id, piId: r.piId, name: r.name, date: r.date.toISOString().split('T')[0] }));

    return {
      pi: {
        id: pi.id, teamId: pi.teamId, name: pi.name,
        startDate: pi.startDate.toISOString().split('T')[0],
        endDate: pi.endDate.toISOString().split('T')[0],
        totalCapacity,
      },
      releases,
      sprints: sprints.map(s => ({
        id: s.id, piId: s.piId, name: s.name, order: s.order, capacity: s.capacity,
        currentLoad: sprintLoad.get(s.id) ?? 0,
        startDate: s.startDate ? s.startDate.toISOString().split('T')[0] : null,
        endDate: s.endDate ? s.endDate.toISOString().split('T')[0] : null,
        stories: (scheduledStories.get(s.id) ?? []).map(toStoryProjection),
      })),
      backlog: allStories.filter(s => !s.sprintId).map(toStoryProjection),
      features: features.map(f => ({ id: f.id, piId: f.piId, externalId: f.externalId, title: f.title, totalEstimation: featureEstimations.get(f.id) ?? 0, color: f.color } as FeatureProjection)),
      warnings,
    };
  }
}
