import { Module } from '@nestjs/common';
import { PiController } from './pi.controller';
import { CreatePiHandler } from '../../../core/commands/pi/create-pi.handler';
import { DeletePiHandler } from '../../../core/commands/pi/delete-pi.handler';
import { FindPisByTeamIdHandler } from '../../../core/queries/pi/find-pis-by-team-id.handler';
import { FindPiByIdHandler } from '../../../core/queries/pi/find-pi-by-id.handler';
import { PI_REPOSITORY } from '../../../core/repositories/pi.repository.interface';
import { PiDrizzleRepository } from '../../../infra/database/drizzle/repositories/pi.drizzle-repository';

@Module({
  controllers: [PiController],
  providers: [
    CreatePiHandler, DeletePiHandler, FindPisByTeamIdHandler, FindPiByIdHandler,
    { provide: PI_REPOSITORY, useClass: PiDrizzleRepository },
  ],
})
export class PiModule {}
