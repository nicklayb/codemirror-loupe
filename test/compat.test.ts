import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parser } from '../src/parser.js';

const FIXTURES = new URL('../.loupe/fixtures.json', import.meta.url);

// Terminals of loupe_parser.yrl that grammar.lezer covers. A new terminal upstream fails the test.
const COVERED_TERMINALS = [
  'all', 'boolean_operator', 'close_bracket', 'close_curly', 'close_paren', 'colon', 'comma',
  'dot', 'empty', 'float', 'identifier', 'integer', 'like', 'list_operand', 'negate',
  'open_bracket', 'open_curly', 'open_paren', 'operand', 'sigil', 'single_ampersand',
  'single_pipe', 'string', 'where'
];

function errorsOf(query: string): string[] {
  const errors: string[] = [];
  parser.parse(query).iterate({
    enter(node) {
      if (node.type.isError) errors.push(`${query.slice(node.from, node.to + 5)} @${node.from}`);
    }
  });
  return errors;
}

describe.skipIf(!existsSync(FIXTURES))('compatibility with Loupe (run `npm run loupe:fetch`)', () => {
  const fixtures = existsSync(FIXTURES)
    ? JSON.parse(readFileSync(FIXTURES, 'utf8'))
    : { ref: '', cases: [], terminals: [] };

  it('covers every upstream parser terminal', () => {
    expect(fixtures.terminals).toEqual([...COVERED_TERMINALS].sort());
  });

  it.each(fixtures.cases as string[])('parses %s', (query) => {
    expect(errorsOf(query)).toEqual([]);
  });
});
