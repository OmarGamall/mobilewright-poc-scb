# Mobilewright — Mobile Automation Framework

End-to-end test automation framework for a Flutter Android application, built with
[Mobilewright](https://mobilewright.dev) and TypeScript.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Test Runner | Mobilewright `^0.0.61` |
| Language | TypeScript (strict mode) |
| Platform | Android (physical device via ADB) |
| App | Flutter (`com.example.scb_automation_app`) |

---

## Project Structure

```
mobilewright/
├── tests/          → *.spec.ts files — no direct screen.* calls
├── pages/          → Page Object classes (one per app screen)
├── components/     → Reusable Flutter widget wrappers (DatePicker, Checkbox, …)
├── fixtures/       → Mobilewright custom fixtures (auth state, etc.)
├── data/           → Static test data (users, constants)
├── models/         → TypeScript interfaces and type definitions
├── helpers/        → Reusable cross-screen helper functions
├── utils/          → Framework-level utilities (ui-tree-extractor, etc.)
├── config/         → Environment config (reads from .env)
├── plans/          → Implementation plan files (required before any code change)
├── bug-reports/    → Generated bug reports
├── .agents/        → Agent skills and rules
│   └── skills/
│       ├── mobilewright-pom-builder/       → Build/modify Page Objects
│       ├── mobilewright-bug-reporter/      → Generate bug reports from failures
│       ├── mobilewright-script-reviewer/   → Review test code quality
│       └── mobilewright-ui-tree-extractor/ → Capture live screen accessibility tree
├── mobilewright.config.ts  → Test runner configuration
└── tsconfig.json           → TypeScript config with path aliases
```

---

## Setup

### Prerequisites
- Node.js ≥ 18
- ADB installed and on PATH
- Android device connected and visible in `adb devices`

### Install dependencies
```bash
npm install
```

### Configure environment
```bash
# Windows
copy .env.example .env

# Mac / Linux
cp .env.example .env
```

Edit `.env` and fill in your device serial and bundle ID:
```env
DEVICE_ID=your_android_device_serial_here
BUNDLE_ID=your_app_bundle_id_here
```

---

## Running Tests

```bash
# Run all tests
npx mobilewright test

# Run a specific file
npx mobilewright test tests/home.spec.ts

# Run by test title match
npx mobilewright test -g "login"

# View the HTML test report
npx mobilewright show-report
```

---

## Useful Commands

```bash
# Open the Mobilewright Inspector (live screen interaction)
npx mobilewright inspect

# Dump the live UI accessibility tree to .ui-evidence/
# (used before building new Page Objects — see mobilewright-ui-tree-extractor skill)
npx mobilecli dump ui --device <DEVICE_ID>

# List connected ADB devices
adb devices

# Check system readiness
npx mobilewright doctor
```

---

## Skills Index (Agent Automation)

| Skill | When to use |
|---|---|
| `mobilewright-pom-builder` | Create or modify a Page Object or Component |
| `mobilewright-bug-reporter` | Generate a bug report from a failed test |
| `mobilewright-script-reviewer` | Review/audit test code for quality issues |
| `mobilewright-ui-tree-extractor` | Capture live screen accessibility tree for locator evidence |

---

## Key Conventions

- **No `screen.*` calls in spec files** — all interactions go through Page Object methods.
- **Use `.tap()` not `.click()`** — this is a mobile framework.
- **Locators are private factory methods** — never class fields.
- **Locator priority:** `getByLabel > getByRole > getByText`
- **Before any code change** — write a plan in `plans/` and get approval first (see `AGENTS.md`).
