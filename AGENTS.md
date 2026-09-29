# Agent Rules — Mobilewright TypeScript Automation Framework

These rules apply to every agent working in this repository. They override
general habits/defaults whenever there's a conflict.

## 1. Permission & Autonomy

- **Never modify, create, or delete any file without explicit confirmation
  first.** This includes test files, page objects, components, fixtures,
  config files, `package.json`, and CI workflow files. No exceptions,
  including "trivial" fixes like typos or formatting.
- Before making any change, state exactly which file(s) you intend to touch
  and what the change will do, then wait for an explicit "yes"/"go ahead"
  before writing anything.
- Never run destructive or state-changing shell commands
  (`git push`, `git reset --hard`, `rm`, package installs/removals,
  `npm publish`) without asking first, even if a plan already covered it.
- If a task turns out to require touching a file outside what was already
  approved, stop and ask again before proceeding — approval is scoped to
  what was described, not open-ended.

## 2. Planning Requirement

- Before writing any code, produce a **written implementation plan as a
  file on disk** (not just a chat message) at `plans/<short-task-name>.md`.
- The plan must include:
  - Goal / what this change accomplishes
  - Exact list of files to be created or modified
  - For each file: what changes, in what order
  - **The actual code to be written or changed, in full** — not a
    description of it. For a new file, the complete file content. For an
    edit to an existing file, the exact before/after snippet (diff-style:
    what's removed, what's added). A plan that only narrates the change in
    prose ("will add a login method") is incomplete — the code itself must
    be in the plan file, ready to be copied into the real file as-is once
    approved.
  - Any new dependencies being introduced
  - How the change will be verified (which tests, manual check, etc.)
- Wait for explicit approval of the plan file before implementing anything
  in it.
- Implementation must match the approved code in the plan exactly. If
  something needs to change during implementation (an error, a missed
  edge case), stop, update the plan file with the revised code, and get
  it re-approved before continuing — never silently write code that
  differs from what was approved in the plan.

## 3. Architecture — Strict Page Object Model

- Fixed folder structure. Do not introduce new top-level folders or deviate
  from this layout without it being called out and approved as part of a plan:
  ```
  /tests          → *.spec.ts test files only — no direct screen.* calls
  /pages          → one Page Object class per screen/major component
  /components     → reusable Flutter/mobile UI component wrappers (DatePicker, Checkbox, etc.)
  /fixtures       → custom Mobilewright fixtures, test data factories
  /utils          → framework-level helpers (ui-tree-extractor, etc.)
  /config         → environment config (env.ts — device ID, bundle ID)
  /models         → TypeScript interfaces and type definitions
  /helpers        → reusable cross-screen helper functions
  /data           → static test data (users, constants)
  /plans          → implementation plan files
  /bug-reports    → generated bug reports
  ```
- **No `screen.` calls of any kind directly inside spec files.** All
  interaction with the screen happens through Page Object or Component methods.
- Page Objects expose **semantic action/assertion methods**, not raw
  locators (`login(user, pass)`, not `get usernameInput()` used inline in a test).
- One Page Object per screen or logically distinct component. No
  "god object" page classes covering multiple screens.
- Locators live only inside their owning Page Object or Component class —
  never duplicated across files, never redefined inline in a test.
- **Use Dynamic Locator methods for repeating UI patterns:** When interacting
  with lists or dynamic data, write private helper methods that return a
  locator generated on-the-fly (e.g., `this.screen.getByRole('button', { name: item.label })`).
- Every new Page Object and every new spec file follows the same
  constructor/method-naming pattern as existing ones — check an existing
  file before creating a new one, don't invent a new convention.

## 4. Coding Standards

- TypeScript: no `any`. Explicit types on exported functions/classes and on
  fixture/data shapes.
- Return Types: Every public method must have an explicit return type
  (e.g., `Promise<void>`, `Promise<string>`).
