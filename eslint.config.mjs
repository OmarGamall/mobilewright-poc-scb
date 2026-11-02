// eslint.config.mjs — Stage 2 of `npm run verify`.
// Every rule here is documented, with the reason it exists, in docs/static-analysis.md.
// There is no Mobilewright ESLint plugin: Mobilewright's `test` is Playwright's test
// runner, so eslint-plugin-playwright covers the runner rules; mobile/POM rules are our
// own `no-restricted-syntax` selectors below.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';
import jsdoc from 'eslint-plugin-jsdoc';
import comments from '@eslint-community/eslint-plugin-eslint-comments';

const DOC = 'See docs/static-analysis.md.';

// ── Imports ──────────────────────────────────────────────────────────────
// Mobilewright pins its own @playwright/test; only the fixture aggregator may use it (for mergeTests).
const NO_PLAYWRIGHT_IMPORT = {
  name: '@playwright/test',
  message: `Import from '@mobilewright/test'. Only fixtures/index.ts imports '@playwright/test' (for mergeTests). ${DOC}`,
};
// Specs use the '@fixtures' aggregator, never a domain fixture file directly.
const FIXTURE_FILE_PATTERN = {
  group: ['**/fixtures/*.fixture', '@fixtures/*.fixture', '**/fixtures/*.fixture.ts'],
  message: `Import 'test'/'expect' from '@fixtures', not from a domain fixture file. ${DOC}`,
};
const IMPORTS_ALL = ['error', { paths: [NO_PLAYWRIGHT_IMPORT], patterns: [FIXTURE_FILE_PATTERN] }];

// ── Waiting (all folders) ────────────────────────────────────────────────
// Fixed sleeps are allowed only in pages/components/, on a line that carries
// `// eslint-disable-next-line no-restricted-syntax -- <why no ready-signal exists>`.
const NO_FIXED_SLEEP = [
  {
    selector: "CallExpression[callee.name=/^(setTimeout|sleep)$/]",
    message: `No fixed sleeps; wait for a UI state with locator.waitFor({ state: 'visible' }) or expect(). ${DOC}`,
  },
  {
    selector: "CallExpression[callee.property.name='waitForTimeout']",
    message: `No waitForTimeout; wait for a UI state with locator.waitFor({ state: 'visible' }) or expect(). ${DOC}`,
  },
];

// ── Page Objects & Components ────────────────────────────────────────────
// Mobile UI trees are rebuilt constantly, so locators are private factory methods, never stored.
const IS_LOCATOR_CALL = 'CallExpression[callee.property.name=/^getBy/]';
const POM_LOCATORS = [
  {
    selector: `PropertyDefinition ${IS_LOCATOR_CALL}`,
    message: `Locators are private factory methods, not class fields. ${DOC}`,
  },
  {
    selector: "PropertyDefinition[typeAnnotation.typeAnnotation.typeName.name='Locator']",
    message: `Locators are private factory methods, not class fields. ${DOC}`,
  },
  {
    selector: `MethodDefinition[kind='constructor'] AssignmentExpression ${IS_LOCATOR_CALL}`,
    message: `Don't store locators in the constructor; use a private factory method. ${DOC}`,
  },
  {
    selector: `MethodDefinition:not([accessibility='private']):not([kind='constructor']) > FunctionExpression > BlockStatement > ReturnStatement > ${IS_LOCATOR_CALL}`,
    message: `Locator factory methods must be private; expose semantic action/verify methods. ${DOC}`,
  },
  {
    selector:
      "MethodDefinition:not([accessibility='private']) > FunctionExpression[returnType.typeAnnotation.typeName.name='Locator']",
    message: `Public methods must not return a Locator; expose semantic action/verify methods. ${DOC}`,
  },
  {
    selector: "MethodDefinition[kind='get']:not([accessibility='private'])",
    message: `No public getters on Page Objects/Components; expose semantic methods. ${DOC}`,
  },
];

