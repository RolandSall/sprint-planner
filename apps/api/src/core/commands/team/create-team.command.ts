import { ICommand } from '@rolandsall24/nest-mediator';
import type { Team } from '../../domain/entities/team';

export class CreateTeamCommand implements ICommand {
  result?: Team;
  constructor(public readonly name: string) {}
}
