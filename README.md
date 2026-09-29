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
├── .agents/        → Agent skills and rules
│   └── skills/
│       ├── mobilewright-bug-reporter/      → Generate bug reports from failures
│       ├── mobilewright-pom-builder/       → Build/modify Page Objects
│       ├── mobilewright-script-reviewer/   → Review test code quality
│       └── mobilewright-ui-tree-extractor/ → Capture live screen accessibility tree
├── .ui-evidence/   → Generated accessibility tree evidence (gitignored)
│   ├── <screen>-locators.yml  ← Gold: flat locator summary (AI input)
│   └── <screen>-tree.json     ← Silver: full filtered tree (debug fallback)
├── bug-reports/    → Generated bug reports
├── components/     → Reusable Flutter widget wrappers (DatePicker, Checkbox, …)
├── config/         → Environment config (reads from .env)
├── data/           → Static test data (users, constants)
├── docs/           → Project documentation and findings
├── fixtures/       → Mobilewright custom fixtures (auth state, etc.)
├── helpers/        → Reusable cross-screen helper functions
├── models/         → TypeScript interfaces and type definitions
├── pages/          → Page Object classes (one per app screen)
├── plans/          → Implementation plan files (required before any code change)
├── scripts/        → CLI scripts (extract-ui, etc.)
├── tests/          → *.spec.ts files — no direct screen.* calls
├── utils/          → Framework-level utilities (ui-tree-extractor, etc.)
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
# Run the UI Tree Extractor — navigate to the screen on your device first
npm run extract -- <screen-slug>
npm run extract -- home
npm run extract -- login
npm run extract -- profile-edit

# Open the Mobilewright Inspector (live screen interaction)
npx mobilewright inspect

# List connected ADB devices
adb devices

# Check system readiness
npx mobilewright doctor

# Dump raw accessibility tree (unfiltered — rarely needed directly)
npx mobilecli dump ui --device <DEVICE_ID>
```

---

## 🤖 AI-First Automation

This framework supports autonomous, AI-driven Page Object Model (POM) generation using
AI Agent skills. Instead of writing POMs by hand, ask the agent to build them — it captures
live device evidence, validates it, and writes fully standards-compliant TypeScript.

👉 **Full guide:** [AI Integration — UI Tree Extraction & POM Generation](docs/ai-integration.md)

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
- **Locators are private factory methods** — never class fields.
- **Locator priority:** `getByLabel > getByRole > getByText`
- **Semantic reporting:** Annotate meaningful async action and verify methods with `@step('...')` from `utils/step.ts`. Not locator factories, forwarders or loop helpers. Full rule: `AGENTS.md`, section 4.
- **Before any code change** — write a plan in `plans/` and get approval first (see `AGENTS.md`).
