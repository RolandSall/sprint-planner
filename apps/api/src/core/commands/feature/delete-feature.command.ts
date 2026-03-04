import { ICommand } from '@rolandsall24/nest-mediator';

export class DeleteFeatureCommand implements ICommand {
  constructor(public readonly featureId: string) {}
}
