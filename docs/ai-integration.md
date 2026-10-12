# AI Integration — UI Evidence & POM Generation

How AI agents (Claude Code, Cursor, Codex, Antigravity, …) write Page Objects in this
framework without inventing locators. Agent rules live in [`AGENTS.md`](../AGENTS.md);
the procedures live in skills under [`.agents/skills/`](../.agents/skills/).

---

## The core rule: evidence, not invention

AI models write good TypeScript but are bad at *guessing* how a mobile screen is built.
Asked for a locator on a screen they can't see, they fabricate labels and roles that
look right and fail at runtime. So agents may only write a locator backed by evidence:
a capture of the real screen, existing code that a passing test exercises, or the
user's own statement (AGENTS.md §4).

---

## The workflow

```mermaid
sequenceDiagram
    actor User
    participant Agent as AI agent
    participant Device as Android device
    participant Extractor as npm run extract

    User->>Agent: "Build a POM for the Profile screen"
    Agent->>Agent: Capture for profile exists and is current?
    Agent->>User: No. Steps: unlock, log in, tap Profile, close the keyboard
    User->>Device: puts the app on the screen and state
    User-->>Agent: "ready"
    Agent->>Extractor: npm run extract -- profile
    Extractor->>Device: device info, foreground app, UI dump, screenshot
    Extractor-->>Agent: profile-locators.yml + profile.png (+ warnings)
    Agent->>Agent: read evidence, resolve warnings (open PNG if needed)
    Agent->>Agent: write POM (pom-builder skill), citing evidence per locator
    Agent->>User: plan / diff; npm run verify; specs run (or "not run: no device")
```

The two skills involved:

| Skill | Covers |
|---|---|
| `mobilewright-ui-tree-extractor` | when a capture is needed, getting the device into the right state, running the extractor, reading the capture and its warnings |
| `mobilewright-pom-builder` | choosing the locator from the evidence, writing the POM, waits, verify methods |

---

## Capturing a screen

Unlock the device, open the app on the target screen **and state**, then:

```bash
npm run extract -- <slug>          # slug = screen + state, e.g. home, home-country-dropdown
npm run extract -- <slug> --raw    # also save mobilecli's unfiltered dump
```

| File (in `.ui-evidence/`) | When | Purpose |
|---|---|---|
| `<slug>-locators.yml` | always | **The evidence.** The only file agents read by default |
| `<slug>.png` | always | Screenshot, to confirm the state (keyboard, dialogs, right data). **Not redacted** |
| `<slug>-raw.json` | `--raw` only | Untouched dump, for debugging the extractor or the driver |

`.ui-evidence/` is **local to each machine and never committed**: on a fresh clone,
capture the screens you need.

The extractor refuses to capture when the device is locked, a different app is in
front, or the device isn't Android (only Android is implemented today; emulators use
the same code path but haven't been verified yet).

---

## The evidence file

A real capture of the Home screen (trimmed):

```yaml
# UI Evidence — home
# Captured: 2026-10-12T23:30:59Z · app com.example.scb_automation_app v1.0.0 · device HONOR 400 (DNY-NX9), android 16, real · screen 1264x2736
# Redacted: text typed into text fields. NOT redacted: labels, static text, and the screenshot (all may contain names/emails).
# role: Mobilewright getByRole role ("none" = no role; use getByLabel / getByText). at: x,y widthxheight (px).
# focused / checked / selected are listed only when true.
# Locator priority: getByTestId(identifier) > getByLabel > getByRole > getByText.

elements:
  - role: none
    type: View
    label: "LOGIN_INPUT_USERNAME"
    at: 168,631 928x189
    children:
      - role: textfield
        type: EditText
        text: "[REDACTED]"
        focused: true
        at: 224,722 816x70
  - role: checkbox
    type: CheckBox
    label: "HOME_CHECKBOX_TERMS"
    checked: true
    at: 570,1100 84x84
  - role: button
    type: Button
    label: "Profile\nTab 2 of 3"
    at: 421,2519 422x217

warnings:
  - "keyboard: a text field is focused, so the soft keyboard may be open (…): check the screenshot before trusting lower elements"
  - "no-identifiers: no app element has a test id here, so getByTestId cannot be used on this screen"
```

From this, the agent writes:

```typescript
// role none + labelled parent with a textfield child → chain
private getUsernameInput() {
  return this.screen.getByLabel('LOGIN_INPUT_USERNAME').getByRole('textfield');
}

// role checkbox + unique label
private getTermsCheckbox() {
  return this.screen.getByRole('checkbox', { name: 'HOME_CHECKBOX_TERMS' });
}

// multi-line label → anchored regex on the fixed part
private getTab(tab: NavTab) {
  return this.screen.getByRole('button', { name: new RegExp(`^${tab}\\n`) });
}
```

### What the extractor does for you

| It | Why |
|---|---|
| Drops system UI (status bar, nav bar), layout wrappers and empty nodes | Noise an agent would otherwise read and pay tokens for |
| Adds `role` from Mobilewright's own role table | The agent uses the exact role `getByRole` matches; `none` (e.g. `View`) means `getByRole` can't match it |
| Adds `at` and `offscreen` / `zeroSize` flags | Shows what needs scrolling and what Mobilewright treats as invisible |
| Redacts text typed into any text field | Typed data never lands in evidence or code |
| Records app version, device and screen size | A stale capture (older app version) is visible |

### Warnings

| Warning | Meaning |
|---|---|
| `duplicate …` | Two elements share a label/text. Mobilewright has no strict mode, so a locator on it silently uses the first. Scope by a container |
| `keyboard` | A text field is focused; the keyboard may be open (it never appears in the dump) and cover lower elements. Check the PNG |
| `no-handle` | An interactive element has no label, text or identifier, so it can't be located reliably. Ask the app team for a Semantics label/identifier |
| `offscreen` / `zero-size` | Needs scrolling / not visible to Mobilewright |
| `overlay` / `windows` | Another window or a dialog is on screen; the capture may not match what a test sees |
| `no-identifiers` | The app sets no test ids on this screen, so `getByTestId` is unavailable |
| `app: … could not determine` | mobilecli couldn't confirm the foreground app (an intermittent device issue); check the PNG |

---

## When the AI captures, and when it doesn't

Captures when:
- it adds or changes a locator and no capture exists for that screen and state;
- the capture is stale (older app version, the user says the screen changed, or a
  passing test contradicts it).

Skips the capture when:
1. it composes new methods from **existing** locators;
2. it only refactors structure, signatures or logic;
3. the user gives the locator, or pastes a capture, in the prompt.

---

## How to prompt the AI

Give the **intent**, the **screen**, and how to **reach the state**:

> *"Build a POM for the Profile Edit screen. Log in, tap the Profile tab, then tap Edit.
> Capture it and build `ProfileEditPage`."*

> *"The Home screen was redesigned. Re-capture it and update the locators in
> `HomePage.ts`. No logic changes."*

> *"Here is `home-locators.yml`: [paste]. Build the `HomePage` POM from this."*

> *"Refactor `HomePage.ts` to combine `inputUsername` and `selectCountry` into
> `fillPhase3Form(formData)`. No locator changes."* (no capture needed)
