# Mobilewright Automation

End-to-end UI automation for a **Flutter** Android app, written in TypeScript with
[Mobilewright](https://mobilewright.dev) (a mobile test framework built on Playwright's test
runner). The app under test is the `bundleId` in
[`mobilewright.config.ts`](./mobilewright.config.ts). One suite runs on two targets: an Android
real device and an Android emulator.

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

Pick the [target](#targets) you will run on and get one matching device ready:

| Target | Before running |
|---|---|
| `android-real` | Enable **USB debugging** on the phone (Settings → Developer options), connect it by USB, accept the "Allow USB debugging" prompt, and check it is listed as `device` in `adb devices` |
| `android-emulator` | Start an emulator from Android Studio's Device Manager (or `emulator -avd <avd-name>`); check it is listed in `adb devices` |

The app must be on the device, or given as an `.apk` to install first: see
[The app and APK files](#the-app-and-apk-files).

### 4. Check your setup

```bash
# Device, SDK and tool checks, with a fix command for each warning
npx mobilewright doctor

# Static checks: types, lint rules, conventions (no device needed)
npm run verify

# One small spec end-to-end on the default target (android-real)
npm test -- tests/login.spec.ts
```

Once all three pass, run the full suite (see [Running tests](#running-tests)). With one device
connected and the app installed, no configuration is needed; the next section explains when it is.

---

## Configuration

### Where each setting lives

| Setting | Lives in | Committed | Who changes it |
|---|---|---|---|
| App under test (`bundleId`) | [`mobilewright.config.ts`](./mobilewright.config.ts) | yes | Once per branch (each branch tests one app) |
| Targets (`projects`) | [`mobilewright.config.ts`](./mobilewright.config.ts) | yes | When the team adds a target |
| Timeouts, reporter | [`mobilewright.config.ts`](./mobilewright.config.ts) | yes | Rarely, with review |
| Which device to use (`DEVICE_ID`) | `.env` on your machine; job variables on CI | **no** | Each contributor, per machine |
| Which build to install (`ANDROID_APP`) | `.env` on your machine; job variables on CI | **no** | Each contributor, per machine |

`.env` is optional and never committed. Create it from the template when you need one of its
variables:

```bash
copy .env.example .env    # Windows
cp .env.example .env      # Mac / Linux
```

| Variable | Set it when | If unset |
|---|---|---|
| `DEVICE_ID` | Two or more devices **of the same type** are connected (e.g. two emulators), or you run `npm run extract`. Value: the serial from `adb devices`, e.g. `<device-serial>` or `emulator-5554` | Mobilewright uses the first connected device matching the target's `deviceType` |
| `ANDROID_APP` | You want a build installed before the run. Value: a **local** `.apk` path, e.g. `./build/app.apk` | The app already installed on the device is used |

> ⚠️ `DEVICE_ID` applies to **every** target. If it pins your phone and you run the emulator
> target, no device matches and the run waits for the allocation timeout. Comment it out when
> switching device type.

### Targets

Each target is one entry in `projects` in [`mobilewright.config.ts`](./mobilewright.config.ts).
It picks a device by `deviceType`; `DEVICE_ID` narrows it to one device.

| Target | Script | Runs on |
|---|---|---|
| `android-real` | `npm test` or `npm run test:android` | Android phone over USB |
| `android-emulator` | `npm run test:android-emulator` | A running Android emulator |

To add a target, add a project and a matching script in `package.json`:

```ts
// mobilewright.config.ts → projects
{ name: 'android-tablet', use: { platform: 'android', deviceType: 'real', deviceName: /Tab/ } },
```

iOS is not set up: it needs its own bundle ID, project and Page Object support.

### Running tests

```bash
npm test                          # android-real (phone over USB)
npm run test:android-emulator     # android-emulator (emulator must be running)

# Or the CLI directly; always pass --project
npx mobilewright test --project=android-emulator
```

Always pick a target: `npx mobilewright test` **without** `--project` runs every target, and a
target with no matching device waits for the allocation timeout before failing.

Run part of the suite by adding arguments after `--`:

```bash
npm test -- tests/login.spec.ts                 # one file
npm test -- tests/login.spec.ts:8               # one test, by file:line
npm test -- --grep "Login Tests"                # describe block or test title (regex)
npm test -- --grep @smoke                       # tag
npm test -- --list                              # list the tests, no device needed
```

More filters are in the [Commands Cheatsheet](commands.md).

### The app and APK files

The app is always **launched** by `bundleId`. `ANDROID_APP` only decides whether a build is
**installed** first:

| Situation | `ANDROID_APP` | What happens |
|---|---|---|
| App already installed on the phone or emulator | unset | Nothing is installed; the installed app is launched |
| Test a specific local build | `./build/app.apk` | The `.apk` is installed, then launched |
| CI | path of the `.apk` downloaded by an earlier step | Same as above |

`ANDROID_APP` must be the path of an existing local `.apk`. Mobilewright cannot install from a
URL, a folder or an `.aab`.

#### APK from a URL (CI)

When the build server publishes the APK over HTTP, download it before the tests and point
`ANDROID_APP` at the file. Any CI system works the same way:

```bash
# 1. Download the build (APK_URL comes from the CI job; keep it a secret if it carries a token)
mkdir -p build
curl -fsSL "$APK_URL" -o build/app.apk

# 2. Run the tests on the target the CI machine provides
ANDROID_APP=build/app.apk npx mobilewright test --project=android-emulator
```

- `build/` is git-ignored.
- The CI machine needs a running emulator (or a connected phone for `android-real`) before
  step 2; Mobilewright does not start one.
- Most CI systems set `CI`; the config then fails the run if a `test.only` was committed.
- A large APK may need `installTimeout` raised (default 60 s) in the config's `use`.

### App under test (bundle ID)

Each branch tests one app, set as `bundleId` in
[`mobilewright.config.ts`](./mobilewright.config.ts) and committed with the branch. Mobilewright
launches that app, and `npm run extract` refuses to capture any other. To read the bundle ID of
the app open on the phone:

```bash
adb shell dumpsys window | grep mCurrentFocus   # Windows PowerShell: findstr instead of grep
# mCurrentFocus=Window{… <bundle-id>/<bundle-id>.MainActivity}  → bundle ID <bundle-id>
```

Testing a new app means a new branch with its own `bundleId` (and its own Page Objects).

---

## How Login Works

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

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `[mobilewright] warning: could not verify "…" reached foreground — proceeding anyway` | Known mobilecli issue on some Android devices; harmless when the tests pass |
| The first step fails with `LocatorError: Locator: no matching element found` | Often the phone is locked or the screen went off. Unlock it, and consider "Stay awake" (Developer options) while charging. Check the attached view tree to see what was on screen |
| A test hangs for a long time, then fails with `device allocation timed out` | No connected device matches the target: no emulator running for `android-emulator`, or `DEVICE_ID` pins a device of the other type (e.g. your phone while running the emulator target). Start the right device or comment out `DEVICE_ID`. The wait is `allocationTimeout`, 15 minutes by default |
| `"…" is not a valid ZIP file` or `Android requires a .apk file` | `ANDROID_APP` must be the path of an existing local `.apk` (not a URL or a folder). Fix the path, or unset it if the app is already installed |
| `--grep` (or another flag) seems ignored with `npm test` | Put flags after `--`: `npm test -- --grep "login"`. Without it, npm keeps the flag for itself |
| `npm run extract` fails with `DEVICE_ID is not set` | Set `DEVICE_ID` in `.env` (the extractor needs it even with one device) |
| `npm run extract` fails with `foreground app is …, expected …` | Open the app on the target screen and unlock the device, then retry. If the right app is open, `bundleId` in `mobilewright.config.ts` doesn't match it (wrong branch?): see [App under test](#app-under-test-bundle-id) |
| `npm run verify` crashes with syntax or engine errors | Node is too old. Upgrade (see step 1) and rerun `npm ci` |

---

## npm Scripts

> 💡 The full command list (Inspector, report, mobilecli, adb) is in the
> [Commands Cheatsheet](commands.md).

| Script | What it does |
|---|---|
| `npm test` | Runs the suite on `android-real` |
| `npm run test:android` | Same as `npm test` |
| `npm run test:android-emulator` | Runs the suite on `android-emulator` |
| `npm run verify` | TypeScript checks, ESLint and architecture conventions ([what it checks](docs/static-analysis.md)) |
| `npm run extract -- <screen-slug>` | Captures the current device screen as locator evidence in `.ui-evidence/` (Android only; needs `DEVICE_ID`; see [AI-first automation](#-ai-first-automation)) |

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
│   ├── login.spec.ts                     # Login flow (opts out of the automatic login)
│   └── home.spec.ts                      # Phase 3 form and Profile tab navigation
├── pages/                                # One Page Object per screen
│   ├── LoginPage.ts                      # Login screen
│   ├── HomePage.ts                       # Phase 3 screen (username, country, terms, date, nav bar)
│   ├── ProfilePage.ts                    # Profile screen
│   └── components/                       # Reusable widgets, used by pages (@components/*)
│       ├── BottomNavBar.ts               # Bottom tab navigation
│       ├── Checkbox.ts                   # Wraps a checkbox locator passed in by its page
│       └── DatePicker.ts                 # Year / month / day picker
├── fixtures/
│   ├── index.ts                          # ← import { test, expect } from '@fixtures'; fixture inventory
│   ├── pages.fixture.ts                  # Page Object fixtures
│   └── auth.fixture.ts                   # Logged-in start state (opt out with loggedIn: false)
├── helpers/
│   └── keyboard.ts                       # dismissKeyboard(): closes the soft keyboard (sends ENTER)
├── models/
│   └── UserModel.ts                      # User type (username, password)
├── data/                                 # Test data typed with models/ (dummy accounts only)
│   ├── users.ts                          # Login accounts (StandardUser)
│   └── home.data.ts                      # Phase 3 form values
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
├── mobilewright.config.ts                # Test runner config: bundle ID, targets (projects), .env settings, timeouts, reporters
├── eslint.config.mjs                     # Lint rules (see docs/static-analysis.md)
└── tsconfig.json                         # TypeScript config and path aliases (@fixtures, @pages, …)
```

---

## Key Conventions

- Specs import `test` / `expect` from `@fixtures` and call Page Object methods only; no `screen.*`
  calls in specs.
- One Page Object per screen in `pages/`; reusable widgets in `pages/components/`. A locator lives only
  in its owner, as a private factory method.
- Locators come from evidence (a `.ui-evidence/` capture or existing code), never guessed.
- Meaningful action and verify methods carry `@step('…')` from `@utils/step`, so reports read as
  user actions. Full rule: the
  [`mobilewright-pom-builder` skill](.agents/skills/mobilewright-pom-builder/SKILL.md).
- Tests are independent: no shared state, no order dependence.
- `npm run verify` must pass before a change is done; it enforces most of the above
  ([details](docs/static-analysis.md)).
