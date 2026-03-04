import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetBoardUseCase } from '../../../core/use-cases/board/get-board.use-case';
import type { PiBoardProjection } from '@org/shared-types';

@ApiTags('board')
@Controller('board')
export class BoardController {
  constructor(private readonly getBoard: GetBoardUseCase) {}

  @Get(':piId')
  async getBoardData(@Param('piId') piId: string): Promise<PiBoardProjection> {
    return this.getBoard.execute(piId);
  }
}
