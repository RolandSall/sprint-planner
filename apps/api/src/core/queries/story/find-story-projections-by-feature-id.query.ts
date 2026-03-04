import { IQuery } from '@rolandsall24/nest-mediator';

export class FindStoryProjectionsByFeatureIdQuery implements IQuery {
  constructor(public readonly featureId: string) {}
}
