import { Module } from '@nestjs/common';
import { FeatureController } from './feature.controller';
import { CreateFeatureHandler } from '../../../core/commands/feature/create-feature.handler';
import { UpdateFeatureHandler } from '../../../core/commands/feature/update-feature.handler';
import { DeleteFeatureHandler } from '../../../core/commands/feature/delete-feature.handler';
import { FindFeaturesByPiIdHandler } from '../../../core/queries/feature/find-features-by-pi-id.handler';
import { FEATURE_REPOSITORY } from '../../../core/repositories/feature.repository.interface';
import { FeatureDrizzleRepository } from '../../../infra/database/drizzle/repositories/feature.drizzle-repository';

@Module({
  controllers: [FeatureController],
  providers: [
    CreateFeatureHandler, UpdateFeatureHandler, DeleteFeatureHandler, FindFeaturesByPiIdHandler,
    { provide: FEATURE_REPOSITORY, useClass: FeatureDrizzleRepository },
  ],
})
export class FeatureModule {}
