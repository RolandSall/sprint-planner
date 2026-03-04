import { ICommand } from '@rolandsall24/nest-mediator';
import type { Sprint } from '../../domain/entities/sprint';

export class CreateSprintCommand implements ICommand {
  result?: Sprint;
  constructor(
    public readonly piId: string,
    public readonly name: string,
    public readonly order: number,
    public readonly capacity: number,
    public readonly startDate?: string | null,
    public readonly endDate?: string | null,
  ) {}
}
