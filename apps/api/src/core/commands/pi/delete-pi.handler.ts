import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler, MediatorBus } from '@rolandsall24/nest-mediator';
import { DeletePiCommand } from './delete-pi.command';
import { IPIRepository, PI_REPOSITORY } from '../../repositories/pi.repository.interface';
import { PiDeletedEvent } from '../../events/pi/pi-deleted.event';

@Injectable()
@CommandHandler(DeletePiCommand)
export class DeletePiHandler implements ICommandHandler<DeletePiCommand> {
  constructor(
    @Inject(PI_REPOSITORY) private readonly repo: IPIRepository,
    private readonly mediator: MediatorBus,
  ) {}

  async execute(command: DeletePiCommand): Promise<void> {
    const pi = await this.repo.findById(command.piId);
    if (!pi) throw new NotFoundException(`PI ${command.piId} not found`);
    await this.repo.delete(command.piId);
    await this.mediator.publish(new PiDeletedEvent(command.piId));
  }
}
