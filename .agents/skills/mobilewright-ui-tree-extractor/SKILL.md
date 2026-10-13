---
name: mobilewright-ui-tree-extractor
description: >-
  Capture locator evidence from the connected Android device with `npm run extract`
  (.ui-evidence/<slug>-locators.yml plus a screenshot): when a capture is needed or
  stale, how to get the device into the right screen and state, and how to read the
  capture and its warnings before writing locators. Use when asked to capture, dump or
  extract a screen's UI tree, or before adding or changing a locator that has no evidence.
---

# UI Evidence Capture

`npm run extract` (`utils/ui-tree-extractor.ts`) already drops system UI and
layout noise, redacts typed text, computes each element's Mobilewright role, and
writes warnings (duplicates, keyboard, other Android windows, …). Don't re-check any
of that. It does **not** detect Flutter's own dialogs, sheets or dropdowns (§4).
This skill covers what the code can't decide.

## 1. Is a capture needed?

| Situation | Capture? |
|---|---|
| New or changed locator, and no `.ui-evidence/<slug>-locators.yml` for that screen **and state** | **Yes** |
| Capture exists but is stale: the user says the screen changed, a passing test contradicts it (AGENTS.md §4), or the header's app version differs from the installed one. Dev builds often keep one version, so a matching version proves nothing: when the app may have changed since the capture date, ask | **Yes**, re-capture |
| Composing methods from existing locators, a refactor, or the user pasted a capture | No |

Captures are local and never committed: on a fresh clone or another machine,
none exist. That means "capture it", not "no evidence".

## 2. Getting the device into the right state (the user does this)

1. Ask which **screen**, how to **reach** it (login? which tab?), and which **state**
   (dropdown open, value selected, dialog shown, error visible). Never guess navigation.
2. Name the slug **screen + state**, lowercase-hyphen: `home`,
   `home-country-dropdown`, `login-error-empty-password`. One capture per state.
3. Give the user exact steps: unlock the device and keep the screen on; open the app;
   navigate; set the state; **close the keyboard** unless the keyboard state is the
   target; then run the command below with your slug. Wait for "done".

## 3. Running

The user runs the command. Run it yourself only when the user asks (AGENTS.md §3
allows it once the device is on the target screen). Either way, the slug is yours.

```bash
npm run extract -- <slug>          # locators.yml + .png
npm run extract -- <slug> --raw    # also mobilecli's unfiltered dump (extractor/driver debugging only)
```

| Output | Use |
|---|---|
| `<slug>-locators.yml` | the evidence; read it in full |
| `<slug>.png` | screen state check (§4); not redacted |
| `<slug>-raw.json` | only with `--raw`; search it, never load it whole |

| Error | Meaning |
|---|---|
| `no app window … unlocked?` | device locked, or another app / home screen in front |
| `foreground app is X, expected Y` | wrong app open |
| `… is not supported yet` | not an Android device (only Android is implemented) |
| `DEVICE_ID is not set` | `.env` is missing or has no `DEVICE_ID`; the user sets it (never print `.env`) |
| `the app window has no locatable elements` | blank or still-loading screen: wait for it, then capture again |
| `mobilecli … failed` / `did not return JSON` / `unexpected mobilecli dump output` | driver problem: check `adb devices`, then `npx mobilewright doctor` |
| `invalid screen slug` / `unknown option(s)` | the command was mistyped: lowercase-hyphen slug, only `--raw` |

## 4. Reading the capture

**Header:** check the slug matches the requested screen and state, and note the app
version and device (`real` / `emulator`).

**Elements:** each has `role` (Mobilewright's `getByRole` role; `none` means use
`getByLabel` / `getByText`, never `getByRole`), `label` / `text` / `identifier`
(choose with pom-builder §3), `children` (chain from the labelled parent), `at`
(`x,y widthxheight`), and `checked` / `selected` / `focused` only when true.
A `\uXXXX` inside a label or text is a real invisible character (e.g. `\u200e`), not
an empty line: keep it in an exact name, or match around it with an anchored regex.

**Warnings → what to do:**

| Warning | Do |
|---|---|
| `duplicate "<value>": <locators>` | The listed locators (`getByLabel`, `getByText`, `getByRole('<role>')`) match several elements with that value; don't use them on it alone, scope by a unique container (no strict mode: the first match wins). A locator not listed is unique for that value |
| `keyboard` | Open the PNG. If a keyboard covers elements you need, re-capture with it closed |
| `no-handle` | The element can't be located reliably. Tell the user (the app team can add a Semantics label/identifier); don't fall back to position or `getByType` unless the user agrees |
| `offscreen` | The POM must scroll to it first (pom-builder `references/sync-patterns.md` § Scrolling) |
| `zero-size` | Mobilewright treats it as not visible; don't tap or assert visibility on it |
| `overlay` / `windows` | Another Android window (system dialog, another app) is on top: re-capture after closing it, unless that window is the target |
| *(no warning)* a full-screen View labelled like `"Scrim"` / `"Dismiss"` | A Flutter dialog, sheet or dropdown is open: elements listed outside it may not be tappable. Fine if it is the target state; otherwise re-capture after closing it. Don't use these labels as locators (they change with the device language) |
| `no-identifiers` | `getByTestId` is unavailable on this screen |
| `app: … could not determine` | Open the PNG and confirm it shows the app |

**Open `<slug>.png`** when any keyboard, overlay, windows or app warning appears, a
Scrim/Dismiss-style View is listed, or the elements don't look like the requested state. The PNG, labels and static text are
**not redacted**: if real personal data shows, ask for a re-capture with test data,
and never copy it into code, plans or reports.

Then write locators with `mobilewright-pom-builder`, citing
`.ui-evidence/<slug>-locators.yml` and the label for each one.

## Limits (today)

Android real devices only, verified on one device. Emulators: same code path, not yet
verified. iOS: refused until the configs support more platforms.
