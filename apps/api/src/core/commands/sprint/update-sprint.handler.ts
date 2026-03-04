import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler, MediatorBus } from '@rolandsall24/nest-mediator';
import { UpdateSprintCommand } from './update-sprint.command';
import { ISprintRepository, SPRINT_REPOSITORY } from '../../repositories/sprint.repository.interface';
import { SprintUpdatedEvent } from '../../events/sprint/sprint-updated.event';

@Injectable()
@CommandHandler(UpdateSprintCommand)
export class UpdateSprintHandler implements ICommandHandler<UpdateSprintCommand> {
  constructor(
    @Inject(SPRINT_REPOSITORY) private readonly repo: ISprintRepository,
    private readonly mediator: MediatorBus,
  ) {}

  async execute(command: UpdateSprintCommand): Promise<void> {
    const sprint = await this.repo.findById(command.sprintId);
    if (!sprint) throw new NotFoundException(`Sprint ${command.sprintId} not found`);
    const dto = command.changes;
    if (dto.name !== undefined) sprint.name = dto.name;
    if (dto.capacity !== undefined) sprint.capacity = dto.capacity;
    if ('startDate' in dto) sprint.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if ('endDate' in dto) sprint.endDate = dto.endDate ? new Date(dto.endDate) : null;
    command.result = await this.repo.save(sprint);
    await this.mediator.publish(new SprintUpdatedEvent(command.sprintId, dto));
  }
}
