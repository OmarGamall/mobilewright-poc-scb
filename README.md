# Mobilewright Automation

End-to-end UI automation for the **Flutter** app `com.example.scb_automation_app`, written in
TypeScript with [Mobilewright](https://mobilewright.dev) (a mobile test framework built on
Playwright's test runner). One suite runs on four targets: Android real device, Android emulator,
iOS simulator and iOS real device.

---

## Getting Started

### 1. Prerequisites

| Tool | Version | Needed for | Notes |
|---|---|---|---|
| [Node.js](https://nodejs.org/) | **20.19+, 22.13+ or 24+** | everything | Older versions break `npm run verify` (ESLint 10 requires it). Check with `node -v` |
| [Git](https://git-scm.com/) | any recent | everything | |
| JDK | any recent | Android | `npx mobilewright doctor` warns if `JAVA_HOME` is not set |
| Android SDK platform-tools (`adb`) | any recent | Android | On `PATH`, with `ANDROID_HOME` set. Comes with [Android Studio](https://developer.android.com/studio) |
| Android Emulator (SDK Manager → SDK Tools) | any recent | `android-emulator` only | Plus at least one virtual device (AVD) |
| macOS with Xcode | any recent | iOS only | iOS targets cannot run on Windows or Linux |
| [VS Code](https://code.visualstudio.com/) *(optional)* | any | editing | **ESLint** extension (`dbaeumer.vscode-eslint`) shows rule violations while you type |

`mobilecli`, the tool Mobilewright uses to talk to devices, is installed by `npm ci`; no global
install is needed.

### 2. Clone and install

```bash
git clone <repo-url>
cd mobilewright

# Installs every dependency at the exact versions in package-lock.json:
# Mobilewright, mobilecli, TypeScript, ESLint and its plugins.
npm ci
```

### 3. Prepare a device

Pick the target you will run on (see [Targets](#targets)) and get one matching device ready:

| Target | Before running |
|---|---|
| `android-real` | Enable **USB debugging** on the phone (Settings → Developer options), connect it by USB, accept the "Allow USB debugging" prompt, and check it is listed as `device` in `adb devices` |
| `android-emulator` | Start an emulator from Android Studio's Device Manager; check it is listed in `adb devices` |
| `ios-simulator` / `ios-real` | On a Mac only. These targets appear once `BUNDLE_IDS.ios` is set in [`config/targets.ts`](./config/targets.ts) |

The app must be on the device: install the build yourself (Android: `adb install <path-to.apk>`),
or set `ANDROID_APP` / `IOS_APP` in `.env` and every run installs it first (step 4).

### 4. Configure your machine (`.env`, optional)

`.env` holds settings for **this machine only** and is never committed. Every variable is
optional: with one device connected and the app already installed, you can skip this step.

```bash
# Windows
copy .env.example .env

# Mac / Linux
cp .env.example .env
```

| Variable | Purpose | If unset |
|---|---|---|
| `DEVICE_ID` | Pin one device when several are connected (serial from `adb devices`, or simulator UDID). **Required by `npm run extract`** | Mobilewright uses the first device matching the target |
| `ANDROID_APP` | Path to an `.apk` installed before the run on Android targets | The app must already be installed |
| `IOS_APP` | Path to an `.ipa` installed before the run on iOS targets | The app must already be installed |

Targets and bundle IDs are the same for the whole team, so they live in
[`config/targets.ts`](./config/targets.ts), not in `.env`.

### 5. Check your setup

```bash
# Device, SDK and tool checks, with a fix command for each warning
npx mobilewright doctor

# Static checks: types, lint rules, conventions (no device needed)
npm run verify

# One small spec end-to-end on the default target (android-real)
npm test -- tests/login.spec.ts
```

Once all three pass, run the full suite with `npm test`, or another target with
`npm run test:<target>` (see [npm scripts](#npm-scripts)).

### How login works

Every test starts **logged in** as `StandardUser` (from [`data/users.ts`](./data/users.ts)): the
auto fixture `authenticate` in [`fixtures/auth.fixture.ts`](./fixtures/auth.fixture.ts) logs in
and checks the Phase 3 screen before the test body runs. Tests that need the login screen opt out:

```ts
test.use({ loggedIn: false });
```

In a nutshell:

- **Per test, through the UI.** This is not Playwright's `storageState`: the app is relaunched
  for every test and has no login backdoor, so there is no session to save and reuse.
- **Isolated but not free.** Every test starts clean, and each one pays for a full login inside
  its own timeout.
- **Assumes a cold start lands on Login.** The relaunch keeps app data; if the app ever
  remembers the session, the fixture's login will fail.
- **Clear failures.** A broken login fails in the `authenticate` fixture, before the test body.

`data/` holds dummy test accounts only, because Mobilewright's report prints the text typed into
fields, passwords included.

### Troubleshooting

| Symptom | Fix |
|---|---|
| `[mobilewright] warning: could not verify "…" reached foreground — proceeding anyway` | Known mobilecli issue on some Android devices; harmless when the tests pass |
| The first step fails with `LocatorError: Locator: no matching element found` | Often the phone is locked or the screen went off. Unlock it, and consider "Stay awake" (Developer options) while charging. Check the attached view tree to see what was on screen |
| A test hangs for a long time, then fails with `device allocation timed out` | No connected device matches the target (e.g. `test:android-emulator` with no emulator running, or `DEVICE_ID` pointing at another device). Start the right device or fix `DEVICE_ID`. The wait is `allocationTimeout`, 15 minutes by default |
| `Project(s) "ios-simulator" not found` | The iOS targets are not defined until `BUNDLE_IDS.ios` is set in `config/targets.ts` |
| `[config/env] ANDROID_APP="…" does not exist` | Fix the path in `.env`, or remove the line if the app is already installed |
| `"…" is not a valid ZIP file` | `ANDROID_APP` / `IOS_APP` must point at an `.apk` / `.ipa`, not a folder such as `Runner.app` |
| `--grep` (or another flag) seems ignored with `npm test` | Put flags after `--`: `npm test -- --grep "login"`. Without it, npm keeps the flag for itself |
| `npm run extract` fails with `DEVICE_ID is not set` | Set `DEVICE_ID` in `.env` (the extractor needs it even with one device) |
| `npm run extract` fails with `foreground app is …, expected …` | Open the app on the target screen and unlock the device, then retry |
| `npm run verify` crashes with syntax or engine errors | Node is too old. Upgrade (see step 1) and rerun `npm ci` |

---

## Targets

Defined in [`config/targets.ts`](./config/targets.ts); each target is one Mobilewright project.

| Target | Script | Runs on |
|---|---|---|
| `android-real` | `npm test` or `npm run test:android` | Android phone over USB |
| `android-emulator` | `npm run test:android-emulator` | Android emulator |
| `ios-simulator` | `npm run test:ios-sim` | iOS simulator (macOS only) |
| `ios-real` | `npm run test:ios` | iPhone (macOS only) |

Always pick a target: `npx mobilewright test` **without** `--project` runs every defined target,
and targets with no matching device wait for the allocation timeout before failing.

To add a target, add an entry to `TARGETS` in `config/targets.ts` and a matching script in
`package.json`.

---

## npm Scripts

> 💡 The full command list (Inspector, report, mobilecli, adb) is in the
> [Commands Cheatsheet](commands.md).

**Test scripts**

| Script | What it does |
|---|---|
| `npm test` | Runs the suite on `android-real` |
| `npm run test:android` | Same as `npm test` |
| `npm run test:android-emulator` | Runs the suite on an Android emulator |
| `npm run test:ios-sim` | Runs the suite on an iOS simulator |
| `npm run test:ios` | Runs the suite on a real iPhone |

**Tool scripts**

| Script | What it does |
|---|---|
| `npm run verify` | TypeScript checks, ESLint and architecture conventions ([what it checks](docs/static-analysis.md)) |
| `npm run extract -- <screen-slug>` | Captures the current device screen as locator evidence in `.ui-evidence/` (Android only for now; see [AI-first automation](#-ai-first-automation)) |

### Running part of the suite

Arguments after `--` are passed on to Mobilewright:

```bash
npm test -- tests/home.spec.ts                  # one file
npm test -- tests/home.spec.ts:18               # one test, by file:line
npm test -- --grep "Home Tests"                 # describe block or test title (regex)
npm test -- --grep @smoke                       # tag
npm test -- --list                              # list the tests, no device needed
```

More filters are in the [Commands Cheatsheet](commands.md).

---

## Viewing Test Results

Each run prints progress to the console and writes an HTML report:

```bash
npx mobilewright show-report
```

- Each test shows its Page Object methods as named steps (from the `@step` decorator).
- A failed test has the screen's accessibility tree attached (`viewTree: 'on-failure'`), which
  shows what was on screen when it failed.
- Raw run artifacts go to `test-results/`. To turn a failure into a bug report, ask the AI agent
  (skill `mobilewright-bug-reporter`).

---

## 🤖 AI-First Automation

The framework is built for AI agents (Claude Code, Cursor, Codex, Antigravity) to write Page
Objects from real screen evidence instead of guessing. You put the device on a screen, run
`npm run extract -- <screen-slug>`, and the agent writes locators from the capture.

👉 **Full guide:** [AI Integration — UI Evidence & POM Generation](docs/ai-integration.md)

| Skill | When the agent uses it |
|---|---|
| `mobilewright-pom-builder` | Create or change a Page Object or Component |
| `mobilewright-spec-writer` | Write or change a spec, its test data or tags |
| `mobilewright-testcase-automator` | Turn a manual test case (text, Excel/CSV, Gherkin, Jira/Xray/TestRail) into a spec |
| `mobilewright-ui-tree-extractor` | Capture a screen as locator evidence |
| `mobilewright-script-reviewer` | Review a spec, Page Object or Component |
| `mobilewright-bug-reporter` | Write a bug report for a failed test |

Agent rules live in [`AGENTS.md`](AGENTS.md); skills in `.agents/skills/` (with pointers in
`.claude/skills/` for Claude Code).

---

## Folder Structure

```
mobilewright/
│
├── .agents/skills/                       # AI agent skills (the source; one folder per skill)
│   ├── mobilewright-pom-builder/         # Create or change a Page Object or Component
│   │   ├── SKILL.md
│   │   └── references/
│   │       ├── locator-patterns.md       # Locator factories and label-matching patterns
│   │       └── sync-patterns.md          # Waits: scrolling, pickers/sheets, keyboard, app relaunch
│   ├── mobilewright-spec-writer/         # Rules for writing or changing a spec
│   ├── mobilewright-testcase-automator/  # Manual test case → automated spec
│   │   ├── SKILL.md
│   │   └── references/
│   │       ├── ddt-patterns.md           # Data-driven tests (scenario arrays in data/)
│   │       └── input-formats.md          # Reading text, Excel/CSV, Gherkin, Jira/Xray/TestRail cases
│   ├── mobilewright-ui-tree-extractor/   # Capture a screen as locator evidence (npm run extract)
│   ├── mobilewright-script-reviewer/     # Review a spec, Page Object or Component
│   └── mobilewright-bug-reporter/        # Bug report for a failed test
├── .claude/skills/<name>/SKILL.md        # Pointers to .agents/skills (same frontmatter) for Claude Code
│
├── .ui-evidence/                         # Captures: <slug>-locators.yml + <slug>.png (local, git-ignored)
├── bug-reports/                          # Bug reports written by the AI (local, git-ignored)
├── test-results/                         # Raw run artifacts of the last run (git-ignored)
├── mobilewright-report/                  # HTML report; open with `npx mobilewright show-report` (git-ignored)
│
├── tests/                                # *.spec.ts only; specs call Page Object methods, never screen.*
│   └── login.spec.ts                     # retail-staging login (opts out of the automatic login)
├── pages/                                # One Page Object per screen
│   ├── LoginPage.ts                      # retail-staging Login screen
│   ├── HomePage.ts                       # Left over from the POC, to be replaced
│   └── ProfilePage.ts                    # Left over from the POC, to be replaced
├── components/                           # Reusable widgets, used by pages (POC widgets for now)
│   ├── BottomNavBar.ts                   # Bottom tab navigation
│   ├── Checkbox.ts                       # Wraps a checkbox locator passed in by its page
│   └── DatePicker.ts                     # Year / month / day picker
├── fixtures/
│   ├── index.ts                          # ← import { test, expect } from '@fixtures'; fixture inventory
│   ├── pages.fixture.ts                  # Page Object fixtures
│   └── auth.fixture.ts                   # Logged-in start state (opt out with loggedIn: false)
├── helpers/
│   └── keyboard.ts                       # dismissKeyboard(): closes the soft keyboard (sends ENTER)
├── models/
│   └── UserModel.ts                      # User type (username, password)
├── data/                                 # Test data typed with models/ (dummy accounts only)
│   └── users.ts                          # Login accounts (StandardUser)
├── config/
│   ├── targets.ts                        # Targets and the app bundle ID (com.SCP.Not on this branch)
│   └── env.ts                            # Machine settings read from .env (DEVICE_ID, ANDROID_APP, IOS_APP)
├── utils/
│   ├── step.ts                           # @step decorator: POM methods show as named report steps
│   └── ui-tree-extractor.ts              # Dumps the screen via mobilecli, filters and redacts, writes evidence
├── scripts/
│   ├── extract-ui.ts                     # CLI behind `npm run extract -- <slug> [--raw]`
│   └── check-conventions.mjs             # Repo convention checks, run by `npm run verify`
├── docs/
│   ├── ai-integration.md                 # UI evidence → POM generation guide
│   └── static-analysis.md                # What `npm run verify` checks and how to fix each failure
│
├── AGENTS.md                             # Rules for AI agents (the only agent instruction file)
├── commands.md                           # Commands cheatsheet
├── .env.example                          # Template for .env (copy it; never commit .env)
├── .gitignore
├── package.json                          # npm scripts (verify, test:*, extract) and dependencies
├── mobilewright.config.ts                # Test runner config: one project per target, timeouts, reporters
├── eslint.config.mjs                     # Lint rules (see docs/static-analysis.md)
└── tsconfig.json                         # TypeScript config and path aliases (@fixtures, @pages, …)
```

---

## Key Conventions

- Specs import `test` / `expect` from `@fixtures` and call Page Object methods only; no `screen.*`
  calls in specs.
- One Page Object per screen in `pages/`; reusable widgets in `components/`. A locator lives only
  in its owner, as a private factory method.
- Locators come from evidence (a `.ui-evidence/` capture or existing code), never guessed.
- Meaningful action and verify methods carry `@step('…')` from `utils/step.ts`, so reports read as
  user actions. Full rule: the
  [`mobilewright-pom-builder` skill](.agents/skills/mobilewright-pom-builder/SKILL.md).
- Tests are independent: no shared state, no order dependence.
- `npm run verify` must pass before a change is done; it enforces most of the above
  ([details](docs/static-analysis.md)).
