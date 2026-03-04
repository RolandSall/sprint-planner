import { ICommand } from '@rolandsall24/nest-mediator';
import type { Story } from '../../domain/entities/story';

export class MoveStoryCommand implements ICommand {
  result?: Story;
  constructor(
    public readonly storyId: string,
    public readonly targetSprintId: string | null,
  ) {}
}
