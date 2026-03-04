import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler, MediatorBus } from '@rolandsall24/nest-mediator';
import { AutoScheduleCommand } from './auto-schedule.command';
import { IStoryRepository, STORY_REPOSITORY } from '../../repositories/story.repository.interface';
import { ISprintRepository, SPRINT_REPOSITORY } from '../../repositories/sprint.repository.interface';
import { IStoryDependencyRepository, STORY_DEPENDENCY_REPOSITORY } from '../../repositories/story-dependency.repository.interface';
import { IFeatureRepository, FEATURE_REPOSITORY } from '../../repositories/feature.repository.interface';
import { IPiReleaseRepository, PI_RELEASE_REPOSITORY } from '../../repositories/pi-release.repository.interface';
import { SchedulingService } from '../../services/scheduling/scheduling.service';
import { PiAutoScheduledEvent } from '../../events/scheduling/pi-auto-scheduled.event';

@Injectable()
@CommandHandler(AutoScheduleCommand)
export class AutoScheduleHandler implements ICommandHandler<AutoScheduleCommand> {
  constructor(
    @Inject(STORY_REPOSITORY) private readonly storyRepo: IStoryRepository,
    @Inject(SPRINT_REPOSITORY) private readonly sprintRepo: ISprintRepository,
    @Inject(STORY_DEPENDENCY_REPOSITORY) private readonly depRepo: IStoryDependencyRepository,
    @Inject(FEATURE_REPOSITORY) private readonly featureRepo: IFeatureRepository,
    @Inject(PI_RELEASE_REPOSITORY) private readonly releaseRepo: IPiReleaseRepository,
    private readonly schedulingService: SchedulingService,
    private readonly mediator: MediatorBus,
  ) {}

  async execute(command: AutoScheduleCommand): Promise<void> {
    const [stories, sprints, dependencies, features, releases] = await Promise.all([
      this.storyRepo.findByPiId(command.piId),
      this.sprintRepo.findByPiId(command.piId),
      this.depRepo.findByPiId(command.piId),
      this.featureRepo.findByPiId(command.piId),
      this.releaseRepo.findByPiId(command.piId),
    ]);

    const result = this.schedulingService.schedule(
      { stories, sprints, dependencies, features, releases },
      { scheduleBacklog: true, enforceReleaseDeadlines: true, fixViolations: true, fixOvercommit: true },
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

    command.result = {
      assignments: result.moves.map(m => ({ storyId: m.storyId, sprintId: m.toSprintId! })),
      warnings: result.warnings,
      errors: result.errors,
    };

    await this.mediator.publish(new PiAutoScheduledEvent(command.piId, result.moves.length, result.warnings.length));
  }
}