- Imports: Use the `type` keyword for type-only imports
  (e.g., `import type { Screen } from '@mobilewright/core'`).
- JSDoc: Document parameters with `@param` tags on all public methods.
- **Reporting / `@step` decorator** (import from `../utils/step`):
  Annotate a method only if it is `async`, performs UI interaction or an assertion, has a name a human would recognize as a test step, and is neither a pure forwarder to another annotated method nor a mechanical loop/retry helper.
  - Annotate: public composite actions, public atomic actions, public verify methods, and private helpers that are a distinct named phase (e.g. `selectYear`).
  - Do NOT annotate: private locator factories, constructors/setup, non-async or value-returning methods, loop/retry helpers (e.g. `scrollYears`), pure forwarders (the owning layer keeps the decorator).
  - Templates: `{0}`, `{1}` interpolate arguments; quote string arguments (`"{0}"`), not object arguments. Never interpolate sensitive arguments; if one must appear, list its index in `{ mask: [n] }`.
  - When a method is borderline, leave it undecorated and flag it for review.
- **Locator Strategy & Waiting Rules:**

  ### Locator Priority (Mobile / Flutter)
  Mobile locator priority differs from web — there is no `getByPlaceholder`
  or `getByTestId` in Mobilewright. Use this order:

  `getByLabel  >  getByRole  >  getByText`

  - Locators are **chained** to scope by container:
    `this.screen.getByLabel('LOGIN_INPUT_USERNAME').getByRole('textfield')`
  - **Never fabricate** accessible names, label keys, or role strings without
    evidence from a UI tree dump. Use the `mobilewright-ui-tree-extractor`
    skill to capture live evidence before writing any new locator.
  - Locators in this project are **private factory methods** (not `private readonly`
    class fields), because mobile UI trees are dynamic. Example:
    ```typescript
    private getUsernameInput() {
      return this.screen
        .getByLabel('LOGIN_INPUT_USERNAME')
        .getByRole('textfield');
    }
    ```

  ### Waiting Rules
  - Use `locator.waitFor({ state: 'visible' })` for explicit waits.
  - `setTimeout` / `new Promise(resolve => setTimeout(...))` is **only**
    acceptable inside Component classes as a settle delay when the mobile UI
    has no observable ready-signal — must be documented with a comment
    explaining why no better signal exists.
  - No `waitForResponse` / `waitForURL` — Mobilewright has no HTTP interception.
  - Never swallow errors with empty/broad `try/catch` around actions.

- All async operations must be awaited — no fire-and-forget promises.

## 5. Testing Rules

- Every test has at least one meaningful `waitFor` or assertion. Actions with
  no assertion are not acceptable as tests.
- Tests must be independent: no reliance on execution order, no shared
  mutable state between tests without explicit setup/teardown.
- Test data must be unique per run (generated, not hardcoded) where
  collisions are possible.
- `test.only` and `test.skip` must never be left in code that's proposed
  as "done" — flag them explicitly if used temporarily.

## 6. Git & Change Hygiene

- One logical change per commit/PR. Do not bundle unrelated fixes into an
  approved task.
- Do not touch files outside the scope of the approved plan, even ones
  that "look wrong" — flag them separately instead.
- Commit messages: `<type>(scope): summary`
  (e.g. `feat(login-page): add login POM and happy-path test`).
- Do not rewrite or restructure existing passing tests as a side effect of
  an unrelated task without calling it out first.

## 7. Communication & Assumptions

- **No Hallucinations:** Never fabricate accessible names, label keys, role
  strings, or UI tree structures without evidence. Distinguish between facts
  (what you can prove via existing code, UI tree dumps, or explicit user
  confirmation) and assumptions (what you infer).
- When blocked or uncertain (ambiguous requirement, missing UI evidence,
  unclear expected behavior), stop and ask — do not guess and proceed.
- Summarize what was actually done vs. what was planned at the end of each
  task, calling out any deviations.
