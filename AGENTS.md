# Agent Rules — Mobilewright TypeScript Framework

Always-loaded rules; keep them terse. Whatever `npm run verify` checks (types,
ESLint, conventions script — see `docs/static-analysis.md`) is not restated here;
the rules below are behavioral. Detailed procedures live in `.agents/skills/`
(see §6). If a skill conflicts with this file, this file wins: flag the conflict.
Skills govern the code you write; existing code you only pass by is flagged, not
upgraded to the skill's rules.

## 1. Classify every change first

| Tier | What | Before editing |
|---|---|---|
| T0 | Read-only: explain, review, investigate, run `verify` or tests. Fixes a review finds are a new T1/T2 change | Nothing |
| T1 | One existing file, <=30 changed lines (added + removed), and none of the T2 triggers | State the file + change in one sentence; wait for "yes" |
| T2 | New files, 2+ files, or adding/changing/renaming a public POM/component method, a locator, a wait (including timeouts and delay constants), a fixture, or a model | Written plan (§2); one approval covers every file listed |
| T3 | Protected: `mobilewright.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `scripts/check-conventions.mjs`, `package.json` / lockfile, `.env*`, CI workflows, deleting or renaming a **file** | Written plan + explicit approval of that item by name |

If a change matches more than one row, or you're unsure, take the higher tier.
An explicit user instruction ("no plan, just do it") replaces the "Before
editing" step for that change only.

**A request that breaks a rule** (e.g. "add a retry", "raise the timeout"): name
the rule, explain the risk, offer the proper fix, and proceed with the request
only if the user confirms knowing the trade-off. §3 can never be overridden.

## 2. Plans

- For T2/T3, present the plan in chat (or your tool's plan mode). It is a
  contract, not a draft of the code:
  files in implementation order · public signatures · locators with evidence
  (file + label) · wait strategy per side-effecting action · dependencies ·
  verification (which specs; device needed) · out of scope. No method bodies.
- Wait for approval, then implement in plan order. The diff is the review artifact.
- If implementation needs a file, signature, locator, or dependency not in the
  plan: stop, amend the plan, get the delta approved.
- Writing into `bug-reports/` or `.ui-evidence/` needs no confirmation.

## 3. Safety

Always ask first, even if a plan covers it:
- `git push`, `git reset --hard`, rebase, branch deletion; `git commit` unless asked.
- `rm`; installing, removing or upgrading packages (including global); `npm publish`.
- Device-state commands: `adb install` / `uninstall`, `pm clear`, `reboot`, or
  anything that wipes app data or changes device settings. Read-only `adb`
  (`devices`, `logcat`, UI dumps) is fine.

Never print, commit, or copy into evidence/reports the contents of `.env` or real
credentials. `data/` holds dummy test accounts only: Mobilewright's own
`locator.fill(...)` report step prints the typed text, including passwords.
Tool permission settings may also enforce this; never bypass them.
Running `npm run extract` is allowed once the user has put the device on the
target screen (it only reads the screen and writes `.ui-evidence/`).

## 4. Evidence, not invention

- Never invent accessible labels, roles, UI structure, app behavior, or test
  data. Evidence = a `.ui-evidence/<screen>-locators.yml` capture, existing code,
  or the user's own statement.
- New or changed locator with no evidence → `mobilewright-ui-tree-extractor`
  skill. Unknown app behavior (what a screen shows after an action, which data
  it displays) → ask.
- `.ui-evidence/` is local to each machine and never committed. A capture you
  need that isn't there (fresh clone, other machine) means: ask the user to
  capture that screen. `Evidence:` lines in code name the capture to re-create.
- A capture can be stale. If it contradicts code that a passing test exercises,
  trust the code, flag the capture, and ask for a re-capture.
- Expected values in assertions come from test data or the user, never from
  whatever a capture happened to show.
- Mobilewright is not Playwright web: before using an API method, confirm it
  exists in `node_modules/@mobilewright/core/dist/*.d.ts`.
- Keep facts and assumptions separate. When blocked or ambiguous, stop and ask.

## 5. Architecture

- Layout: `tests/ pages/ components/ fixtures/ utils/ config/ models/ helpers/
  data/ scripts/ docs/`, plus generated `.ui-evidence/ bug-reports/`.
  No new top-level folder without a plan.
- Specs use fixtures from `@fixtures` and call POM methods only. One Page Object
  per screen in `pages/`; reusable widgets in `components/`. A locator lives only
  in its owner.
- Tests are independent (no order or shared mutable state); data that can
  collide is generated per run.
- Agent files must work in every tool (Claude Code, Cursor, Codex, Antigravity):
  this `AGENTS.md` is the only instruction file; never add a `CLAUDE.md` (Claude
  Code would stop reading this file). Skills live in
  `.agents/skills/<name>/SKILL.md`; `.claude/skills/<name>/SKILL.md` is a pointer
  with the identical frontmatter, so a new or renamed skill, or a changed
  `description`, updates both.

## 6. Read before you act

Read only the rows that apply, once per task, before writing code:

| Task | Read first |
|---|---|
| Create a POM/component/model, or add/change a method or locator (skip for T1) | `.agents/skills/mobilewright-pom-builder/SKILL.md` |
| Write or change a spec | `.agents/skills/mobilewright-spec-writer/SKILL.md` |
| Automate a manual test case | `.agents/skills/mobilewright-testcase-automator/SKILL.md` |
| Add or change a fixture | `fixtures/index.ts` (fixture inventory; start state is logged in, opt out with `test.use({ loggedIn: false })`) |
| Need locator evidence | `.agents/skills/mobilewright-ui-tree-extractor/SKILL.md` |
| Code review | `.agents/skills/mobilewright-script-reviewer/SKILL.md` |
| Bug report for a failing test | `.agents/skills/mobilewright-bug-reporter/SKILL.md` |
| `verify` fails and the message isn't self-explanatory, or adding a check | The matching section of `docs/static-analysis.md` |

Read in full: the skill files above, the `.ui-evidence/<screen>-locators.yml`
for the screens you touch, and any file you are about to edit. Everything else
in `.ui-evidence/`, plus `test-results/` and `mobilewright-report/`: search or
read line ranges; never load them whole. Don't re-read an unchanged file
already in context.

## 7. Done means

- `npm run verify` passes. Fix failures and rerun, showing only failing output.
  Same failure after two attempts → stop and report.
- Run only the specs that cover the change: those named in the plan (T2/T3), or
  the specs using the touched file (T1). Specs need a device: check
  `adb devices`; if none is connected, name the specs and report them as
  **not run**. Never claim an unrun test passed.
- Never raise timeouts, add retries, or disable parallelism to hide flakiness.
- Never remove or weaken an assertion while refactoring a spec unless the plan
  says so; a refactored test still checks what it checked before.
- Out-of-scope problems are flagged, not fixed.
- Commit messages (when asked): `<type>(scope): summary`, one logical change per commit.

## 8. Final report (≤6 lines)

Files changed · skills read · verify result · specs run + result (or "not run:
no device") · deviations from plan · items flagged.
