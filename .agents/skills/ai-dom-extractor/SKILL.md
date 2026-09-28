---
name: ai-dom-extractor
description: >-
  Runs the project's dumpAIContext utility (utils/ai-dom-extractor.ts) to
  capture an ARIA snapshot and a stripped DOM skeleton for a live page or
  component, validates the output, and produces a candidate-locator list
  for the playwright-pom-builder skill to consume. Use this skill whenever
  the user asks to capture, dump, extract, or generate DOM/accessibility
  evidence for a page — or before building/updating a POM that needs
  fresh, real locator evidence rather than inferred ones.
---

# AI Context Extractor — Capture, Validate, Extract

This skill governs the full loop: run the extractor → validate what it
produced → turn it into locator evidence another skill (`playwright-pom-builder`)
can safely use. Do not skip steps or assume success — each stage checks the
actual output of the previous one.

**Every file created or deleted during this process still requires explicit
confirmation per `AGENTS.md`.** This skill does not create an exception for
"temporary" files.

## Prerequisite

`utils/ai-dom-extractor.ts` must already exist. If it doesn't, stop and tell
the user it needs to be created first (via the normal plan-first process) —
do not attempt to reimplement it inline.

## Step 1 — Capture Evidence

1. Ask the user (if not already given): 
   - Which page/URL?
   - What UI state is needed (e.g. "after clicking Add Record")?
   - Which Playwright fixture to use for the context (e.g., standard `page` or a custom fixture like `receptionPageWithBranchAndFloor`)?
   **Never guess navigation steps** — an incorrect state means the evidence describes the wrong screen.
2. State intent and get confirmation before creating anything, per
   `AGENTS.md`.
3. Create a temporary spec file at `tests/tools/dump-context.spec.ts` that:
   - Imports the project's existing fixtures (reuse real auth state — do
     not spin up an unauthenticated context).
   - Navigates to the target page and performs whatever steps reach the
     required state.
   - Calls `await dumpAIContext(page, '<component-name>')`.
4. Run it: `npx playwright test tests/tools/dump-context.spec.ts`.
5. Confirm both output files now exist:
   - `.ai-evidence/<component-name>-a11y.yml`
   - `.ai-evidence/<component-name>-dom.html`

## Step 2 — Validate Evidence (mandatory, do not skip)

Read both files and check, explicitly, before trusting them:

- [ ] Both files exist and are non-empty.
- [ ] `-a11y.yml` contains at least one recognizable role/name entry — an
      empty or malformed snapshot means the capture failed silently.
- [ ] `-dom.html` contains **none** of: `<script`, `<style`, `<svg`,
      `<noscript` — if any appear, the stripper has a bug; stop and report
      it rather than proceeding with dirty evidence.
- [ ] `-dom.html` has no unredacted form values — scan for `value="` on any
      `<input`/`<textarea` where the value is anything other than `[REDACTED]`.
      Any hit means the extractor's redaction step failed — **stop immediately**,
      do not read further into that file, and report it.
- [ ] Quick scan of `-dom.html`'s remaining text content for obvious PII
      patterns (email addresses, phone-number-like digit sequences, full
      names in a patient-record context). If anything looks like real
      user/patient data, **stop and flag it to the user** — do not proceed
      to build a POM from a file that may contain real records, and do not
      assume it's test data just because the tool ran.

If any check fails and it's fixable in the extractor itself (missing tag in
the strip list, redaction gap), propose that fix as its own plan — don't
patch around it ad hoc while extracting locators.

## Step 3 — Extract Candidate Locators

1. Treat `-a11y.yml` as the primary source. For each interactive element,
   note its role, accessible name, and the exact `getByRole(...)` call it
   implies.
2. Only consult `-dom.html` for elements the ARIA snapshot didn't cover, or
   to find a `data-testid`/stable class/id for elements with no reliable
   accessible name (per `playwright-pom-builder`'s priority order and
   "never invent" rule).
3. Produce a structured list, one entry per element:
   - Plain description (e.g. "Save button in header")
   - Proposed locator call
   - Evidence source: `aria` or `stripped-dom`
   - Flag explicitly: `NO RELIABLE IDENTIFIER FOUND` for anything neither
     file supports — do not fill this gap with a guess.
4. **Handoff to POM Builder:** Once the candidate list is produced, do not stop. Immediately transition to the `playwright-pom-builder` skill to write the actual POM file, feeding it the validated candidate list you just created. (The POM Builder skill should never receive the raw HTML/YAML files, only the structured list).

## Step 4 — Clean Up

Once evidence is validated and candidates extracted, delete the temporary
spec file (`tests/tools/dump-context.spec.ts`) — with confirmation, per
`AGENTS.md`. Ask the user if they'd rather keep it as a reusable fixture
for this specific page before deleting, since the same capture may be
needed again later.

## Rules

- Never fabricate or assume the content of the evidence files — always
  actually read them before extracting anything from them.
- Never skip Step 2 to save time, even if Step 1 "looked" successful.
- Never pass unvalidated or flagged-as-suspect evidence into
  `playwright-pom-builder`.
