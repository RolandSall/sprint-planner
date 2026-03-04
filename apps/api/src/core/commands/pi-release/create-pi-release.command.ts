import { ICommand } from '@rolandsall24/nest-mediator';
import type { PiRelease } from '../../domain/entities/pi-release';

export class CreatePiReleaseCommand implements ICommand {
  result?: PiRelease;
  constructor(
    public readonly piId: string,
    public readonly name: string,
    public readonly date: string,
    public readonly sprintId: string | null = null,
  ) {}
}
