# Sync patterns

The decision list is in SKILL.md §5. This file covers the less common cases.
Behavior described here is from `@mobilewright/core` source
(`node_modules/@mobilewright/core/dist/locator.js`); re-check it after a
Mobilewright upgrade.

## What Mobilewright already waits for

| Call | Waits until | Then |
|---|---|---|
| `tap()`, `doubleTap()`, `longPress()` | first match is visible, enabled, and its bounds are stable across two polls | taps the element's **center coordinates** |
| `fill(text)` | same as `tap()` | taps, clears, **checks the field is empty** (throws if not), types |
| `expect(locator).toBeVisible()` etc. | assertion passes, retried until the expect timeout | — |
| `waitFor({ state })` | `visible`, `hidden`, `enabled` or `disabled` | — |
| `isVisible()`, `isChecked()`, `getText()`, … | a snapshot read (`getText` waits for visibility first) | returns data; never use as an assertion |

Taps go to coordinates, so **anything covering the element receives the tap**:
the soft keyboard, a closing sheet, a toast. Wait for the cover to go away
(below), not longer timeouts.

## Screen transitions

An action that changes screen returns after its tap. **The caller verifies the
destination** through the destination's POM, so no POM touches another
screen's locators:

```typescript
@step('Login as "{0}"') // password is never interpolated
async login(username: string, password: string): Promise<void> {
  // … fill + dismissKeyboard + tap submit …
}
// The caller (spec or the auth fixture) asserts the destination:
await homePage.verifyOnPhase3Screen();
```

If the *same* method acts again after the transition and could still hit the
old screen, first wait for this screen's own anchor to be hidden.

## Pickers, bottom sheets, dialogs

Wait for open before acting inside, and for closed before returning:

```typescript
async pick(date: PickerDate): Promise<void> {
  await this.waitUntilOpen();                      // title visible
  // … select year / month / day …
  await this.applyButton().tap();
  await this.title().waitFor({ state: 'hidden' }); // sheet gone before the page acts again
}
```

Real version: `DatePicker.pick`. The hidden wait is backed by evidence that the
title is absent once the sheet closes (`home-locators.yml` has no
`Select Date`); confirm the equivalent for any new sheet.

## Scrolling

| Need | Use |
|---|---|
| Bring an element into view | `locator.scrollIntoViewIfNeeded({ direction, maxSwipes })` |
| Scroll inside one widget (a year list in a sheet) | `itemLocator.swipe({ direction })` on any item of that list: the swipe **starts at the item's center**, so the gesture hits the right list |
| Swipe the whole screen | `screen.swipe(direction)`: only for full-screen scrolling |

`scrollIntoViewIfNeeded` swipes from the **screen center** and, if the
element isn't in the tree yet (Flutter builds list items lazily), swipes in the
default direction (`up`). For a list inside a sheet, use a scoped swipe loop
with a max-attempts bound and a clear error. Captures don't include unlabeled
list containers, so start the swipe from an item that only that list contains
(real version: `DatePicker.scrollYears` swipes from `anyYearButton()`, a
4-digit label that only the year list has).

After a manual swipe, a fling animation may still move the list. Re-query in a
loop (`isVisible()` then act), or, only in a component with no end signal, a
short settle delay with a disable reason (see `DatePicker.scrollYears`).

## Keyboard

**How it opens.** `fill()` taps the field, clears it (`ctrl+a`, `backspace`)
and sends the text through the device. The *tap* focuses the field, and focus
is what raises the soft keyboard. A screen can also focus a field by itself:
**Home auto-focuses the username field after login**, so the keyboard is open
with no typing by our code. An open keyboard covers the lower half of the
screen (nav bar, submit), and a tap there lands on the keyboard.

**How to close it.** Mobilewright has no API to detect or hide the keyboard.
`dismissKeyboard(screen)` in `helpers/keyboard.ts` sends `ENTER`
(`screen.pressButton('ENTER')`). Call it:

1. in the method that typed, after its last `fill()`;
2. right before tapping anything a keyboard may cover.

```typescript
// pages/HomePage.ts — after typing
@step('Input username "{0}"')
async inputUsername(username: string): Promise<void> {
  await this.getUsernameInput().fill(username);
  await dismissKeyboard(this.screen);
}

// components/BottomNavBar.ts — before a tap the keyboard may cover
// (today it also carries @step; per the SKILL.md layering rule that moves to the pages)
async navigateTo(tab: NavTab): Promise<void> {
  await dismissKeyboard(this.screen);
  await this.getTab(tab).tap();
}
```

**Never use Back (`screen.goBack()`) for the keyboard:** with no keyboard open
it navigates away. The old Back in `BottomNavBar` only worked because Home's
auto-focused field meant a keyboard was always open there; removing it made the
Profile-navigation test fail 3/3 (the tab tap landed on the keyboard).

**Verified** on a real Android device (AU3N025B20000393, this app):

| Situation | ENTER does |
|---|---|
| Keyboard open on a single-line field | closes it and clears the field's focus |
| Password field on Login | closes it; does **not** submit the form (`login.spec` passes, so the submit button was still there to tap) |
| No field focused | nothing (manual check) |
| Home after login (auto-focused field) | closes it; the nav-bar tap then works |

**Not verified — check before relying on it:**
- Android emulators: whether a soft keyboard appears at all depends on the AVD's
  hardware-keyboard setting. ENTER should still be harmless, but run the specs
  there once.
- iOS (simulator or device): not tested; the project is Android-only today.
- ENTER on Login's **username** field: `login()` only sends ENTER after the
  password, so it was never exercised. If a field's keyboard action is "next",
  ENTER moves focus to the next field and the keyboard stays open.
- Multi-line fields (ENTER inserts a new line instead of closing).
- Before relying on ENTER for a new field, try it on the device and add a row
  to the table above.

## App state and relaunch

The `device` fixture is **test-scoped**: before each test it terminates and
relaunches the app (unless `autoAppLaunch` is `false`). So each test starts
on the launch screen; preconditions (login) come from fixtures in
`fixtures/auth.fixture.ts`, not from earlier tests.

## Timeouts

Defaults come from `mobilewright.config.ts` (`actionTimeout`, `expect.timeout`).
No per-call `timeout` unless the operation is known to be slow; then add a
comment saying why. Never raise a timeout to hide flakiness; find the signal.
