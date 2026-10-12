/**
 * CLI Utility — UI Tree Extractor
 * --------------------------------
 * Put the app on the target screen and state on your device first, then run:
 *
 *   npm run extract -- <screen-slug> [--raw]
 *
 * Examples:
 *   npm run extract -- home
 *   npm run extract -- home-country-dropdown
 *   npm run extract -- login --raw
 *
 * Output (written to .ui-evidence/, local only, never committed):
 *   <screen-slug>-locators.yml  ← evidence for writing locators (the file agents read)
 *   <screen-slug>.png           ← screenshot, to confirm the screen state
 *   <screen-slug>-raw.json      ← mobilecli's unfiltered dump (only with --raw)
 */

import { dumpUITree } from '../utils/ui-tree-extractor';

const args = process.argv.slice(2);
const raw = args.includes('--raw');
const unknownFlags = args.filter((a) => a.startsWith('--') && a !== '--raw');
const [screenSlug] = args.filter((a) => !a.startsWith('--'));

const usage =
  '\nUsage:\n' +
  '  npm run extract -- <screen-slug> [--raw]\n' +
  '\nExamples:\n' +
  '  npm run extract -- home\n' +
  '  npm run extract -- home-country-dropdown\n' +
  '  npm run extract -- login --raw\n';

if (unknownFlags.length) {
  console.error(`\n❌ Error: unknown option(s): ${unknownFlags.join(', ')}\n${usage}`);
  process.exit(1);
}

if (!screenSlug) {
  console.error(`\n❌ Error: screen name is required.\n${usage}`);
  process.exit(1);
}

if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(screenSlug)) {
  console.error(
    `\n❌ Error: invalid screen slug "${screenSlug}".\n` +
    'Use lowercase letters, numbers, and hyphens only; put the state in the slug ' +
    '(e.g. home, home-country-dropdown, profile-edit).\n',
  );
  process.exit(1);
}

dumpUITree(screenSlug, { raw });
