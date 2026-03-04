import { IQuery } from '@rolandsall24/nest-mediator';

export class FindFeaturesByPiIdQuery implements IQuery {
  constructor(public readonly piId: string) {}
}
