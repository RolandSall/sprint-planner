import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler, MediatorBus } from '@rolandsall24/nest-mediator';
import { DeleteSprintCommand } from './delete-sprint.command';
import { ISprintRepository, SPRINT_REPOSITORY } from '../../repositories/sprint.repository.interface';
import { SprintDeletedEvent } from '../../events/sprint/sprint-deleted.event';

@Injectable()
@CommandHandler(DeleteSprintCommand)
export class DeleteSprintHandler implements ICommandHandler<DeleteSprintCommand> {
  constructor(
    @Inject(SPRINT_REPOSITORY) private readonly repo: ISprintRepository,
    private readonly mediator: MediatorBus,
  ) {}

  async execute(command: DeleteSprintCommand): Promise<void> {
    await this.repo.delete(command.sprintId);
    await this.mediator.publish(new SprintDeletedEvent(command.sprintId));
  }
}
