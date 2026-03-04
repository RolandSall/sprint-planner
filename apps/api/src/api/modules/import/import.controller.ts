import { Controller, Post, UploadedFile, UseInterceptors, BadRequestException, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes } from '@nestjs/swagger';
import { MediatorBus } from '@rolandsall24/nest-mediator';
import { ImportCsvCommand } from '../../../core/commands/import/import-csv.command';
import type { ImportApiResponse } from '@org/shared-types';

@ApiTags('import')
@Controller('import')
export class ImportController {
  constructor(private readonly mediator: MediatorBus) {}

  @Post('csv')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async importCsvFile(
    @Query('piId') piId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ImportApiResponse> {
    if (!file) throw new BadRequestException('CSV file is required');
    if (!piId) throw new BadRequestException('piId query param is required');
    const command = new ImportCsvCommand(piId, file.buffer);
    await this.mediator.send(command);
    return command.result!;
  }
}
