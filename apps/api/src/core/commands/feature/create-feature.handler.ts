import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler, MediatorBus } from '@rolandsall24/nest-mediator';
import { randomUUID } from 'crypto';
import { CreateFeatureCommand } from './create-feature.command';
import { Feature } from '../../domain/entities/feature';
import { IFeatureRepository, FEATURE_REPOSITORY } from '../../repositories/feature.repository.interface';
import { FeatureCreatedEvent } from '../../events/feature/feature-created.event';

@Injectable()
@CommandHandler(CreateFeatureCommand)
export class CreateFeatureHandler implements ICommandHandler<CreateFeatureCommand> {
  constructor(
    @Inject(FEATURE_REPOSITORY) private readonly repo: IFeatureRepository,
    private readonly mediator: MediatorBus,
  ) {}

  async execute(command: CreateFeatureCommand): Promise<void> {
    const f = new Feature(randomUUID(), command.piId, command.externalId, command.title, command.color ?? null);
    if (command.releaseId) f.releaseId = command.releaseId;
    const feature = await this.repo.save(f);
    command.result = feature;
    await this.mediator.publish(new FeatureCreatedEvent(feature.id, feature.piId, feature.externalId, feature.title, feature.color));
  }
}
