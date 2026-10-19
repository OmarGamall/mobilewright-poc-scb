---
name: mobilewright-pom-builder
description: >-
  Judgment rules for creating or changing Mobilewright TypeScript Page Objects
  (pages/) and Components (pages/components/) for a Flutter/Android app: new screen
  POM or reusable widget (picker, checkbox, nav bar, bottom sheet), adding or
  changing a method, locator, locator factory, verify method, or wait.
---

# Mobilewright POM Builder

Structural rules (private locator factories, no public getters, JSDoc, return
types, no sleeps, file naming) are enforced by `npm run verify`; run it, don't
hand-check. This skill covers what lint cannot decide.

## 0. Before you start

- **Evidence** per AGENTS.md §4: `.ui-evidence/<slug>-locators.yml`. No capture,
  a stale one, or a warning you can't resolve → `mobilewright-ui-tree-extractor`
  (it also explains each element field and warning).
- **Composing from existing locators** needs no new evidence, but if a reused
  locator has no capture behind it, or its method skips a §5 wait, say so in
  the plan.
- **Using a capture:** the extractor already strips system UI, redacts typed
  text and computes each element's `role`; don't re-check that. Check: (1) the
  slug is the screen and state you need (state is encoded in the slug, e.g.
  `login-miss-username-pass` = login with the Missing Information alert shown); (2) its
  `warnings:` are resolved (duplicates, keyboard, overlay…); (3) labels hold no
  real personal data (the dummy `data/` accounts and `@test.com` addresses are
  fine). If any fails, ask for a re-capture.
- **API surface:** `node_modules/@mobilewright/core/dist/{screen,locator,expect}.d.ts`.
  There is no `click`, `goto`, `page`, `waitForResponse` or network interception.
- **Layout comes from the §2 skeleton**, not from another POM; older POMs
  predate these rules.
- **Your plan must state:** (a) the evidence (file + label) for each new
  locator; (b) for each side-effecting action, which §5 case applies;
  (c) assertions the change removes or moves, if any.

## 1. Page or component?

| What | Where | Shape |
|---|---|---|
| A full app screen | `pages/<Name>Page.ts` | plain class, `constructor(private readonly screen: Screen)` |
| A reusable widget (picker, checkbox, nav bar, sheet) | `pages/components/<Name>.ts` | plain class taking `Screen`, or the host `Locator` it wraps (see `Checkbox`) |

- A page uses a component through a **private factory**
  (`private navBar() { return new BottomNavBar(this.screen); }`), never a field.
- A widget used by two or more screens is a component. Never copy its locators
  into a second page.
- Every POM a spec needs is registered as a fixture in
  `fixtures/pages.fixture.ts` and listed in the `fixtures/index.ts` inventory.
  Specs cannot construct POMs.
- A POM never constructs another POM or reuses its locators. When an action
  lands on another screen, the caller verifies it through that screen's POM (§5).

**Types and models:**

