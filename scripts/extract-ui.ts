/**
 * CLI Utility — UI Tree Extractor
 * --------------------------------
 * Navigate to the target screen on your device first, then run:
 *
 *   npm run extract -- <screen-slug>
 *
 * Examples:
 *   npm run extract -- home
 *   npm run extract -- login
 *   npm run extract -- profile-edit
 *
 * Output (written to .ui-evidence/):
 *   <screen-slug>-locators.yml  ← Gold: flat locator summary (AI POM builder input)
 *   <screen-slug>-tree.json     ← Silver: full filtered tree (debug fallback)
 */

import { dumpUITree } from '../utils/ui-tree-extractor';

const screenSlug = process.argv[2];

if (!screenSlug) {
  console.error(
    '\n❌ Error: screen name is required.\n' +
    '\nUsage:\n' +
    '  npm run extract -- <screen-slug>\n' +
    '\nExamples:\n' +
    '  npm run extract -- home\n' +
    '  npm run extract -- login\n' +
    '  npm run extract -- profile-edit\n',
  );
  process.exit(1);
}

if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(screenSlug)) {
  console.error(
    `\n❌ Error: invalid screen slug "${screenSlug}".\n` +
    'Use lowercase letters, numbers, and hyphens only. Examples: home, profile-edit, phase3\n',
  );
  process.exit(1);
}

dumpUITree(screenSlug);
