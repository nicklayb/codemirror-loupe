import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { CompletionContext } from '@codemirror/autocomplete';
import {
  loupeManifestCompletion,
  manifestFields,
  manifestSchemas,
  resolveSchema,
  toCodemirrorFields,
  type LoupeManifest
} from '../src/index.js';

const MANIFEST: LoupeManifest = {
  User: {
    info: 'User accounts',
    associations: { role: 'Role', posts: 'Post' },
    fields: ['id', 'email']
  },
  Role: { associations: {}, fields: ['name', 'level'] },
  Post: { associations: { author: 'User' }, fields: ['id', 'title'] }
};

const COMMANDS = [{ label: 'get' }, { label: 'find' }];

async function complete(doc: string, options: { startAt?: number } = {}) {
  const source = loupeManifestCompletion(MANIFEST, { getCommands: () => COMMANDS, ...options });
  const state = EditorState.create({ doc });
  return source(new CompletionContext(state, doc.length, true));
}

const labels = (result: { options: readonly { label: string }[] } | null) =>
  result?.options.map((option) => option.label).sort();

describe('toCodemirrorFields', () => {
  it('maps associations and fields', () => {
    expect(toCodemirrorFields(MANIFEST.User)).toEqual([
      { label: 'role', detail: 'Role', type: 'method' },
      { label: 'posts', detail: 'Post', type: 'method' },
      { label: 'id', type: 'property' },
      { label: 'email', type: 'property' }
    ]);
  });

  it('tolerates missing associations and fields', () => {
    expect(toCodemirrorFields({})).toEqual([]);
  });
});

describe('resolveSchema', () => {
  it('returns the schema itself for an empty path', () => {
    expect(resolveSchema(MANIFEST, 'User', [])).toBe('User');
  });

  it('follows associations', () => {
    expect(resolveSchema(MANIFEST, 'User', ['posts', 'author', 'role'])).toBe('Role');
  });

  it('returns null for unknown schemas, associations and plain fields', () => {
    expect(resolveSchema(MANIFEST, 'Nope', [])).toBeNull();
    expect(resolveSchema(MANIFEST, 'User', ['nope'])).toBeNull();
    expect(resolveSchema(MANIFEST, 'User', ['email'])).toBeNull();
  });

  it('ignores inherited object keys', () => {
    expect(resolveSchema(MANIFEST, 'User', ['constructor'])).toBeNull();
    expect(resolveSchema(MANIFEST, 'toString', [])).toBeNull();
  });
});

describe('providers', () => {
  it('lists every schema with its info', () => {
    expect(manifestSchemas(MANIFEST)('get')).toEqual([
      { label: 'User', type: 'type', info: 'User accounts' },
      { label: 'Role', type: 'type', info: undefined },
      { label: 'Post', type: 'type', info: undefined }
    ]);
  });

  it('lists root and nested fields', () => {
    const getFields = manifestFields(MANIFEST);
    const context = { command: 'get', schema: 'User', type: 'field' as const };
    expect(getFields({ ...context, fieldPath: [] })).toHaveLength(4);
    expect(getFields({ ...context, fieldPath: ['role'] })).toEqual(
      toCodemirrorFields(MANIFEST.Role)
    );
    expect(getFields({ ...context, fieldPath: ['unknown'] })).toEqual([]);
  });
});

describe('loupeManifestCompletion', () => {
  it('suggests commands at the start', async () => {
    expect(labels(await complete('g'))).toEqual(['find', 'get']);
  });

  it('suggests schemas after a command', async () => {
    expect(labels(await complete('get '))).toEqual(['Post', 'Role', 'User']);
  });

  it('suggests root fields after where', async () => {
    expect(labels(await complete('get User where '))).toEqual(['email', 'id', 'posts', 'role']);
  });

  it('suggests nested fields after a dot', async () => {
    expect(labels(await complete('get User where role.'))).toEqual(['level', 'name']);
    expect(labels(await complete('get User where posts.author.'))).toEqual([
      'email',
      'id',
      'posts',
      'role'
    ]);
  });

  it('suggests fields after a logical operator', async () => {
    const result = await complete('get User where id = 1 and ');
    expect(labels(result)).toEqual(['email', 'id', 'not', 'posts', 'role']);
  });

  it('suggests nothing for an unknown association', async () => {
    expect(labels(await complete('get User where nope.'))).toEqual([]);
  });

  it('is disabled when enabled returns false', async () => {
    const source = loupeManifestCompletion(MANIFEST, {
      getCommands: () => COMMANDS,
      enabled: () => false
    });
    const state = EditorState.create({ doc: 'get ' });
    expect(await source(new CompletionContext(state, 4, true))).toBeNull();
  });
});
