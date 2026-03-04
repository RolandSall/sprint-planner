import { IQuery } from '@rolandsall24/nest-mediator';

export class GetBoardQuery implements IQuery {
  constructor(public readonly piId: string) {}
}
