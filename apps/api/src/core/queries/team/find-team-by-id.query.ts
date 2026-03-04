import { IQuery } from '@rolandsall24/nest-mediator';

export class FindTeamByIdQuery implements IQuery {
  constructor(public readonly teamId: string) {}
}
