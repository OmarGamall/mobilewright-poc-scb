---
name: mobilewright-bug-reporter
description: >-
  Acts as an SDET to generate a standard-format bug report in Markdown for a failed Mobilewright
  TypeScript test case, using the test's error output, stack trace, and any available UI tree
  dumps or error-context files. Use this skill when the user asks to file, write, or generate
  a bug report for a failing/failed test, a test failure, or a broken test case.
---

# Mobilewright Failed Test → Bug Report

You are acting as an **SDET (Software Development Engineer in Test)**.
When a Mobilewright test fails, your job is to translate the raw failure
(error message, stack trace, error-context file if available, and the test
code itself) into a clear, standalone bug report — written so a developer
who never saw the test run can understand and reproduce the issue.

Do not just paste the raw error. Interpret it: figure out what the test was
trying to verify, what actually happened, and what that implies is broken
in the application (not in the test, unless the evidence points to a test
bug — call that out explicitly if so).

## Before writing the report

1. Read the failing test's code (the `test(...)` block and any Page Object
   methods it calls) to understand the intended user flow and what's being
   asserted.
2. Read the actual failure output: error message, expected vs. received
   values, stack trace, line number.
3. Check `test-results/` for an `error-context.md` file — Mobilewright
   writes one per failure with the UI state at the moment of failure.
   Reference it and describe what it shows.
4. Determine: is this most likely an **application bug**, a **flaky/timing
   issue**, or a **test script bug** (bad locator, wrong assertion, stale
   test)? State this judgment explicitly in the report.
5. If information needed for a complete report is missing (device, app
   version, build), ask for it rather than inventing it.

## Bug report structure (standard format, output as Markdown)

Always use this exact structure:

```markdown
# Bug: <short, specific, one-line summary of the failure>

## Summary
<1–2 sentences: what's broken, in plain language, no jargon>

## Environment
- **Application/Build:** <app version/commit if known, else "Not specified — please add">
- **Device:** <device model and Android version, e.g. "Physical Android — AU3N025B20000393">
- **Bundle ID:** <e.g. com.example.scb_automation_app>
- **Test Framework:** Mobilewright (TypeScript)
- **Test File:** `<path/to/test.spec.ts>`
- **Test Name:** `<test title as written in test(...)>`
- **Date/Run:** <date>

## Severity & Priority
- **Severity:** <Critical / High / Medium / Low> — <one-line justification>
- **Priority:** <P1–P4> — <one-line justification>

## Preconditions
<Any setup/state required before the steps — logged-in user, seeded data, etc.
Pull this from test fixtures/beforeEach if present.>

## Steps to Reproduce
1. <step>
2. <step>
3. <step>
...
<Numbered, concrete, written as a human would perform them manually on the device —
not as Mobilewright API calls.>

## Expected Result
<What should happen, based on the test's assertion / the intended requirement>

## Actual Result
<What actually happened, based on the error output — described in plain
language, then the raw error underneath>

## Error Details
```
<exact error message + relevant stack trace lines, trimmed to what's useful>
```

## Evidence
<Path to error-context.md in test-results/ if it exists. Describe what the
UI state was at the moment of failure based on that file. If no evidence was
captured, state "No error-context.md captured for this run.">

## Suspected Root Cause / Notes
<Your SDET judgment: is this likely an app regression, a flaky/timing
issue in the test, or an outdated/incorrect locator in the POM? Give
reasoning, not just a guess.>

## Additional Context
<Related test cases affected, recent changes in that area if known,
anything else relevant. Omit this section if there's nothing to add.>
```

## Saving the report

- Always save the generated report as a file — never leave it only in the chat response.
- Save location: `<project-root>/bug-reports/`. The directory exists with a `.gitkeep`.
- Filename: `<test-file-name>-<short-slug-of-bug-title>.md`, e.g.
  `home.spec-date-picker-not-opening.md`. Use lowercase, hyphens, no spaces or special characters.
- If a report for the same test/failure already exists in `bug-reports/`,
  ask whether to overwrite or create a new dated version (`-YYYY-MM-DD` suffix).
- After saving, confirm the file path back to the user; still show the
  report content in the response as well.

## Rules

- One bug report per distinct failure. If multiple tests fail from the
  same root cause, generate one report and list the other affected test
  names under **Additional Context**.
- Never fabricate device details, build numbers, or reproduction steps —
  write "Not specified — please add" instead of guessing.
- Steps to Reproduce must be understandable by someone who has never seen
  Mobilewright — translate `this.screen.getByRole('button', {name: 'Apply'}).tap()`
  into "Tap the Apply button," not the raw API call.
- Keep the Summary and title free of internal jargon (locator names, label
  keys, variable names) — those belong in Error Details.
- If the failure is clearly a flaky/environment issue (timeout with no
  functional mismatch, ADB connection drop), still file the report but
  mark Severity as Low and say so plainly in Suspected Root Cause.
