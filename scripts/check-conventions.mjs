// scripts/check-conventions.mjs — Stage 3 of `npm run verify`: structural rules ESLint can't express.
// Silent on success; prints every violation and exits 1. Documented in docs/static-analysis.md.
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const PASCAL = /^[A-Z][A-Za-z0-9]*$/;
const errors = [];

// 1–2. pages/** and components/**: PascalCase file; exactly one exported class, named after the file.
//      Page Objects additionally end in "Page".
const CLASS_FOLDERS = [
  { dir: 'pages', suffix: 'Page' },
  { dir: 'components', suffix: '' },
];
for (const { dir, suffix } of CLASS_FOLDERS) {
  if (!existsSync(dir)) continue;
  for (const file of walk(dir).filter((f) => f.endsWith('.ts'))) {
    const stem = basename(file, '.ts');
    if (!PASCAL.test(stem)) {
      errors.push(`${file}: file name must be PascalCase (e.g. LoginPage.ts, DatePicker.ts)`);
      continue;
    }
    if (suffix && !stem.endsWith(suffix)) {
      errors.push(`${file}: Page Object file names end in "${suffix}" (e.g. ${stem}${suffix}.ts)`);
    }
    const classes = [...readFileSync(file, 'utf8').matchAll(/export\s+(?:abstract\s+)?class\s+(\w+)/g)].map((m) => m[1]);
    if (classes.length === 0) errors.push(`${file}: exports no class`);
    if (classes.length > 1) errors.push(`${file}: exports ${classes.length} classes (${classes.join(', ')}); one class per file`);
    if (classes[0] && classes[0] !== stem) errors.push(`${file}: class ${classes[0]} does not match file name (expected ${stem})`);
  }
}

// 3. every fixtures/*.fixture.ts is registered in fixtures/index.ts
if (existsSync('fixtures')) {
  const index = existsSync('fixtures/index.ts') ? readFileSync('fixtures/index.ts', 'utf8') : '';
  for (const f of readdirSync('fixtures').filter((n) => n.endsWith('.fixture.ts'))) {
    if (!index.includes(`./${f.replace(/\.ts$/, '')}'`)) errors.push(`fixtures/${f}: not registered in fixtures/index.ts`);
  }
}

// Tracked + untracked-but-not-ignored files, so generated output (reports, evidence) is skipped.
const repoFiles = execSync('git ls-files --cached --others --exclude-standard', { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);

// 4. no new top-level folder without an approved change (AGENTS.md folder layout). Extend this list in the same change.
const TOP_LEVEL_DIRS = new Set([
  '.agents', '.ui-evidence', 'bug-reports', 'components', 'config', 'data', 'docs', 'fixtures',
  'helpers', 'models', 'pages', 'plans', 'scripts', 'tests', 'utils',
]);
for (const dir of new Set(repoFiles.filter((f) => f.includes('/')).map((f) => f.split('/')[0]))) {
  if (!TOP_LEVEL_DIRS.has(dir)) errors.push(`${dir}/: top-level folder not in the allowlist in scripts/check-conventions.mjs`);
}

// 5. tests/**/*.ts are specs or setup files; shared code belongs in helpers/, utils/ or fixtures/
for (const f of repoFiles.filter((p) => p.startsWith('tests/') && p.endsWith('.ts'))) {
  if (!/\.(spec|setup)\.ts$/.test(f)) errors.push(`${f}: files under tests/ must be *.spec.ts or *.setup.ts`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  console.error('\nSee docs/static-analysis.md (Stage 3) for what each check means.');
  process.exit(1);
}
