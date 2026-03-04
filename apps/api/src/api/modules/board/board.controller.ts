import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MediatorBus } from '@rolandsall24/nest-mediator';
import { GetBoardQuery } from '../../../core/queries/board/get-board.query';
import type { PiBoardProjection } from '@org/shared-types';

@ApiTags('board')
@Controller('board')
export class BoardController {
  constructor(private readonly mediator: MediatorBus) {}

  @Get(':piId')
  async getBoardData(@Param('piId') piId: string): Promise<PiBoardProjection> {
    return this.mediator.query(new GetBoardQuery(piId));
  }
}
