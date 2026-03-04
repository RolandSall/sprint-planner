import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler, MediatorBus } from '@rolandsall24/nest-mediator';
import { UpdateFeatureCommand } from './update-feature.command';
import { IFeatureRepository, FEATURE_REPOSITORY } from '../../repositories/feature.repository.interface';
import { FeatureUpdatedEvent } from '../../events/feature/feature-updated.event';

@Injectable()
@CommandHandler(UpdateFeatureCommand)
export class UpdateFeatureHandler implements ICommandHandler<UpdateFeatureCommand> {
  constructor(
    @Inject(FEATURE_REPOSITORY) private readonly repo: IFeatureRepository,
    private readonly mediator: MediatorBus,
  ) {}

  async execute(command: UpdateFeatureCommand): Promise<void> {
    const f = await this.repo.findById(command.featureId);
    if (!f) throw new NotFoundException(`Feature ${command.featureId} not found`);
    const dto = command.changes;
    if (dto.externalId !== undefined) f.externalId = dto.externalId;
    if (dto.title !== undefined) f.title = dto.title;
    if (dto.color !== undefined) f.color = dto.color;
    command.result = await this.repo.save(f);
    await this.mediator.publish(new FeatureUpdatedEvent(command.featureId, dto));
  }
}
