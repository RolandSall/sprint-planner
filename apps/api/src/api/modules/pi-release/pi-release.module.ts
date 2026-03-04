import { Module } from '@nestjs/common';
import { PiReleaseController } from './pi-release.controller';
import { CreatePiReleaseHandler } from '../../../core/commands/pi-release/create-pi-release.handler';
import { UpdatePiReleaseHandler } from '../../../core/commands/pi-release/update-pi-release.handler';
import { DeletePiReleaseHandler } from '../../../core/commands/pi-release/delete-pi-release.handler';
import { FindPiReleasesByPiIdHandler } from '../../../core/queries/pi-release/find-pi-releases-by-pi-id.handler';
import { PI_RELEASE_REPOSITORY } from '../../../core/repositories/pi-release.repository.interface';
import { PiReleaseDrizzleRepository } from '../../../infra/database/drizzle/repositories/pi-release.drizzle-repository';

@Module({
  controllers: [PiReleaseController],
  providers: [
    CreatePiReleaseHandler, UpdatePiReleaseHandler, DeletePiReleaseHandler, FindPiReleasesByPiIdHandler,
    { provide: PI_RELEASE_REPOSITORY, useClass: PiReleaseDrizzleRepository },
  ],
  exports: [PI_RELEASE_REPOSITORY],
})
export class PiReleaseModule {}
