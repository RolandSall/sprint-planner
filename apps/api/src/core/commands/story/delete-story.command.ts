import { ICommand } from '@rolandsall24/nest-mediator';

export class DeleteStoryCommand implements ICommand {
  constructor(public readonly storyId: string) {}
}
