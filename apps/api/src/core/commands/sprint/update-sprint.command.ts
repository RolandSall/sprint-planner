import { ICommand } from '@rolandsall24/nest-mediator';
import type { Sprint } from '../../domain/entities/sprint';

export class UpdateSprintCommand implements ICommand {
  result?: Sprint;
  constructor(
    public readonly sprintId: string,
    public readonly changes: { name?: string; capacity?: number; startDate?: string | null; endDate?: string | null },
  ) {}
}
