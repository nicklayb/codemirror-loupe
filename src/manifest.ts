import type { Completion } from '@codemirror/autocomplete';
import {
  loupeCompletion,
  type AutocompleteEnabled,
  type CommandProvider,
  type FieldProvider,
  type SchemaProvider
} from './autocomplete.js';

export interface LoupeFieldSet {
  associations?: Record<string, string>;
  fields?: string[];
}

export interface LoupeSchemaManifest extends LoupeFieldSet {
  info?: string;
}

/** Server provided manifest: schema name => associations and fields. */
export type LoupeManifest = Record<string, LoupeSchemaManifest>;

export interface LoupeManifestOptions {
  getCommands: CommandProvider;
  startAt?: number;
  enabled?: AutocompleteEnabled;
}

export function toCodemirrorFields(fieldSet: LoupeFieldSet): Completion[] {
  const associations = Object.entries(fieldSet.associations ?? {}).map(
    ([label, detail]): Completion => ({ label, detail, type: 'method' })
  );
  const fields = (fieldSet.fields ?? []).map((label): Completion => ({ label, type: 'property' }));
  return [...associations, ...fields];
}

function hasSchema(manifest: LoupeManifest, schema: string): boolean {
  return Object.prototype.hasOwnProperty.call(manifest, schema);
}

/** Follows association names from a schema; returns null when the path is unknown. */
export function resolveSchema(
  manifest: LoupeManifest,
  schema: string,
  fieldPath: string[]
): string | null {
  let current = schema;
  for (const segment of fieldPath) {
    if (!hasSchema(manifest, current)) return null;
    const associations = manifest[current].associations ?? {};
    if (!Object.prototype.hasOwnProperty.call(associations, segment)) return null;
    current = associations[segment];
  }
  return hasSchema(manifest, current) ? current : null;
}

export function manifestSchemas(manifest: LoupeManifest): SchemaProvider {
  return () =>
    Object.entries(manifest).map(([label, { info }]): Completion => ({ label, type: 'type', info }));
}

export function manifestFields(manifest: LoupeManifest): FieldProvider {
  return ({ schema, fieldPath }) => {
    const resolved = resolveSchema(manifest, schema, fieldPath);
    return resolved ? toCodemirrorFields(manifest[resolved]) : [];
  };
}

/** Builds a completion source from a schema manifest. */
export function loupeManifestCompletion(manifest: LoupeManifest, options: LoupeManifestOptions) {
  return loupeCompletion({
    getCommands: options.getCommands,
    getSchemas: manifestSchemas(manifest),
    getFields: manifestFields(manifest),
    startAt: options.startAt,
    enabled: options.enabled
  });
}
