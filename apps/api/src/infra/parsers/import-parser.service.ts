import { Injectable, BadRequestException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import type { IImportParser, ParsedImportData } from '../../core/ports/import-parser.port';

interface ImportRow {
  feature_id: string;
  feature_name: string;
  story_id: string;
  story_title: string;
  estimation: string;
  depends_on: string;
  external_dependency_sprint: string;
}

@Injectable()
export class ImportParserService implements IImportParser {
  parse(buffer: Buffer, filename: string): ParsedImportData {
    const ext = filename.toLowerCase().split('.').pop();
    if (ext === 'csv') {
      return this.mapRowsToImportData(this.parseCsv(buffer));
    }
    if (ext === 'xlsx') {
      return this.mapRowsToImportData(this.parseXlsx(buffer));
    }
    throw new BadRequestException(`Unsupported file format: .${ext}. Use .csv or .xlsx`);
  }

  private parseCsv(buffer: Buffer): ImportRow[] {
    return parse(buffer, {
      columns: true, skip_empty_lines: true, trim: true,
    }) as ImportRow[];
  }

  private parseXlsx(buffer: Buffer): ImportRow[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new BadRequestException('XLSX file has no sheets');
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: '' });
    return rows.map(row => ({
      feature_id: String(row['feature_id'] ?? ''),
      feature_name: String(row['feature_name'] ?? ''),
      story_id: String(row['story_id'] ?? ''),
      story_title: String(row['story_title'] ?? ''),
      estimation: String(row['estimation'] ?? ''),
      depends_on: String(row['depends_on'] ?? ''),
      external_dependency_sprint: String(row['external_dependency_sprint'] ?? ''),
    }));
  }

  private mapRowsToImportData(records: ImportRow[]): ParsedImportData {
    const features = new Map<string, { externalId: string; name: string }>();
    const stories: ParsedImportData['stories'] = [];
    const errors: ParsedImportData['errors'] = [];

    records.forEach((row, index) => {
      const rowNum = index + 2; // 1-indexed + header

      if (!row.feature_id) { errors.push({ row: rowNum, field: 'feature_id', message: 'Required' }); return; }
      if (!row.feature_name) { errors.push({ row: rowNum, field: 'feature_name', message: 'Required' }); return; }
      if (!row.story_id) { errors.push({ row: rowNum, field: 'story_id', message: 'Required' }); return; }
      if (!row.story_title) { errors.push({ row: rowNum, field: 'story_title', message: 'Required' }); return; }

      const estimation = parseInt(row.estimation, 10);
      if (isNaN(estimation) || estimation <= 0) { errors.push({ row: rowNum, field: 'estimation', message: 'Must be a positive integer' }); return; }

      if (!features.has(row.feature_id)) {
        features.set(row.feature_id, { externalId: row.feature_id, name: row.feature_name });
      }

      const dependsOnExternalIds = row.depends_on ? row.depends_on.split('|').map(s => s.trim()).filter(Boolean) : [];
      const extDepSprint = row.external_dependency_sprint ? parseInt(row.external_dependency_sprint, 10) : null;

      stories.push({
        featureExternalId: row.feature_id,
        externalId: row.story_id,
        title: row.story_title,
        estimation,
        dependsOnExternalIds,
        externalDependencySprint: extDepSprint && !isNaN(extDepSprint) ? extDepSprint : null,
      });
    });

    return { features, stories, errors };
  }
}
