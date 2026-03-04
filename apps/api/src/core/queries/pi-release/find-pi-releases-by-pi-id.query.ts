import { IQuery } from '@rolandsall24/nest-mediator';

export class FindPiReleasesByPiIdQuery implements IQuery {
  constructor(public readonly piId: string) {}
}
