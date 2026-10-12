---
name: mobilewright-pom-builder
description: >-
  Judgment rules for creating or changing Mobilewright TypeScript Page Objects
  (pages/) and Components (components/) for a Flutter/Android app: new screen
  POM or reusable widget (picker, checkbox, nav bar, bottom sheet), adding or
  changing a method, locator, locator factory, verify method, or wait.
---

# Mobilewright POM Builder

Structural rules (private locator factories, no public getters, JSDoc, return
types, no sleeps, file naming) are enforced by `npm run verify`; run it, don't
hand-check. This skill covers what lint cannot decide.

## 0. Before you start

- **Evidence** per AGENTS.md §4; not needed when composing methods from
  existing locators. Evidence lives in `.ui-evidence/<screen>-locators.yml`
  (summary) and `<screen>-tree.json` (full tree). None, or the screen changed →
  `mobilewright-ui-tree-extractor` skill.
- **Using a capture:** the extractor already strips system UI and redacts
  `EditText` text; don't re-check that. Only check: (1) the header's screen
  slug and data state match what the user named; (2) labels contain no real
  personal data. If either fails, stop and ask for a re-capture.
- **Mobilewright is not Playwright web.** The API is in
  `node_modules/@mobilewright/core/dist/{screen,locator,expect}.d.ts`; check a
  method exists there before using it. There is no `click`, `goto`, `page`,
  `waitForResponse` or network interception.
- **Existing POMs predate these rules; where they differ, this skill wins.**
  Take layout from the §2 skeleton, not from another POM.
- **Your plan must state:** (a) the evidence (file + label) for each new
  locator; (b) for each side-effecting action, which §5 case applies.

## 1. Page or component?

| What | Where | Shape |
|---|---|---|
| A full app screen | `pages/<Name>Page.ts` | plain class, `constructor(private readonly screen: Screen)` |
| A reusable widget (picker, checkbox, nav bar, sheet) | `components/<Name>.ts` | plain class taking `Screen`, or the host `Locator` it wraps (see `Checkbox`) |

- A page uses a component through a **private factory**
  (`private navBar() { return new BottomNavBar(this.screen); }`), never a field.
- A widget used by two or more screens is a component. Never copy its locators
  into a second page.
- Every POM a spec needs is registered as a fixture in
  `fixtures/pages.fixture.ts` and listed in the `fixtures/index.ts` inventory.
  Specs cannot construct POMs.

## 2. Class layout

Skeleton (every `<…>` is a placeholder that needs evidence):

```typescript
import type { Screen } from '@mobilewright/core';
import { expect } from '@mobilewright/test';
import { step } from '../utils/step';

/**
 * @fileoverview <What this screen does, one line.>
 * Evidence: .ui-evidence/<screen>-locators.yml
 */
export class <Name>Page {
  constructor(private readonly screen: Screen) {}

  // ============================================================================
  // LOCATORS (private factory methods)
  // ============================================================================

  private get<Element>() {
    return this.screen.getByLabel('<LABEL_KEY>');
  }

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * <What the user achieves.>
   * @param <arg> - <meaning>
   */
  @step('<Domain phrase> "{0}"')
  async <domainVerb>(<arg>: <Type>): Promise<void> { /* §4, §5 */ }

  // ============================================================================
  // VERIFY METHODS
  // ============================================================================

  /** Verifies <state>. */
  @step('Verify <state>')
  async verify<State>(): Promise<void> { /* §6 */ }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================
}
```

Locators are **factory methods**, never fields: the Flutter tree is rebuilt
constantly, and a factory resolves fresh on every call.

| The element is… | Use |
|---|---|
| Exactly one on screen | `private getX()` |
| One of a fixed set (tab, menu item) | **typed-key factory**: `private getTab(tab: NavTab)`; the union/enum lives in the component or `models/` |
| Identified by test data (country, list row) | **runtime-data factory**: `private getCountryOption(country: string)` |
| A control inside a container | **chain** off the container: `this.getRow(x).getByRole('button', …)` |

**Writing a factory or matching a label pattern? Read `references/locator-patterns.md`.**

## 3. Locators

Pick the highest option **the evidence actually shows**; never invent a value
to stay high.

| # | Locator | Matches (Android) | Use when |
|---|---|---|---|
| 1 | `getByTestId(id)` | `resource-id` (Flutter `Semantics(identifier:)`) | `identifier` appears in `<screen>-tree.json`. Stable across locale and copy changes |
| 2 | `getByLabel(label)` | accessibility label (`content-desc`) | The app sets semantic labels: the `UPPER_SNAKE` keys here (`LOGIN_INPUT_USERNAME`) are deliberate test hooks |
| 3 | `getByRole(role, { name })` | native type mapped to a role, + label (or text) | No unique label, but role + name is unique. Roles: `button`, `textfield`, `checkbox`, `radio`, `switch`, `tab`, `text`, `image`, `list`, `listitem`, … (full list: `ROLE_TYPE_MAP` in `query-engine.d.ts`) |
| 4 | `getByText(text)` | visible text, else label | Static visible copy only; breaks on translation and copy edits |
| — | `getByPlaceholder` | `placeholder` (input hint) | Not captured by the extractor yet, so there is no evidence; don't use |
| — | `getByType(type)` | raw native class (`android.widget.EditText`) | Platform-specific; last resort, with a comment giving the reason |

