// scripts/check-conventions.mjs — Stage 3 of `npm run verify`: structural rules ESLint can't express.
// Silent on success; prints every violation and exits 1. Documented in docs/static-analysis.md.
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, sep } from 'node:path';

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const PASCAL = /^[A-Z][A-Za-z0-9]*$/;
const errors = [];

// 1–2. pages/** (Page Objects) and pages/components/** (Components): PascalCase file; exactly one
//      exported class, named after the file. Page Objects additionally end in "Page".
const COMPONENTS_DIR = join('pages', 'components');
const CLASS_FOLDERS = [
  { dir: 'pages', suffix: 'Page', skip: COMPONENTS_DIR },
  { dir: COMPONENTS_DIR, suffix: '' },
];
for (const { dir, suffix, skip } of CLASS_FOLDERS) {
  if (!existsSync(dir)) continue;
  for (const file of walk(dir).filter((f) => f.endsWith('.ts') && !(skip && f.startsWith(skip + sep)))) {
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
  '.agents', '.claude', '.ui-evidence', 'bug-reports', 'data', 'docs', 'fixtures',
  'helpers', 'models', 'pages', 'scripts', 'tests', 'utils',
]);
for (const dir of new Set(repoFiles.filter((f) => f.includes('/')).map((f) => f.split('/')[0]))) {
  if (!TOP_LEVEL_DIRS.has(dir)) errors.push(`${dir}/: top-level folder not in the allowlist in scripts/check-conventions.mjs`);
}

// 5. tests/**/*.ts are specs or setup files; shared code belongs in helpers/, utils/ or fixtures/
for (const f of repoFiles.filter((p) => p.startsWith('tests/') && p.endsWith('.ts'))) {
  if (!/\.(spec|setup)\.ts$/.test(f)) errors.push(`${f}: files under tests/ must be *.spec.ts or *.setup.ts`);
}

// 6. Agent instructions work in every tool (Claude Code, Cursor, Codex, Antigravity).
//    AGENTS.md is the single instruction file: a CLAUDE.md would make Claude Code ignore it,
//    and Antigravity caps a rules file at 12,000 characters.
for (const f of ['CLAUDE.md', '.claude/CLAUDE.md', 'CLAUDE.local.md']) {
  if (existsSync(f)) errors.push(`${f}: remove it; AGENTS.md is the single instruction file (a CLAUDE.md makes Claude Code skip AGENTS.md)`);
}
if (existsSync('AGENTS.md')) {
  const size = readFileSync('AGENTS.md', 'utf8').length;
  if (size > 12000) errors.push(`AGENTS.md: ${size} characters; Antigravity reads at most 12,000. Move detail into a skill`);
}

// 7. Skills live in .agents/skills/<name>/SKILL.md (Codex, Cursor, Antigravity discover them there).
//    Claude Code only discovers .claude/skills/, so each skill has a pointer there whose
//    frontmatter (name + description, used for discovery) is identical to the skill's.
const frontmatterOf = (file) => readFileSync(file, 'utf8').replace(/\r\n/g, '\n').match(/^---\n[\s\S]*?\n---\n/)?.[0];
const skillNames = existsSync('.agents/skills') ? readdirSync('.agents/skills').filter((n) => existsSync(`.agents/skills/${n}/SKILL.md`)) : [];
const pointerNames = existsSync('.claude/skills') ? readdirSync('.claude/skills') : [];
for (const name of skillNames) {
  const pointer = `.claude/skills/${name}/SKILL.md`;
  const fm = frontmatterOf(`.agents/skills/${name}/SKILL.md`);
  if (!fm) errors.push(`.agents/skills/${name}/SKILL.md: missing --- frontmatter (name + description)`);
  else if (!existsSync(pointer)) errors.push(`${pointer}: missing pointer for skill ${name} (Claude Code can't discover it)`);
  else if (frontmatterOf(pointer) !== fm) errors.push(`${pointer}: frontmatter differs from .agents/skills/${name}/SKILL.md; copy it verbatim`);
}
for (const name of pointerNames) {
  if (!skillNames.includes(name)) errors.push(`.claude/skills/${name}: pointer to a skill that doesn't exist in .agents/skills/`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  console.error('\nSee docs/static-analysis.md (Stage 3) for what each check means.');
  process.exit(1);
}
