import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler, MediatorBus } from '@rolandsall24/nest-mediator';
import { randomUUID } from 'crypto';
import { CreateSprintCommand } from './create-sprint.command';
import { Sprint } from '../../domain/entities/sprint';
import { ISprintRepository, SPRINT_REPOSITORY } from '../../repositories/sprint.repository.interface';
import { SprintCreatedEvent } from '../../events/sprint/sprint-created.event';

@Injectable()
@CommandHandler(CreateSprintCommand)
export class CreateSprintHandler implements ICommandHandler<CreateSprintCommand> {
  constructor(
    @Inject(SPRINT_REPOSITORY) private readonly repo: ISprintRepository,
    private readonly mediator: MediatorBus,
  ) {}

  async execute(command: CreateSprintCommand): Promise<void> {
    const sprint = await this.repo.save(new Sprint(
      randomUUID(), command.piId, command.name, command.order, command.capacity,
      command.startDate ? new Date(command.startDate) : null,
      command.endDate ? new Date(command.endDate) : null,
    ));
    command.result = sprint;
    await this.mediator.publish(new SprintCreatedEvent(sprint.id, sprint.piId, sprint.name, sprint.order, sprint.capacity, command.startDate ?? null, command.endDate ?? null));
  }
}
