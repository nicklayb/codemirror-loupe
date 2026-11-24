import { expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { CompletionContext } from '@codemirror/autocomplete';
import { loupeCompletion } from '../src/index.js';

const run = async (doc: string) => {
  const source = loupeCompletion({
    getCommands: () => [{ label: 'get' }, { label: 'find' }],
    getSchemas: () => [{ label: 'User' }],
    getFields: () => [{ label: 'id' }],
    startAt: 1
  });
  const result = await source(new CompletionContext(EditorState.create({ doc }), doc.length, true));
  return result && { from: result.from, labels: result.options.map((o) => o.label) };
};

it('honours startAt for commands', async () => {
  expect(await run("'g")).toEqual({ from: 1, labels: ['get', 'find'] });
});

it('honours startAt for schemas', async () => {
  expect(await run("'get U")).toEqual({ from: 5, labels: ['User'] });
});

it('honours startAt for fields', async () => {
  expect(await run("'get User where ")).toEqual({ from: 16, labels: ['id'] });
});

it('passes the real command to getSchemas with startAt', async () => {
  let seen = '';
  const source = loupeCompletion({
    getCommands: () => [],
    getSchemas: (command) => {
      seen = command;
      return [];
    },
    getFields: () => [],
    startAt: 1
  });
  const doc = "'get U";
  await source(new CompletionContext(EditorState.create({ doc }), doc.length, true));
  expect(seen).toBe('get');
});
