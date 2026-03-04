import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler, MediatorBus } from '@rolandsall24/nest-mediator';
import { UpdatePiReleaseCommand } from './update-pi-release.command';
import { IPiReleaseRepository, PI_RELEASE_REPOSITORY } from '../../repositories/pi-release.repository.interface';
import { PiReleaseUpdatedEvent } from '../../events/pi-release/pi-release-updated.event';

@Injectable()
@CommandHandler(UpdatePiReleaseCommand)
export class UpdatePiReleaseHandler implements ICommandHandler<UpdatePiReleaseCommand> {
  constructor(
    @Inject(PI_RELEASE_REPOSITORY) private readonly repo: IPiReleaseRepository,
    private readonly mediator: MediatorBus,
  ) {}

  async execute(command: UpdatePiReleaseCommand): Promise<void> {
    const release = await this.repo.findById(command.releaseId);
    if (!release) throw new NotFoundException(`PiRelease ${command.releaseId} not found`);
    if (command.changes.name !== undefined) release.name = command.changes.name;
    if (command.changes.date !== undefined) release.date = new Date(command.changes.date);
    command.result = await this.repo.save(release);
    await this.mediator.publish(new PiReleaseUpdatedEvent(command.releaseId, command.changes));
  }
}
