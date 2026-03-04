import { ICommand } from '@rolandsall24/nest-mediator';
import type { SchedulingApiResponse } from '@org/shared-types';

export class AutoScheduleCommand implements ICommand {
  result?: SchedulingApiResponse;
  constructor(public readonly piId: string) {}
}
