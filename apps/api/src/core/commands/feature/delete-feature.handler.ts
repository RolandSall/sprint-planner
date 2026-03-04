import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler, MediatorBus } from '@rolandsall24/nest-mediator';
import { DeleteFeatureCommand } from './delete-feature.command';
import { IFeatureRepository, FEATURE_REPOSITORY } from '../../repositories/feature.repository.interface';
import { FeatureDeletedEvent } from '../../events/feature/feature-deleted.event';

@Injectable()
@CommandHandler(DeleteFeatureCommand)
export class DeleteFeatureHandler implements ICommandHandler<DeleteFeatureCommand> {
  constructor(
    @Inject(FEATURE_REPOSITORY) private readonly repo: IFeatureRepository,
    private readonly mediator: MediatorBus,
  ) {}

  async execute(command: DeleteFeatureCommand): Promise<void> {
    await this.repo.delete(command.featureId);
    await this.mediator.publish(new FeatureDeletedEvent(command.featureId));
  }
}
