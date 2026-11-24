import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, '.loupe');
const REPO_DIR = join(OUT_DIR, 'repo');

const CASE_PATTERN = /@case ~s\|(.*)\|\s*$/gm;
const TERMINALS_PATTERN = /^Terminals\s+([\s\S]*?)\.\s*$/m;

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]
  );
}

export function extractCases(testDir) {
  const queries = new Set();
  for (const file of walk(testDir).filter((path) => path.endsWith('_test.exs'))) {
    for (const match of readFileSync(file, 'utf8').matchAll(CASE_PATTERN)) {
      queries.add(match[1]);
    }
  }
  return [...queries].sort();
}

export function extractTerminals(parserFile) {
  const match = readFileSync(parserFile, 'utf8').match(TERMINALS_PATTERN);
  if (!match) throw new Error(`No Terminals section found in ${parserFile}`);
  return match[1].split(/\s+/).filter(Boolean).sort();
}

function download(repository, ref, target) {
  const url = `https://github.com/${repository}/archive/${ref}.tar.gz`;
  try {
    execFileSync('curl', ['--fail', '--silent', '--show-error', '--location', '-o', target, url], {
      stdio: ['ignore', 'inherit', 'inherit']
    });
  } catch {
    throw new Error(`Could not download ${url}`);
  }
}

function main() {
  const config = JSON.parse(readFileSync(join(ROOT, 'loupe.json'), 'utf8'));
  const ref = process.env.LOUPE_REF || config.ref;

  mkdirSync(OUT_DIR, { recursive: true });
  const archive = join(OUT_DIR, 'loupe.tar.gz');
  download(config.repository, ref, archive);

  rmSync(REPO_DIR, { recursive: true, force: true });
  mkdirSync(REPO_DIR, { recursive: true });
  execFileSync('tar', ['-xzf', archive, '--strip-components=1', '-C', REPO_DIR]);

  const cases = extractCases(join(REPO_DIR, 'test'));
  if (cases.length === 0) throw new Error('No @case queries found; the extraction pattern is stale');
  const terminals = extractTerminals(join(REPO_DIR, 'src', 'loupe_parser.yrl'));

  writeFileSync(join(OUT_DIR, 'fixtures.json'), JSON.stringify({ ref, cases, terminals }, null, 2));
  console.log(`Loupe ${ref}: ${cases.length} queries, ${terminals.length} terminals`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
