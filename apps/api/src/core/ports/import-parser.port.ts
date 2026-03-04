import type { ImportApiResponse } from '@org/shared-types';

export const IMPORT_PARSER = Symbol('IMPORT_PARSER');

export interface ParsedImportData {
  features: Map<string, { externalId: string; name: string }>;
  stories: Array<{
    featureExternalId: string; externalId: string; title: string; estimation: number;
    dependsOnExternalIds: string[]; externalDependencySprint: number | null;
  }>;
  errors: ImportApiResponse['errors'];
}

export interface IImportParser {
  parse(buffer: Buffer, filename: string): ParsedImportData;
}
