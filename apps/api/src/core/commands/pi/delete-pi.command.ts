import { ICommand } from '@rolandsall24/nest-mediator';

export class DeletePiCommand implements ICommand {
  constructor(public readonly piId: string) {}
}
