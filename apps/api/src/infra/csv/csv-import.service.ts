import { Injectable } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import type { ICsvParser, ParsedImportData } from '../../core/ports/csv-parser.port';

export interface CsvRow {
  feature_id: string;
  feature_name: string;
  story_id: string;
  story_title: string;
  estimation: string;
  depends_on: string;
  external_dependency_sprint: string;
}

@Injectable()
export class CsvImportService implements ICsvParser {
  parse(csvBuffer: Buffer): ParsedImportData {
    const records = parse(csvBuffer, {
      columns: true, skip_empty_lines: true, trim: true,
    }) as CsvRow[];

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