| The type is… | It lives in |
|---|---|
| Only meaningful to one component (`PickerDate`, `NavTab`) | exported from that component |
| Shared domain data (a user, a form's values) | `models/<Thing>Model.ts`, exporting `<Thing>` (as `UserModel.ts` → `User`) |

A model may import component types (`date: PickerDate`). Test data values go in
`data/`, typed with the model; never re-declare a model's interface there.

## 2. Class layout

Skeleton (every `<…>` is a placeholder that needs evidence):

```typescript
import type { Screen } from '@mobilewright/core';
import { expect } from '@mobilewright/test';
import { step } from '@utils/step';

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
| Identified by test data (user name, list row) | **runtime-data factory**: `private getUserName(displayName: string)` |
| A control inside a container | **chain** off the container: `this.getRow(x).getByRole('button', …)` |

**Writing a factory or matching a label pattern? Read `references/locator-patterns.md`.**

## 3. Locators

Pick the highest option **the evidence actually shows**; never invent a value
to stay high.

| # | Locator | Matches (Android) | Use when |
|---|---|---|---|
| 1 | `getByTestId(id)` | `resource-id` (Flutter `Semantics(identifier:)`) | `identifier:` appears in the capture. Stable across locale and copy changes. Pass the bare id; `pkg:id/name` also matches `name` |
| 2 | `getByLabel(label)` | accessibility label (`content-desc`) | The capture shows a unique label. Prefer a stable key part over visible copy (on Login, `USERNAME input field for username_field`) |
| 3 | `getByRole(role, { name })` | native type mapped to a role, + label (or text) | No unique label, but role + name is unique. Roles: `button`, `textfield`, `checkbox`, `radio`, `switch`, `tab`, `text`, `image`, `list`, `listitem`, … (full list: `ROLE_TYPE_MAP` in `query-engine.d.ts`) |
| 4 | `getByText(text)` | visible text, else label | Static visible copy only; breaks on translation and copy edits |
| 5 | `getByPlaceholder(text)` | `placeholder` (input hint) | An empty input whose only handle is its hint (`placeholder:` in the capture); breaks on translation like text |
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
- `getByLabel` accepts a string only. A role-less `View` whose label merges
  several texts (`"alert\nMissing Information\n…"`) is matched with an anchored
  `getByText(/^…/)`, which falls back to the label: see
  `references/locator-patterns.md` §6.
- Scope by container instead of reaching for `.first()`/`.nth()`/`.last()`.
  Positional access is allowed only when position *is* the behavior, with an
  `eslint-disable-next-line playwright/no-nth-methods -- <ordering + evidence>`.

## 4. Actions

- Name public methods as domain verbs: `login()`, `declineBiometric()`,
  `navigateTo(tab)`, not `tapLoginButton()`.
- Parameters use `models/` types or unions (`NavTab`, `PickerDate`) instead of
  `string` wherever one exists, so typos fail at compile time.
- **Composite first:** public composite actions (`login(user, pass)`) are what
  specs call. A new atomic step stays `private` unless a spec calls it on its
  own; never expose "just in case". Existing public atomics stay public while
  any spec calls them; refactoring the callers doesn't make them private as a
  side effect (flag instead).
- No generic wrappers (`tapElement`, `safeFill`).
- **Keyboard:** an open soft keyboard covers bottom-of-screen targets (nav bar,
  submit), and a tap there lands on the keyboard. It opens when a field gets
  focus: after our `fill()`, **and also when a screen auto-focuses a field on
  arrival** (observed on the POC app's Home after login; unverified on the
  current app). Mobilewright cannot detect an open keyboard.
  Close it with `dismissKeyboard(this.screen)` from `helpers/keyboard.ts`
  (sends ENTER; on the tested Android device it closes the keyboard and does
  nothing when none is open):
  1. in the method that typed, after its last `fill()`;
  2. in the POM/component that taps something a keyboard may cover, right
     before that tap (see `BottomNavBar.navigateTo`).

  Never press Back to close a keyboard: with no keyboard open it navigates away.
  Specs never handle the keyboard. Details and what is verified:
  `references/sync-patterns.md` § Keyboard.

### `@step` reporting rule (import from `@utils/step`)

The report should read as one domain step per user action, with the raw
`locator.*` calls inside it. So:

| Layer | Decorate | Don't decorate |
|---|---|---|
| **Page** | every public action and verify method, including ones that delegate to a component (`HomePage.declineBiometric` → `EnableBiometricPopup.decline`): the page knows the domain name ("biometric") | locator factories, constructors, non-async or value-returning methods (`HomePage.getDisplayName`) |
| **Component** | only the private, named phases of a multi-step flow (`DatePicker.selectYear`, `goToMonth`, `selectDay`) | its public methods (the calling page's step names them), single-action methods, loop/retry helpers (`scrollYears`) |

- **Templates:** `{0}`, `{1}` interpolate arguments; quote string values,
  including string fields (`"{0}"`, `"{0.username}"`). For an object use its
  fields (`{0.year}-{0.month}-{0.day}`), never the whole object. Never
  interpolate sensitive arguments (passwords, tokens); if one must appear, list
  its index in `{ mask: [n] }`.
- **Don't pass `box`:** the default keeps the full stack, so a failure inside a
  composite step shows the exact inner line.
- **Borderline?** Decorate at the page, not the component, and flag it.

## 5. Synchronization

Mobilewright actions (`tap`, `fill`) already wait for the element to be
visible, enabled and stable. Decide for **every** action with a side effect:

1. Does the next step act on an element that appears as a result? → nothing
   extra; the next action/assertion waits for it.
2. Does it close a picker / sheet / dropdown / dialog this POM owns? → before
   returning, `waitFor({ state: 'hidden' })` on that overlay's own anchor
   (e.g. the popup title in `EnableBiometricPopup.decline`). Otherwise the next tap can land on the
   closing overlay.
3. Does it change screen? → return after the tap; **the caller verifies the
   destination** with that screen's POM (`login()` then
   `homePage.verifyOnHomeScreen(user.displayName)`). A POM never waits on another screen's
   locator. If a later call in the *same* method could still hit the old screen,
   wait for this screen's own anchor to be hidden.
4. Is the target off-screen in a scrollable list? → `scrollIntoViewIfNeeded()`
   before acting; a manual `swipe` loop only when that can't reach it.
5. Does it start an animation with **no** observable end state? → only in a
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
- Add a message (2nd arg) when the locator alone doesn't say what is being
  checked (regex labels, merged views):
  `expect(this.getAlert(), 'Missing Information alert is shown')`.
- The expected value is a parameter the spec passes from `data/` or the
  fixture's user; never hardcode what a capture happened to show.
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
