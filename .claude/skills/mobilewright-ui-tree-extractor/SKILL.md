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

# mobilewright-ui-tree-extractor (pointer)

This file only exists so Claude Code can discover the skill (it reads skills from
`.claude/skills/`, other agents read `.agents/skills/`). The skill itself is
`.agents/skills/mobilewright-ui-tree-extractor/SKILL.md`: read that file in full and follow it.
Paths it mentions (`references/…`) are relative to `.agents/skills/mobilewright-ui-tree-extractor/`.
