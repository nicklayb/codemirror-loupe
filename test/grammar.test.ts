import { describe, expect, it } from 'vitest';
import { parser } from '../src/parser.js';

function errorsOf(query: string): number {
  let count = 0;
  parser.parse(query).iterate({
    enter(node) {
      if (node.type.isError) count++;
    }
  });
  return count;
}

describe('valid queries', () => {
  it.each([
    'get User',
    'get all User',
    'get 1..10 User where age > 1',
    'get where age > 1',
    'get 12 where age > 1',
    'get User where age',
    'get User where not age',
    'get User where age and not name',
    'get User where age not :empty',
    'get User where age:empty',
    'get User where name not like "a"',
    'get User where role not in ["a", "b"]',
    'get User where role.permissions["folders", access] = "write"',
    'get User{order: {direction: "asc", field: field}} where age > 50',
    'get User where price > 1.5',
    'get User where balance > -10',
    'get User where views > 1k',
    'get User where name = ~r"^a.*"',
    'get User where title | description like "x"',
    'get User where price & discount > 100',
    'get User where balance:amount >= 10',
    'get User where kind = 1 and order = 2 and notes = 3 and android = 4',
    'get User where member = trueish',
    'get User where active = true',
    'get User where (a = 1 and b = 2) or c = 3 # comment'
  ])('%s', (query) => {
    expect(errorsOf(query)).toBe(0);
  });
});

describe('invalid queries', () => {
  it.each([
    'get User where age >',
    'get User where age = ',
    'get User where (age = 1',
    'get User{order: } where age',
    'get User where age in 1'
  ])('%s', (query) => {
    expect(errorsOf(query)).toBeGreaterThan(0);
  });
});
