import { IQuery } from '@rolandsall24/nest-mediator';

export class ExploreQuery implements IQuery {
  constructor(
    public readonly piId: string,
    public readonly iterations?: number,
  ) {}
}
