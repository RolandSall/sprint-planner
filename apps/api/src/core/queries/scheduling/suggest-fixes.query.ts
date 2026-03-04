import { IQuery } from '@rolandsall24/nest-mediator';

export class SuggestFixesQuery implements IQuery {
  constructor(public readonly piId: string) {}
}