**Matching precision** (a near-match makes a test pass on the wrong element):
- **There is no strict mode.** Unlike Playwright, an action on a locator that
  matches several elements silently uses the *first* match. Confirm in the
  capture that the label/name is unique on the screen; if it isn't, scope it by
  chaining from a unique container.
- `getByLabel` / `getByText` are **exact and case-sensitive** by default.
  `{ exact: false }` switches to case-insensitive *substring*; avoid it when
  values can overlap.
- `getByRole` `name`: a string must equal the label exactly; a `RegExp` is
  tested. Use a regex only for labels with a known format (multi-line nav tabs,
  date cells), **anchor it** (`^…`, `…$`), and escape any test data inside it.
- Scope by container instead of reaching for `.first()`/`.nth()`/`.last()`.
  Positional access is allowed only when position *is* the behavior, with an
  `eslint-disable-next-line playwright/no-nth-methods -- <ordering + evidence>`.

## 4. Actions

- Name public methods as domain verbs: `login()`, `selectCountry()`,
  `navigateTo(tab)`, not `tapLoginButton()`.
- Parameters use `models/` types or unions (`NavTab`, `PickerDate`) instead of
  `string` wherever one exists, so typos fail at compile time.
- **Composite first:** public composite actions (`login(user, pass)`) are what
  specs call. Atomic steps (`inputUsername`) stay `private` until a real
  focused test needs them public; never expose "just in case".
- No generic wrappers (`tapElement`, `safeFill`).
- **Keyboard trap:** after typing, the soft keyboard can cover bottom-of-screen
  targets (nav bar, submit), so the tap lands on the keyboard. The POM or
  component that owns the tap dismisses it first with `dismissKeyboard` from
  `helpers/keyboard.ts` (see `BottomNavBar.navigateTo`). Specs never do this.

### `@step` reporting rule (import from `../utils/step`)

Annotate a method only if it is `async`, performs UI interaction or an assertion,
has a name a human would recognize as a test step, and is neither a pure forwarder
to another annotated method nor a mechanical loop/retry helper.

- **Annotate:** public composite actions, public atomic actions, public verify
  methods, and private helpers that are a distinct named phase (e.g. `selectYear`).
- **Do NOT annotate:** private locator factories, constructors/setup, non-async or
  value-returning methods, loop/retry helpers (e.g. `scrollYears`), pure forwarders
  (the owning layer keeps the decorator).
- **Templates:** `{0}`, `{1}` interpolate arguments; quote string arguments
  (`"{0}"`), not object arguments. Never interpolate sensitive arguments (passwords,
  tokens); if one must appear, list its index in `{ mask: [n] }`.
- **Borderline?** Leave it undecorated and flag it for review.

## 5. Synchronization

Mobilewright actions (`tap`, `fill`) already wait for the element to be
visible, enabled and stable. Decide for **every** action with a side effect:

1. Does the next step act on an element that appears as a result? → nothing
   extra; the next action/assertion waits for it.
2. Does it change screen, or close a picker / sheet / dialog? → before
   returning, wait for an anchor: the new screen's anchor `toBeVisible()`, or
   the closed container `waitFor({ state: 'hidden' })`. Otherwise the next tap
   can land on the closing overlay.
3. Is the target off-screen in a scrollable list? → `scrollIntoViewIfNeeded()`
   before acting; a manual `swipe` loop only when that can't reach it.
4. Does it start an animation with **no** observable end state? → only in a
   component: a short settle delay with a disable comment giving the reason
   (see `DatePicker.scrollYears`). Never in a page or spec.

Background work (API calls) has no hook here: wait for the UI it produces.
Never raise timeouts to hide flakiness.
**Read `references/sync-patterns.md` only for:** scrolling lists, pickers and
sheets, keyboard handling, or app relaunch/state.

## 6. Verify and read methods

- Prefix `verify…`; assert with `expect(locator)` from `@mobilewright/test`
  (`toBeVisible`, `toHaveText`, `toHaveValue`, `toBeChecked`, `toBeEnabled`,
  `toBeSelected`, …; full list in `expect.d.ts`). Prefer `expect` over a bare
  `waitFor`: it reports as an assertion with expected vs received.
- Add a message (2nd arg) when the failure wouldn't be obvious:
  `expect(locator, 'terms must stay checked after scrolling')`.
- **Absence** (`toBeHidden`, `.not.toBeVisible()`) passes instantly before the
  screen renders. Assert a positive anchor first, then the absence.
- **Multi-field checks:** one hard anchor first, then `expect.soft` per field so
  one run reports every mismatch.
- **Read methods** (`getText`, `getValue`, `isChecked` → return data) snapshot
  without retrying: wait for a stable state first, then read. They pass data
  between steps; they are not assertions.

## 7. Scope and done

Touch only the target POM/component, the components it needs, and its fixture
registration, unless the plan says otherwise. Done = AGENTS.md §7–8, plus
every §0 plan item covered.
