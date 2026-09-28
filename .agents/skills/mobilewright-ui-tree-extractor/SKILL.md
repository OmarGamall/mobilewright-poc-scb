---
name: mobilewright-ui-tree-extractor
description: >-
  Runs the project's dumpUITree utility (utils/ui-tree-extractor.ts) to capture the live
  accessibility tree from a connected Android device, validates the output, and produces a
  candidate-locator list for the mobilewright-pom-builder skill to consume. Use this skill
  whenever the user asks to capture, dump, extract, or generate UI tree evidence for a mobile
  screen — or before building/updating a POM that needs fresh, real locator evidence.
---

# Mobilewright UI Tree Extractor — Capture, Validate, Extract

This skill governs the full loop: capture the UI tree → validate what it produced → turn it into
locator evidence the `mobilewright-pom-builder` skill can safely use.
Do not skip steps or assume success — each stage checks the actual output of the previous one.

**Every file created or deleted during this process still requires explicit confirmation per
`AGENTS.md`.** This skill does not create an exception for "temporary" files.

## Prerequisite

`utils/ui-tree-extractor.ts` must already exist. If it doesn't, stop and tell the user —
do not attempt to reimplement it inline.

A physical Android device must be connected via ADB. Verify with `adb devices` before proceeding.

## Step 1 — Capture Evidence

1. Ask the user (if not already given):
   - Which screen needs the UI tree dump?
   - What UI state is needed (e.g., "after tapping the date picker button")?
   - Is the device already connected and the app running?
   **Never guess navigation steps** — an incorrect state means the evidence describes the wrong screen.

2. State intent and get confirmation before running any command, per `AGENTS.md`.

3. To capture the tree, run the extractor utility from a test or directly from a script:

   **Option A — From a script (fastest):**
   ```bash
   npx ts-node -e "import { dumpUITree } from './utils/ui-tree-extractor'; dumpUITree('<screen-name>');"
   ```

   **Option B — From inside a Mobilewright test:**
   Create a temporary spec file at `tests/tools/dump-context.spec.ts`:
   ```typescript
   import { test } from '@mobilewright/test';
   import { dumpUITree } from '../../utils/ui-tree-extractor';

   test('dump UI tree', async () => {
     // Navigate to the target screen first, then:
     dumpUITree('<screen-name>');
   });
   ```
   Run with: `npx mobilewright test tests/tools/dump-context.spec.ts`

4. Confirm the output file now exists:
   - `.ui-evidence/<screen-name>-tree.json`

## Step 2 — Validate Evidence (mandatory, do not skip)

Read the output file and check, explicitly, before trusting it:

- [ ] File exists and is non-empty.
- [ ] File is valid JSON (parseable — the utility validates this on write, but confirm manually).
- [ ] JSON contains at least one node with a `role` or `label` field — an empty tree means
      the capture succeeded but the screen had no accessible elements exposed, or the device
      was on the wrong screen.
- [ ] No obvious PII is present — scan for email patterns, phone numbers, or full names in
      any `name` or `label` values. If found, stop and flag to the user before proceeding.

If any check fails, do not proceed to extract locators. Report the issue and ask how to proceed.

## Step 3 — Extract Candidate Locators

1. Read the `.ui-evidence/<screen-name>-tree.json` file.
2. For each interactive element (buttons, textfields, checkboxes, etc.), note:
   - Its `role` value
   - Its `label` or `name` value (this is what `getByLabel` or `getByRole({ name })` targets)
   - Whether it is nested inside a labelled container (requiring chained locators)
3. Produce a structured candidate list, one entry per element:
   - Plain description (e.g., "Username input field")
   - Proposed locator call (e.g., `screen.getByLabel('LOGIN_INPUT_USERNAME').getByRole('textfield')`)
   - Evidence source: the exact JSON node that supports it
   - Flag explicitly: `NO RELIABLE IDENTIFIER FOUND` for anything the tree doesn't support
4. **Handoff to POM Builder:** Once the candidate list is produced, immediately transition to
   the `mobilewright-pom-builder` skill to write the actual POM, feeding it the validated
   candidate list. Never pass raw JSON files to the POM builder — only the structured list.

## Step 4 — Clean Up

Once evidence is validated and candidates extracted, delete any temporary spec file created
in Step 1 — **with confirmation, per `AGENTS.md`.** Ask the user if they'd rather keep it
as a reusable dump fixture for this screen before deleting.

## Rules

- Never fabricate or assume the content of the JSON evidence — always actually read it.
- Never skip Step 2, even if Step 1 "looked" successful.
- Never pass unvalidated or flagged-as-suspect evidence into `mobilewright-pom-builder`.
- The device serial used by the extractor comes from `config/env.ts` (`ENV.deviceId`).
  Never hardcode a device ID in a spec or script — always source it from `ENV`.
