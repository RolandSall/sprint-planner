import { IQuery } from '@rolandsall24/nest-mediator';

export class FindPiByIdQuery implements IQuery {
  constructor(public readonly piId: string) {}
}
