# Locator patterns

Load this when writing a locator factory or matching a label with a pattern.
Examples come from this repo and name their evidence. Where the repo code has a
flaw, the example here is the corrected version and says so: copy from here,
not from the original.

## 1. Chained from a labelled container

Flutter wraps an input in a labelled `View`; the `EditText` inside has no label
of its own. Scope from the container. Evidence: `login-locators.yml`
(`View "LOGIN_INPUT_USERNAME"` → child `EditText`).

```typescript
private getUsernameInput() {
  return this.screen
    .getByLabel('LOGIN_INPUT_USERNAME')
    .getByRole('textfield');
}
```

A textfield's accessible name is its current text, so the same chain can assert
a value: `.getByRole('textfield', { name: expected })` (see
`HomePage.verifyUsername`).

## 2. Typed-key factory (one of a fixed set)

The key is a union type, so a typo fails at compile time and three tabs don't
become three methods. Evidence: `home-locators.yml`
(`Button "Home\nTab 1 of 3"`, `"Profile\nTab 2 of 3"`, `"Menu\nTab 3 of 3"`).

```typescript
export type NavTab = 'Home' | 'Profile' | 'Menu';

/** Tab labels are "<Name>\nTab N of 3": anchor on the name. */
private getTab(tab: NavTab) {
  return this.screen.getByRole('button', { name: new RegExp(`^${tab}\\n`) });
}
```

A regex built from a **typed union** is safe: every value is known and has no
special characters. Anchor on the delimiter (`\n`), not just `^${tab}`, or a
future `"Home settings"` tab would also match. (Source: `BottomNavBar.getTab`.)

## 3. Runtime-data factory (identity comes from test data)

Use a plain string: `getByRole` `name` strings match exactly, so `India` can't
match `British Indian Ocean Territory`. Evidence: `home-country-dropdown-locators.yml`
(`Button "Egypt"`, `Button "India"`).

```typescript
private getCountryOption(country: string) {
  return this.screen.getByRole('button', { name: country });
}
```

## 4. Label with a known format

When the label wraps data in a fixed format, escape the data and anchor both
ends. Evidence: `DatePicker.dayButton`, exercised by the passing Phase 3 form
test: date cells read `"28, Monday, September 28, 2026"`, sometimes with a
suffix such as `", Today"`.

```typescript
private dayButton({ year, month, day }: PickerDate) {
  return this.screen.getByRole('button', {
    name: new RegExp(`^${day}, [A-Za-z]+, ${MONTHS[month - 1]} ${day}, ${year}(,|$)`),
  });
}
```

Numbers and a fixed month list need no escaping. Free text from test data does:

```typescript
const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
new RegExp(`^${escapeRegExp(name)}\\n`);
```

Constrain only what the evidence proves: one capture showing no suffix doesn't
prove there is never a suffix (hence `(,|$)` above).

## 5. Wrapping a passed-in locator (component)

A component that wraps one widget takes the host locator from its page, so the
page keeps ownership of the evidence-backed locator.

```typescript
// HomePage
private getTermsCheckbox() {
  return new Checkbox(this.screen.getByRole('checkbox', { name: 'HOME_CHECKBOX_TERMS' }));
}

// pages/components/Checkbox.ts
import type { Locator } from '@mobilewright/core';

export class Checkbox {
  constructor(private readonly locator: Locator) {}
}
```

## 6. Merged label on a role-less View

Flutter often merges a card's texts into one `View` label. `View` maps to no
role and `getByLabel` takes no regex, so anchor `getByText` on the card's
fixed heading (`getByText`/`getText` fall back to the label), then assert a
field with an escaped, anchored regex. Evidence: `profile-locators.yml`
(`View "User Profile\nUsername:\n<name>\nEmail:\n<email>"`).

```typescript
private getUserProfileCard() {
  return this.screen.getByText(/^User Profile\n/);
}

@step('Verify profile shows username "{0}"')
async verifyUsername(username: string): Promise<void> {
  await expect(this.getUserProfileCard(), 'profile card shows the username')
    .toHaveText(new RegExp(`\\nUsername:\\n${escapeRegExp(username)}(\\n|$)`));
}
```

The `(\n|$)` end anchor stops `omar` from matching `omar_phase3`. The expected
username comes from the spec (test data), not from the capture.

## 7. Overlay anchor for a close wait

An open dropdown or sheet often adds a node that exists only while it is open:
wait for that node to be hidden before returning. Evidence:
`home-country-dropdown-locators.yml` has `View "Dismiss"` (the barrier behind
the open list); `home-locators.yml` (list closed) has none.

```typescript
private getDropdownBarrier() {
  return this.screen.getByLabel('Dismiss');
}
// after tapping an option:
await this.getDropdownBarrier().waitFor({ state: 'hidden' });
```

## Don't

| Don't | Why | Do |
|---|---|---|
| `getByLabel('HOME_DATE', { exact: false })` | case-insensitive substring: also matches `HOME_DATE_PICKER` and `HOME_DATE_RANGE` | the full label, or an anchored regex on `getByRole` |
| `new RegExp(country)` with test data | `(`, `+`, `.` break it; unanchored = partial match | a plain string (§3), or escape + anchor (§4) |
| `getByText('Submit')` when a label exists | breaks on translation or copy edits | `getByLabel` / `getByRole` with the label |
| `getByType('android.widget.Button')` | Android-only class name, matches every button | `getByRole('button', { name })` |
| `.first()` "to be safe" | hides ambiguity; Mobilewright already picks the first match silently | a unique label, or chain from a unique container |
| a label invented from the widget's purpose | the capture is the only truth | capture it (`mobilewright-ui-tree-extractor`) |
