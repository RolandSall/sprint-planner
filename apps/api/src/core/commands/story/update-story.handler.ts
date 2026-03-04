import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler, MediatorBus } from '@rolandsall24/nest-mediator';
import { UpdateStoryCommand } from './update-story.command';
import { StoryDependency } from '../../domain/entities/story-dependency';
import { IStoryRepository, STORY_REPOSITORY } from '../../repositories/story.repository.interface';
import { IStoryDependencyRepository, STORY_DEPENDENCY_REPOSITORY } from '../../repositories/story-dependency.repository.interface';
import { StoryUpdatedEvent } from '../../events/story/story-updated.event';

@Injectable()
@CommandHandler(UpdateStoryCommand)
export class UpdateStoryHandler implements ICommandHandler<UpdateStoryCommand> {
  constructor(
    @Inject(STORY_REPOSITORY) private readonly storyRepo: IStoryRepository,
    @Inject(STORY_DEPENDENCY_REPOSITORY) private readonly depRepo: IStoryDependencyRepository,
    private readonly mediator: MediatorBus,
  ) {}

  async execute(command: UpdateStoryCommand): Promise<void> {
    const story = await this.storyRepo.findById(command.storyId);
    if (!story) throw new NotFoundException(`Story ${command.storyId} not found`);
    const dto = command.changes;
    if (dto.externalId !== undefined) story.externalId = dto.externalId;
    if (dto.title !== undefined) story.title = dto.title;
    if (dto.estimation !== undefined) story.estimation = dto.estimation;
    if ('externalDependencySprint' in dto) story.externalDependencySprint = dto.externalDependencySprint ?? null;
    command.result = await this.storyRepo.save(story);
    if (dto.dependsOnStoryIds !== undefined) {
      await this.depRepo.deleteByStoryId(command.storyId);
      if (dto.dependsOnStoryIds.length) await this.depRepo.saveMany(dto.dependsOnStoryIds.map(d => new StoryDependency(command.storyId, d)));
    }
    await this.mediator.publish(new StoryUpdatedEvent(command.storyId, dto));
  }
}
