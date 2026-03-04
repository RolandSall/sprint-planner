import type { ImportApiResponse } from '@org/shared-types';

export const CSV_PARSER = Symbol('CSV_PARSER');

export interface ParsedImportData {
  features: Map<string, { externalId: string; name: string }>;
  stories: Array<{
    featureExternalId: string; externalId: string; title: string; estimation: number;
    dependsOnExternalIds: string[]; externalDependencySprint: number | null;
  }>;
  errors: ImportApiResponse['errors'];
}

export interface ICsvParser {
  parse(csvBuffer: Buffer): ParsedImportData;
}