// ── Specs ────────────────────────────────────────────────────────────────
const SPEC_DISCIPLINE = [
  {
    selector: "MemberExpression[object.name=/^(screen|device)$/]",
    message: `No screen.*/device.* in specs; call a Page Object method. ${DOC}`,
  },
  {
    selector: "MemberExpression[property.name='screen']",
    message: `Don't reach into a Page Object's screen from a spec; add a Page Object method. ${DOC}`,
  },
  {
    selector: "ObjectPattern > Property[key.name=/^(screen|device)$/]",
    message: `Specs receive Page Object fixtures from '@fixtures', not screen/device. ${DOC}`,
  },
  {
    selector: 'NewExpression[callee.name=/Page$/]',
    message: `Don't construct Page Objects in specs; use the fixture from '@fixtures'. ${DOC}`,
  },
];
const SPEC_IMPORTS = [
  'error',
  {
    paths: [
      NO_PLAYWRIGHT_IMPORT,
      ...['@mobilewright/test', '@mobilewright/core', 'mobilewright'].map((name) => ({
        name,
        importNames: ['test', 'expect'],
        message: `Import 'test'/'expect' from '@fixtures'. ${DOC}`,
      })),
    ],
    patterns: [
      FIXTURE_FILE_PATTERN,
      {
        group: [
          '**/pages/*', '@pages/*', '**/components/*', '@components/*',
          '**/helpers/*', '@helpers/*', '**/utils/*', '@utils/*',
        ],
        allowTypeImports: true,
        message: `Specs reach Page Objects through '@fixtures', not by importing them (type-only imports are fine). ${DOC}`,
      },
    ],
  },
];

const PUBLIC_METHOD = "MethodDefinition:not([accessibility='private']):not([kind='constructor'])";
const pw = playwright.configs['flat/recommended'];

export default tseslint.config(
  {
    ignores: [
      'node_modules', 'mobilewright-report', 'playwright-report', 'blob-report', 'test-results',
      '.ui-evidence', 'bug-reports', 'dist', 'build', '.github',
    ],
  },

  // ── All TypeScript ─────────────────────────────────────────────────────
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { '@eslint-community/eslint-comments': comments },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error', // un-awaited tap()/fill()/expect()
      '@typescript-eslint/explicit-module-boundary-types': 'error', // explicit return types on public API
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      'no-empty': 'error', // empty catch swallowing errors
      'no-restricted-imports': 'off', // replaced by the TS-aware version (supports allowTypeImports)
      '@typescript-eslint/no-restricted-imports': IMPORTS_ALL,
      'no-restricted-syntax': ['error', ...NO_FIXED_SLEEP],
      '@eslint-community/eslint-comments/require-description': 'error',
      '@eslint-community/eslint-comments/no-unlimited-disable': 'error',
      '@eslint-community/eslint-comments/no-unused-disable': 'error',
    },
  },

  // ── Test-runner rules (Mobilewright runs on Playwright's runner) ────────
  {
    ...pw,
    files: ['tests/**/*.ts', 'pages/**/*.ts', 'fixtures/**/*.ts'],
    rules: {
      ...pw.rules,
      'playwright/missing-playwright-await': 'error',
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-force-option': 'error',
      'playwright/no-nth-methods': 'error', // .first()/.nth()/.last(): disable per line WITH a reason
      'playwright/no-focused-test': 'error',
      'playwright/no-skipped-test': 'error',
      // Assertions live in POM verify methods, so they count as assertions.
      'playwright/expect-expect': ['error', { assertFunctionPatterns: ['^verify'] }],
    },
  },

  // ── pages/** (incl. pages/components/**): locator discipline + JSDoc ───
  {
    files: ['pages/**/*.ts'],
    plugins: { jsdoc },
    rules: {
      'no-restricted-syntax': ['error', ...NO_FIXED_SLEEP, ...POM_LOCATORS],
      // AGENTS.md: JSDoc with @param on public methods. Private helpers and module functions are free.
      'jsdoc/require-jsdoc': [
        'error',
        { require: { FunctionDeclaration: false }, contexts: [PUBLIC_METHOD] },
      ],
      'jsdoc/require-param': ['error', { contexts: [PUBLIC_METHOD] }],
      'jsdoc/check-param-names': 'error',
    },
  },

  // ── tests/**: specs talk to fixtures only ──────────────────────────────
  {
    files: ['tests/**/*.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...NO_FIXED_SLEEP, ...SPEC_DISCIPLINE],
      '@typescript-eslint/no-restricted-imports': SPEC_IMPORTS,
    },
  },

  // ── Documented exemptions (each one is listed in docs/static-analysis.md) ──
  {
    files: ['fixtures/index.ts'], // the aggregator needs mergeTests from '@playwright/test'
    rules: { '@typescript-eslint/no-restricted-imports': 'off' },
  },
);
