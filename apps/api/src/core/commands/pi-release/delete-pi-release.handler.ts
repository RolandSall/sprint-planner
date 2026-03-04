import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler, MediatorBus } from '@rolandsall24/nest-mediator';
import { DeletePiReleaseCommand } from './delete-pi-release.command';
import { IPiReleaseRepository, PI_RELEASE_REPOSITORY } from '../../repositories/pi-release.repository.interface';
import { PiReleaseDeletedEvent } from '../../events/pi-release/pi-release-deleted.event';

@Injectable()
@CommandHandler(DeletePiReleaseCommand)
export class DeletePiReleaseHandler implements ICommandHandler<DeletePiReleaseCommand> {
  constructor(
    @Inject(PI_RELEASE_REPOSITORY) private readonly repo: IPiReleaseRepository,
    private readonly mediator: MediatorBus,
  ) {}

  async execute(command: DeletePiReleaseCommand): Promise<void> {
    await this.repo.delete(command.releaseId);
    await this.mediator.publish(new PiReleaseDeletedEvent(command.releaseId));
  }
}
