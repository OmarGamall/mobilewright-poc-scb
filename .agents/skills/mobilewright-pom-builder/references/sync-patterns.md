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

End the action that changes screen by waiting for the new screen's anchor, so
the caller never acts on the old screen mid-transition:

```typescript
@step('Login as "{0}"') // password is never interpolated
async login(username: string, password: string): Promise<void> {
  // … fill + tap submit …
}
// The caller (or the auth fixture) then asserts the destination:
await homePage.verifyOnPhase3Screen();
```

Either the action waits for the anchor itself, or every caller is required to
verify it; pick one per action and keep it consistent.

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
title is absent once the sheet closes (`dummy-screen-locators.yml` has no
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

After `fill()`, the keyboard stays open and can cover the lower half of the
screen. Before tapping anything that may sit under it (nav bar, bottom
buttons), the owning POM/component calls `dismissKeyboard(this.screen)` from
`helpers/keyboard.ts` (it sends Android Back). Don't call it when no keyboard is
open: Back would navigate away.

## App state and relaunch

The `device` fixture is **test-scoped**: before each test it terminates and
relaunches the app (unless `autoAppLaunch` is `false`). So each test starts
on the launch screen; preconditions (login) come from fixtures in
`fixtures/auth.fixture.ts`, not from earlier tests.

## Timeouts

Defaults come from `mobilewright.config.ts` (`actionTimeout`, `expect.timeout`).
No per-call `timeout` unless the operation is known to be slow; then add a
comment saying why. Never raise a timeout to hide flakiness; find the signal.
