import { ICommand } from '@rolandsall24/nest-mediator';

export class DeletePiReleaseCommand implements ICommand {
  constructor(public readonly releaseId: string) {}
}
