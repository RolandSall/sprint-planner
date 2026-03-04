import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler, MediatorBus } from '@rolandsall24/nest-mediator';
import { DeleteStoryCommand } from './delete-story.command';
import { IStoryRepository, STORY_REPOSITORY } from '../../repositories/story.repository.interface';
import { IStoryDependencyRepository, STORY_DEPENDENCY_REPOSITORY } from '../../repositories/story-dependency.repository.interface';
import { StoryDeletedEvent } from '../../events/story/story-deleted.event';

@Injectable()
@CommandHandler(DeleteStoryCommand)
export class DeleteStoryHandler implements ICommandHandler<DeleteStoryCommand> {
  constructor(
    @Inject(STORY_REPOSITORY) private readonly storyRepo: IStoryRepository,
    @Inject(STORY_DEPENDENCY_REPOSITORY) private readonly depRepo: IStoryDependencyRepository,
    private readonly mediator: MediatorBus,
  ) {}

  async execute(command: DeleteStoryCommand): Promise<void> {
    await this.depRepo.deleteByStoryId(command.storyId);
    await this.storyRepo.delete(command.storyId);
    await this.mediator.publish(new StoryDeletedEvent(command.storyId));
  }
}
