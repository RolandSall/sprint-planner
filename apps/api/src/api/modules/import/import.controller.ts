import { Controller, Post, UploadedFile, UseInterceptors, BadRequestException, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes } from '@nestjs/swagger';
import { MediatorBus } from '@rolandsall24/nest-mediator';
import { ImportDataCommand } from '../../../core/commands/import/import-data.command';
import type { ImportApiResponse } from '@org/shared-types';

@ApiTags('import')
@Controller('import')
export class ImportController {
  constructor(private readonly mediator: MediatorBus) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async importFile(
    @Query('piId') piId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ImportApiResponse> {
    if (!file) throw new BadRequestException('File is required');
    if (!piId) throw new BadRequestException('piId query param is required');
    const ext = file.originalname.toLowerCase().split('.').pop();
    if (ext !== 'csv' && ext !== 'xlsx') {
      throw new BadRequestException('Only .csv and .xlsx files are supported');
    }
    const command = new ImportDataCommand(piId, file.buffer, file.originalname);
    await this.mediator.send(command);
    return command.result!;
  }

  @Post('csv')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async importCsvFile(
    @Query('piId') piId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ImportApiResponse> {
    return this.importFile(piId, file);
  }
}
