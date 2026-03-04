import { Module } from '@nestjs/common';
import { PiController } from './pi.controller';
import { CreatePiUseCase } from '../../../core/use-cases/pi/create-pi.use-case';
import { FindPiUseCase } from '../../../core/use-cases/pi/find-pi.use-case';
import { DeletePiUseCase } from '../../../core/use-cases/pi/delete-pi.use-case';
import { PI_REPOSITORY } from '../../../core/repositories/pi.repository.interface';
import { PiDrizzleRepository } from '../../../infra/database/drizzle/repositories/pi.drizzle-repository';

@Module({
  controllers: [PiController],
  providers: [
    CreatePiUseCase, FindPiUseCase, DeletePiUseCase,
    { provide: PI_REPOSITORY, useClass: PiDrizzleRepository },
  ],
})
export class PiModule {}
