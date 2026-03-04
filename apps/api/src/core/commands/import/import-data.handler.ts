import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler, MediatorBus } from '@rolandsall24/nest-mediator';
import { ImportDataCommand } from './import-data.command';
import { IFeatureRepository, FEATURE_REPOSITORY } from '../../repositories/feature.repository.interface';
import { IStoryRepository, STORY_REPOSITORY } from '../../repositories/story.repository.interface';
import { IStoryDependencyRepository, STORY_DEPENDENCY_REPOSITORY } from '../../repositories/story-dependency.repository.interface';
import { IImportParser, IMPORT_PARSER } from '../../ports/import-parser.port';
import { Feature } from '../../domain/entities/feature';
import { Story } from '../../domain/entities/story';
import { StoryDependency } from '../../domain/entities/story-dependency';
import { DataImportedEvent } from '../../events/import/data-imported.event';
import { randomUUID } from 'crypto';

@Injectable()
@CommandHandler(ImportDataCommand)
export class ImportDataHandler implements ICommandHandler<ImportDataCommand> {
  constructor(
    @Inject(IMPORT_PARSER) private readonly parser: IImportParser,
    @Inject(FEATURE_REPOSITORY) private readonly featureRepo: IFeatureRepository,
    @Inject(STORY_REPOSITORY) private readonly storyRepo: IStoryRepository,
    @Inject(STORY_DEPENDENCY_REPOSITORY) private readonly depRepo: IStoryDependencyRepository,
    private readonly mediator: MediatorBus,
  ) {}

  async execute(command: ImportDataCommand): Promise<void> {
    if (!command.piId) throw new BadRequestException('piId is required');

    const { features, stories, errors } = this.parser.parse(command.fileBuffer, command.filename);

    if (errors.length > 0) {
      command.result = { imported: 0, skipped: 0, errors };
      return;
    }

    let imported = 0;
    const featureIdMap = new Map<string, string>();

    for (const [externalId, f] of features) {
      const existing = (await this.featureRepo.findByPiId(command.piId)).find(feat => feat.externalId === externalId);
      if (existing) { featureIdMap.set(externalId, existing.id); }
      else {
        const created = await this.featureRepo.save(new Feature(randomUUID(), command.piId, f.externalId, f.name, '#9ca3af'));
        featureIdMap.set(externalId, created.id);
      }
    }

    const storyExternalIdMap = new Map<string, string>();
    for (const s of stories) {
      const featureId = featureIdMap.get(s.featureExternalId);
      if (!featureId) { errors.push({ row: 0, field: 'feature_id', message: `Feature ${s.featureExternalId} not found` }); continue; }
      const existing = (await this.storyRepo.findByFeatureId(featureId)).find(st => st.externalId === s.externalId);
      if (existing) { storyExternalIdMap.set(s.externalId, existing.id); }
      else {
        const created = await this.storyRepo.save(new Story(randomUUID(), featureId, null, s.externalId, s.title, s.estimation, s.externalDependencySprint));
        storyExternalIdMap.set(s.externalId, created.id);
        imported++;
      }
    }

    for (const s of stories) {
      if (!s.dependsOnExternalIds.length) continue;
      const storyId = storyExternalIdMap.get(s.externalId);
      if (!storyId) continue;
      const depIds = s.dependsOnExternalIds.map(extId => storyExternalIdMap.get(extId)).filter((id): id is string => id != null);
      if (!depIds.length) continue;
      await this.depRepo.deleteByStoryId(storyId);
      await this.depRepo.saveMany(depIds.map(depId => new StoryDependency(storyId, depId)));
    }

    command.result = { imported, skipped: stories.length - imported, errors };
    await this.mediator.publish(new DataImportedEvent(command.piId, imported, stories.length - imported));
  }
}
