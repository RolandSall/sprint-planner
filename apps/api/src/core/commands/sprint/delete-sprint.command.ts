import { ICommand } from '@rolandsall24/nest-mediator';

export class DeleteSprintCommand implements ICommand {
  constructor(public readonly sprintId: string) {}
}
