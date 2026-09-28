---
name: mobilewright-ui-tree-extractor
description: >-
  Runs the project's dumpUITree utility (utils/ui-tree-extractor.ts) to capture the live
  accessibility tree from a connected Android device. This skill governs a full AI-orchestrated
  extraction pipeline: interviewing the user for preconditions, writing a targeted dump spec,
  running the capture, validating the outputs (Silver JSON + Gold YAML), and extracting a
  structured candidate-locator list for the mobilewright-pom-builder skill. Use this skill
  whenever the user asks to capture, dump, extract, or generate UI tree evidence for a mobile
  screen — or before building/updating a POM that needs fresh, real locator evidence.
---

# Mobilewright UI Tree Extractor — AI Orchestrated Pipeline

This skill governs the full loop: `Interview` → `Write Dump Spec` → `Run` → `Validate Both Files` → `Extract Locators` → `Hand Off` → `Cleanup`.
Do not skip steps or assume success — each stage checks the actual output of the previous one.

**Every file created or deleted during this process still requires explicit confirmation per
`AGENTS.md`.** This skill does not create an exception for "temporary" files.

## Prerequisite

`utils/ui-tree-extractor.ts` must already exist. If it doesn't, stop and tell the user —
do not attempt to reimplement it inline.

A physical Android device must be connected via ADB. Verify with `adb devices` before proceeding, or ask the user to confirm the app is running on their device.

---

## Phase 1 — Interview

Ask the user:
1. Which screen needs the UI tree dump?
2. What pre-conditions are needed to reach this screen? (e.g., none, needs login, needs navigation to a specific tab)
3. What specific UI data state is needed? (e.g., "with Egypt selected in the dropdown", "after filling out the first name field")

**Never guess navigation steps** — an incorrect state means the evidence describes the wrong screen.

---

## Phase 2 — Write Dump Spec

Based on the interview answers, determine which pre-condition tier applies:

| Tier | Condition | Pre-condition |
|---|---|---|
| 0 | No auth needed | Device already on target screen |
| 1 | Needs authentication | User logs in before running extraction |
| 2 | Needs auth + navigation | User logs in and navigates to the target screen |
| 3 | Needs specific data state | User sets up specific form/data state before extraction |

Instruct the user on the exact steps to get their device to the required screen state,
then run the extraction with the CLI utility:

```bash
npm run extract -- <screen-slug>
```

Examples:
```bash
npm run extract -- home
npm run extract -- login
npm run extract -- profile-edit
npm run extract -- home-with-egypt-selected
```

Confirm the output files now exist:
- `.ui-evidence/<screen-slug>-tree.json` (Silver)
- `.ui-evidence/<screen-slug>-locators.yml` (Gold)


---

## Phase 3 — Verify Output Files Exist

Confirm both files exist and are non-empty before proceeding:
- `.ui-evidence/<screen-slug>-tree.json` (Silver)
- `.ui-evidence/<screen-slug>-locators.yml` (Gold)

If either file is missing, report the error and ask how to proceed.

---

## Phase 4 — Validate Both Files (mandatory, do not skip)

Read BOTH output files and check explicitly before trusting them:

- **Gold YAML (`-locators.yml`)**:
  - [ ] Labels/text are present.
  - [ ] No `com.android.systemui` nodes exist.
  - [ ] Any user-entered text on `EditText` nodes appears as `[REDACTED]`.
- **Silver JSON (`-tree.json`)**:
  - [ ] Parseable valid JSON.
  - [ ] Contains children under the app root.

If any check fails (e.g., an empty tree), do not proceed. Report the issue and ask how to proceed.

---

## Phase 5 — Extract Candidate Locators

1. Read the **Gold YAML** file (`.ui-evidence/<screen-slug>-locators.yml`). Do NOT use the JSON for this phase unless debugging complex nesting.
2. Produce a structured candidate list, one entry per element, mapping directly to typed Mobilewright locator calls (`getByLabel > getByRole > getByText`).

Format the list EXACTLY like this:
```text
--- Candidate Locators for: <screen-slug> ---
Evidence Source: .ui-evidence/<screen-slug>-locators.yml

1. View "Phase 3"
   → Semantic role: navigation landmark / screen title
   → Locator: this.screen.getByLabel('Phase 3')
   → Use for: verifyOnPhase3Screen() verify method

2. View "LOGIN_INPUT_USERNAME" [contains EditText]
   → Semantic role: labelled container wrapping a textfield
   → Locator: this.screen.getByLabel('LOGIN_INPUT_USERNAME').getByRole('textfield')
   → Use for: inputUsername() action

3. Button "Egypt"
   → Semantic role: dropdown/selection button
   → Locator: this.screen.getByRole('button', { name: 'Egypt' })
   → Use for: dynamic country option locator (parameter-driven)

4. CheckBox "HOME_CHECKBOX_TERMS" [checked: true]
   → Semantic role: checkbox widget
   → Locator: this.screen.getByRole('checkbox', { name: 'HOME_CHECKBOX_TERMS' })
   → Use for: wrap in Checkbox component → setTermsCheckboxState()

ELEMENTS WITH NO RELIABLE IDENTIFIER: none found.
```

---

## Phase 6 — Hand Off

Once the structured candidate list is produced, immediately suggest transitioning to the `mobilewright-pom-builder` skill to write the actual POM, feeding it the validated candidate list. 
**Never pass raw JSON or YAML files to the POM builder — pass the structured list only.**

---

## Phase 7 — Done

Confirm with the user that the POM has been handed off to `mobilewright-pom-builder`
and ask if anything else is needed for this screen.

---

## Rules

- Never fabricate or assume the content of the YAML/JSON evidence — always actually read it.
- Never skip Phase 4 (Validation), even if the test run "looked" successful.
- Never pass unvalidated or flagged-as-suspect evidence to `mobilewright-pom-builder`.
- Always use fixtures or POMs to drive state in the extraction spec; do not use raw `screen.*` calls in the test file if a POM method exists for it.
- The device serial used by the extractor comes from `config/env.ts` (`ENV.deviceId`). Never hardcode a device ID in a spec or script.
