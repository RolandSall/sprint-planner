import { Module } from '@nestjs/common';
import { FeatureController } from './feature.controller';
import { CreateFeatureUseCase } from '../../../core/use-cases/feature/create-feature.use-case';
import { UpdateFeatureUseCase } from '../../../core/use-cases/feature/update-feature.use-case';
import { DeleteFeatureUseCase } from '../../../core/use-cases/feature/delete-feature.use-case';
import { FindFeaturesUseCase } from '../../../core/use-cases/feature/find-features.use-case';
import { FEATURE_REPOSITORY } from '../../../core/repositories/feature.repository.interface';
import { FeatureDrizzleRepository } from '../../../infra/database/drizzle/repositories/feature.drizzle-repository';

@Module({
  controllers: [FeatureController],
  providers: [
    CreateFeatureUseCase, UpdateFeatureUseCase, DeleteFeatureUseCase, FindFeaturesUseCase,
    { provide: FEATURE_REPOSITORY, useClass: FeatureDrizzleRepository },
  ],
})
export class FeatureModule {}
