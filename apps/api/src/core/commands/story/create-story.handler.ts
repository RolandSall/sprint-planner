import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler, MediatorBus } from '@rolandsall24/nest-mediator';
import { randomUUID } from 'crypto';
import { CreateStoryCommand } from './create-story.command';
import { Story } from '../../domain/entities/story';
import { StoryDependency } from '../../domain/entities/story-dependency';
import { IStoryRepository, STORY_REPOSITORY } from '../../repositories/story.repository.interface';
import { IStoryDependencyRepository, STORY_DEPENDENCY_REPOSITORY } from '../../repositories/story-dependency.repository.interface';
import { StoryCreatedEvent } from '../../events/story/story-created.event';

@Injectable()
@CommandHandler(CreateStoryCommand)
export class CreateStoryHandler implements ICommandHandler<CreateStoryCommand> {
  constructor(
    @Inject(STORY_REPOSITORY) private readonly storyRepo: IStoryRepository,
    @Inject(STORY_DEPENDENCY_REPOSITORY) private readonly depRepo: IStoryDependencyRepository,
    private readonly mediator: MediatorBus,
  ) {}

  async execute(command: CreateStoryCommand): Promise<void> {
    const story = await this.storyRepo.save(new Story(randomUUID(), command.featureId, null, command.externalId, command.title, command.estimation, command.externalDependencySprint ?? null));
    if (command.dependsOnStoryIds?.length) {
      await this.depRepo.saveMany(command.dependsOnStoryIds.map(depId => new StoryDependency(story.id, depId)));
    }
    command.result = story;
    await this.mediator.publish(new StoryCreatedEvent(story.id, story.featureId, story.externalId, story.title, story.estimation, story.externalDependencySprint, command.dependsOnStoryIds ?? []));
  }
}
