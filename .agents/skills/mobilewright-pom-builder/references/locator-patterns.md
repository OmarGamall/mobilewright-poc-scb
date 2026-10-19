# Locator patterns

Load this when writing a locator factory or matching a label with a pattern.
Examples come from this repo and name their evidence, unless marked
*Illustrative*. Where the repo code has a flaw, the example here is the corrected version and says so: copy from here,
not from the original.

## 1. Chained from a labelled container

Flutter wraps an input in a labelled `View`; the `EditText` inside has no label
of its own. Scope from the container. Evidence: `login-locators.yml`
(`View "USERNAME input field for username_field\n<visible text>"` → child
`EditText`). The visible text follows the app language, so anchor on the key
part only. (Source: `LoginPage.getUsernameInput`.)

```typescript
/** Role-less View with a merged label: matched by getByText's label fallback. */
private getUsernameInput() {
  return this.screen
    .getByText(/^USERNAME input field for username_field\n/)
    .getByRole('textfield');
}
```

A textfield's accessible name is its current text, so the same chain can assert
a value: `.getByRole('textfield', { name: expected })`.

## 2. Typed-key factory (one of a fixed set)

The key is a union type, so a typo fails at compile time and four tabs don't
become three methods. Evidence: `home1-locators.yml`
(`Button "Home\nTab 1 of 4"`, `"Transfers\nTab 2 of 4"`, `"Products\nTab 3 of 4"`,
`"More\nTab 4 of 4"`).

```typescript
export type NavTab = 'Home' | 'Transfers' | 'Products' | 'More';

/** Tab labels are "<Name>\nTab N of 4": anchor on the name. */
private getTab(tab: NavTab) {
  return this.screen.getByRole('button', { name: new RegExp(`^${tab}\\n`) });
}
```

A regex built from a **typed union** is safe: every value is known and has no
special characters. Anchor on the delimiter (`\n`), not just `^${tab}`, or a
future `"Home settings"` tab would also match. (Source: `BottomNavBar.getTab`.)

## 3. Runtime-data factory (identity comes from test data)

Use a plain string: `getByLabel` and `getByRole` `name` strings match exactly,
so `ALI` can't match `ALIA`. Evidence: `home1-locators.yml` (the header's
display name is its own `View`, next to `View "Hi,"`). The expected name comes
from test data (`displayName` in `data/users.ts`). (Source: `HomePage.getUserName`.)

```typescript
/** @param displayName - The user's name, shown in its own View next to "Hi,". */
private getUserName(displayName: string) {
  return this.screen.getByLabel(displayName);
}
```

## 4. Label with a known format

When the label wraps data in a fixed format, escape the data and anchor both
ends. Source: `DatePicker.dayButton` (a POC component; no current spec
exercises it): date cells read `"28, Monday, September 28, 2026"`, sometimes
with a suffix such as `", Today"`.

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
page keeps ownership of the evidence-backed locator. Illustrative (no current
POM uses this; `pages/components/Checkbox.ts` is real, the page side and its label
are not):

```typescript
// SomePage
private getConsentCheckbox() {
  return new Checkbox(this.screen.getByRole('checkbox', { name: '<label from the capture>' }));
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
fixed heading (`getByText`/`getText` fall back to the label). Evidence:
`login-miss-username-pass-locators.yml`
(`View "alert\nMissing Information\nPlease enter both your username and password to log in."`).
(Source: `MissingInformationAlert.getAlert`.)

```typescript
/** Role-less View with a merged label: matched by getByText's label fallback. */
private getAlert() {
  return this.screen.getByText(/^alert\nMissing Information\n/);
}
```

To assert a data field inside such a label, use an escaped, anchored regex.
Illustrative (no current POM does this; the card and field names are made up):

```typescript
await expect(this.getCard(), 'card shows the username')
  .toHaveText(new RegExp(`\nUsername:\n${escapeRegExp(username)}(\n|$)`));
```

The `(\n|$)` end anchor stops `omar` from matching `omar_2`. The expected
value comes from the spec (test data), not from the capture.

## 7. Overlay anchor for a close wait

A dialog, sheet or dropdown has a node that exists only while it is open:
after the closing tap, wait for that node to be hidden before returning, so the
caller's next tap can't land on the closing overlay. Evidence:
`enable-biometric-popup-locators.yml` (`View "Enable Biometric"`, the popup
title). (Source: `EnableBiometricPopup.decline`; `InvalidCredentialsDialog.cancel`
does the same with its message.)

```typescript
async decline(): Promise<void> {
  await this.getLaterButton().tap();
  await this.getTitle().waitFor({ state: 'hidden' });
}
```

## Don't

| Don't | Why | Do |
|---|---|---|
| `getByLabel('HOME_DATE', { exact: false })` | case-insensitive substring: also matches `HOME_DATE_PICKER` and `HOME_DATE_RANGE` | the full label, or an anchored regex on `getByRole` |
| `new RegExp(name)` with test data | `(`, `+`, `.` break it; unanchored = partial match | a plain string (§3), or escape + anchor (§4) |
| `getByText('Submit')` when a label exists | breaks on translation or copy edits | `getByLabel` / `getByRole` with the label |
| `getByType('android.widget.Button')` | Android-only class name, matches every button | `getByRole('button', { name })` |
| `.first()` "to be safe" | hides ambiguity; Mobilewright already picks the first match silently | a unique label, or chain from a unique container |
| a label invented from the widget's purpose | the capture is the only truth | capture it (`mobilewright-ui-tree-extractor`) |
