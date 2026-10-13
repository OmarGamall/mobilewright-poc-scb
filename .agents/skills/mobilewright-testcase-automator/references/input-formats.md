# Normalizing manual test case formats

Every format ends in the same normalized shape (SKILL.md §1). The traps are
what differ.

## Pasted free text

Usually a title, a few numbered lines, and expected results mixed in or at the
end.

- Split a line that holds an action *and* an outcome ("Tap Login, the home
  screen appears") into a step plus its expected result.
- Expected results listed only at the end ("Expected: user is logged in and
  sees the Phase 3 form"): attach each one to the step that causes it, or to
  the last step if unclear, and say which you chose.
- Words like "should", "verify", "check", "make sure", "confirm" mark expected
  results, wherever they appear.
- Gesture words (tap, long-press, swipe, scroll, pull to refresh) are actions;
  map them to the POM method that performs the intent, not to a gesture.

## Excel / CSV export

Two common layouts. Find out which one you have before parsing:

| Layout | Signs | How to read it |
|---|---|---|
| One row per **step** | Repeating TC ID with a step number column; ID/title blank on continuation rows | Group rows by ID (carry the ID down into blank cells); each row is one step + expected result |
| One row per **case** | Unique ID per row; steps in one cell, numbered or line-broken | Split the steps cell on numbers or line breaks; split the expected cell the same way and pair them by index |

- Columns map by meaning, not exact name: `Summary/Title/Name`,
  `Pre-conditions/Prerequisites/Setup`, `Action/Step/Description`,
  `Expected/Expected Result/Outcome`, `Test Data/Data/Input`,
  `Priority/Severity`, `Platform/Device/OS`.
- **Several rows sharing the same steps but different data** are a DDT table
  already. Keep them together as one case with a data table (→
  `ddt-patterns.md`), not N separate tests.
- Cells may hold Excel artifacts: `#N/A`, trailing spaces, numbers turned into
  dates or scientific notation (phone `01012345678` → `1012345678`, lost
  leading zero). Flag suspicious values; don't silently fix them.

## Gherkin (Given / When / Then)

| Keyword | Usually maps to |
|---|---|
| `Background` | `beforeEach` or a fixture shared by the describe block |
| `Given` | preconditions → fixture / data setup |
| `When` | actions |
| `Then` | expected results → verify |
| `And` / `But` | same kind as the line above it |
| `Scenario Outline` + `Examples` | DDT: the Examples table is the scenario array, `<placeholders>` are its fields |
| `@tags` on the scenario | candidate test tags (keep only if the user wants them); `@android` / `@ios` tell you the targets |

- Don't introduce a Cucumber/BDD layer; the output is a normal spec.
- A `Then` that is really an action ("Then the user taps OK") is an action; a
  `Given` that does things through the UI ("Given I open the Profile tab")
  belongs in Arrange.

## Jira / Xray / Azure DevOps / TestRail

Pasted from the tool, these are usually a key + summary, then a step table
(Action | Data | Expected Result) or a numbered list.

- **ID:** the issue key / case ID (`PROJ-123`, `C4567`, ADO work item id).
  Keep it for traceability only if the user wants it (SKILL.md §6).
- **Xray / TestRail "Data" column:** values for *that step*. They feed
  `data/` constants or the DDT array, not hardcoded literals in the spec.
- **Shared steps / "call test" references** (ADO shared steps, Xray "call
  test"): the content isn't in the paste. Ask for it, or map it to an existing
  fixture or POM method if one obviously matches (logging in → the
  `loggedIn` default), and say so.
- **Parameters** (ADO `@param`, TestRail "Steps (data)" iterations) are DDT
  rows.
- **Device / OS fields** ("Android 14, Pixel 7"): they say which target the
  case runs on, not something the spec checks.
- Ignore tool metadata that doesn't affect behaviour (assignee, sprint,
  automation status), except priority, which can become a tag if asked.

## In every format

- Keep the user's wording for titles of steps; it's what makes the coverage
  table checkable.
- UI texts quoted in the case (button labels, messages) are evidence for
  **expected values**, not for locators. A locator still needs an
  `npm run extract` capture or existing code (AGENTS.md §4).
