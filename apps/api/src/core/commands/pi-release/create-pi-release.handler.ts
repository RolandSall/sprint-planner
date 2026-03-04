import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler, MediatorBus } from '@rolandsall24/nest-mediator';
import { randomUUID } from 'crypto';
import { CreatePiReleaseCommand } from './create-pi-release.command';
import { PiRelease } from '../../domain/entities/pi-release';
import { IPiReleaseRepository, PI_RELEASE_REPOSITORY } from '../../repositories/pi-release.repository.interface';
import { PiReleaseCreatedEvent } from '../../events/pi-release/pi-release-created.event';

@Injectable()
@CommandHandler(CreatePiReleaseCommand)
export class CreatePiReleaseHandler implements ICommandHandler<CreatePiReleaseCommand> {
  constructor(
    @Inject(PI_RELEASE_REPOSITORY) private readonly repo: IPiReleaseRepository,
    private readonly mediator: MediatorBus,
  ) {}

  async execute(command: CreatePiReleaseCommand): Promise<void> {
    const release = await this.repo.save(new PiRelease(randomUUID(), command.piId, command.name, new Date(command.date)));
    command.result = release;
    await this.mediator.publish(new PiReleaseCreatedEvent(release.id, release.piId, release.name, command.date));
  }
}
