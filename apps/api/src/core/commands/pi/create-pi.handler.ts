import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler, MediatorBus } from '@rolandsall24/nest-mediator';
import { randomUUID } from 'crypto';
import { CreatePiCommand } from './create-pi.command';
import { PI } from '../../domain/entities/pi';
import { IPIRepository, PI_REPOSITORY } from '../../repositories/pi.repository.interface';
import { PiCreatedEvent } from '../../events/pi/pi-created.event';

@Injectable()
@CommandHandler(CreatePiCommand)
export class CreatePiHandler implements ICommandHandler<CreatePiCommand> {
  constructor(
    @Inject(PI_REPOSITORY) private readonly repo: IPIRepository,
    private readonly mediator: MediatorBus,
  ) {}

  async execute(command: CreatePiCommand): Promise<void> {
    const pi = await this.repo.save(new PI(randomUUID(), command.teamId, command.name, new Date(command.startDate), new Date(command.endDate)));
    command.result = pi;
    await this.mediator.publish(new PiCreatedEvent(pi.id, pi.teamId, pi.name, command.startDate, command.endDate));
  }
}
