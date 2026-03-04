import { IQuery } from '@rolandsall24/nest-mediator';

export class FindPisByTeamIdQuery implements IQuery {
  constructor(public readonly teamId: string) {}
}
