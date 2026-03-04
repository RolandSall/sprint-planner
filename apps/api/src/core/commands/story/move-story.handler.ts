import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler, MediatorBus } from '@rolandsall24/nest-mediator';
import { MoveStoryCommand } from './move-story.command';
import { IStoryRepository, STORY_REPOSITORY } from '../../repositories/story.repository.interface';
import { StoryMovedEvent } from '../../events/story/story-moved.event';

@Injectable()
@CommandHandler(MoveStoryCommand)
export class MoveStoryHandler implements ICommandHandler<MoveStoryCommand> {
  constructor(
    @Inject(STORY_REPOSITORY) private readonly repo: IStoryRepository,
    private readonly mediator: MediatorBus,
  ) {}

  async execute(command: MoveStoryCommand): Promise<void> {
    const story = await this.repo.findById(command.storyId);
    if (!story) throw new NotFoundException(`Story ${command.storyId} not found`);
    const fromSprintId = story.sprintId;
    story.sprintId = command.targetSprintId;
    command.result = await this.repo.save(story);
    await this.mediator.publish(new StoryMovedEvent(story.id, fromSprintId, command.targetSprintId));
  }
}
