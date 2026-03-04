import { ICommand } from '@rolandsall24/nest-mediator';
import type { PiRelease } from '../../domain/entities/pi-release';

export class UpdatePiReleaseCommand implements ICommand {
  result?: PiRelease;
  constructor(
    public readonly releaseId: string,
    public readonly changes: { name?: string; date?: string; sprintId?: string | null },
  ) {}
}
