import { Module } from '@nestjs/common';
import { PiReleaseController } from './pi-release.controller';
import { CreatePiReleaseUseCase } from '../../../core/use-cases/pi-release/create-pi-release.use-case';
import { UpdatePiReleaseUseCase } from '../../../core/use-cases/pi-release/update-pi-release.use-case';
import { DeletePiReleaseUseCase } from '../../../core/use-cases/pi-release/delete-pi-release.use-case';
import { FindPiReleasesUseCase } from '../../../core/use-cases/pi-release/find-pi-releases.use-case';
import { PI_RELEASE_REPOSITORY } from '../../../core/repositories/pi-release.repository.interface';
import { PiReleaseDrizzleRepository } from '../../../infra/database/drizzle/repositories/pi-release.drizzle-repository';

@Module({
  controllers: [PiReleaseController],
  providers: [
    CreatePiReleaseUseCase, UpdatePiReleaseUseCase, DeletePiReleaseUseCase, FindPiReleasesUseCase,
    { provide: PI_RELEASE_REPOSITORY, useClass: PiReleaseDrizzleRepository },
  ],
  exports: [PI_RELEASE_REPOSITORY],
})
export class PiReleaseModule {}
