# Plan: UI Tree Extractor — Filtering & Dual Output

## Goal

Replace the current `utils/ui-tree-extractor.ts` (which dumps raw JSON with no filtering) with a
smart extractor that:
1. Drops Android system UI (navigation bar, status bar) — currently **76% of the file**
2. Strips token-wasting fields (`rect`, `ref`) from every node
3. Redacts user-entered text on `EditText` nodes
4. Saves two output files mirroring the web project pattern:
   - **Silver** → `<screen>-tree.json` (filtered app-only JSON — for fallback/debug)
   - **Gold**   → `<screen>-locators.yml` (flat, readable locator summary — what the POM builder skill consumes)

---

## Evidence: Why This Is Needed

A live dump of the home screen produced a **804-line / 32 KB** file.
The actual app content occupies only **186 lines** at the bottom.

| Zone | Lines | % of file | Useful? |
|---|---|---|---|
| Android nav bar (`com.android.systemui:id/navigation_*`) | 1–112 | 14% | ❌ Never |
| Android status bar (`com.android.systemui:id/status_*`) | 113–612 | 62% | ❌ Never |
| **App content (`android:id/content`)** | **613–803** | **24%** | **✅ Always** |

Estimated token reduction after filtering: **~94%** (804 lines → ~50 lines gold output).

---

## Files to Modify

| File | Change |
|---|---|
| `utils/ui-tree-extractor.ts` | Full rewrite — add filter logic + dual output |

No other files are touched.

---

## Raw JSON Structure (confirmed from live dump)

```
{
  "status": "ok",
  "data": {
    "elements": [
      { "ref": "@e1", "type": "android.widget.FrameLayout",
        "identifier": "com.android.systemui:id/navigation_bar_frame", ... },  ← DROP
      { "ref": "@e9", "type": "android.widget.FrameLayout",
        "identifier": "com.android.systemui:id/status_bar_container", ... },  ← DROP
      { "ref": "@e47", "type": "android.widget.FrameLayout",
        "identifier": "android:id/content",                                    ← KEEP THIS SUBTREE
        "children": [
          { "ref": "@e50", "type": "android.view.View",   "label": "Phase 3" },
          { "ref": "@e51", "type": "android.view.View",   "label": "LOGIN_INPUT_USERNAME",
            "children": [
              { "ref": "@e52", "type": "android.widget.EditText", "text": "omar_phase3", "focused": true }
            ]
          },
          { "ref": "@e53", "type": "android.widget.Button",   "label": "Egypt" },
          { "ref": "@e55", "type": "android.widget.CheckBox", "label": "HOME_CHECKBOX_TERMS", "checked": true },
          { "ref": "@e57", "type": "android.widget.RadioButton", "label": "HOME_RADIO_VAL", "checked": true },
          { "ref": "@e58", "type": "android.widget.Button",   "label": "HOME_DATE_PICKER\n..." },
          ...
        ]
      }
    ]
  }
}
```

Each node has: `ref`, `type`, `text`, `label?`, `identifier?`, `rect`, `children?`,
`focused?`, `checked?`, `selected?`

---

## Filter Rules

| Rule | What | Why |
|---|---|---|
| **1. App root extraction** | Find the element with `identifier === "android:id/content"` and process only its subtree | Drops 100% of system UI in one step |
| **2. Strip `rect` + `ref`** | Remove from every node | Pure noise — coordinates and internal IDs are useless for locator writing |
| **3. Redact `EditText.text`** | Replace with `"[REDACTED]"` | User-entered data must never be saved to evidence files |
| **4. Collapse layout wrappers** | Drop `FrameLayout`/`LinearLayout`/`ViewGroup` nodes that have no `label`, no `text`, no state, and no children worth keeping | Reduces nesting noise |
| **5. Shorten type names** | `android.widget.Button` → `Button`, `android.view.View` → `View` | Saves tokens in the gold output |

---

## Output Files

### Silver: `<screen>-tree.json`
Filtered app-only JSON. Keeps node hierarchy. Used for debugging and fallback when the gold
output doesn't cover something.

Example (home screen, filtered):
```json
{
  "type": "FrameLayout",
  "identifier": "android:id/content",
  "children": [
    { "type": "View",   "label": "Phase 3" },
    { "type": "View",   "label": "LOGIN_INPUT_USERNAME",
      "children": [
        { "type": "EditText", "text": "[REDACTED]", "focused": true }
      ]
    },
    { "type": "Button",      "label": "Egypt" },
    { "type": "CheckBox",    "label": "HOME_CHECKBOX_TERMS", "checked": true },
    { "type": "RadioButton", "label": "HOME_RADIO_VAL",      "checked": true },
    { "type": "Button",      "label": "HOME_DATE_PICKER\nDate\n15 Sep 2026\nDatePicker icon" },
    { "type": "Button",      "label": "Home\nTab 1 of 3", "selected": true },
    { "type": "Button",      "label": "Profile\nTab 2 of 3" },
    { "type": "Button",      "label": "Menu\nTab 3 of 3" }
  ]
}
```

### Gold: `<screen>-locators.yml`
Flat ARIA-style summary. **This is what the `mobilewright-pom-builder` skill reads.**
Layout wrappers with no semantic content are collapsed (children hoisted up).

Example (home screen):
```yaml
# UI Evidence — home
# Generated: 2026-09-28T...
# Text values on EditText nodes are REDACTED.
# Use labels and roles below to build locators.

elements:
  - type: View
    label: "Phase 3"

  - type: View
    label: "LOGIN_INPUT_USERNAME"
    children:
      - type: EditText
        text: "[REDACTED]"
        focused: true

  - type: Button
    label: "Egypt"

  - type: CheckBox
    label: "HOME_CHECKBOX_TERMS"
    checked: true

  - type: RadioButton
    label: "HOME_RADIO_VAL"
    checked: true

  - type: Button
    label: "HOME_DATE_PICKER\nDate\n15 Sep 2026\nDatePicker icon"

  - type: Button
    label: "Home\nTab 1 of 3"
    selected: true

  - type: Button
    label: "Profile\nTab 2 of 3"

  - type: Button
    label: "Menu\nTab 3 of 3"
```

---

## Full Replacement Code for `utils/ui-tree-extractor.ts`

```typescript
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { ENV } from '../config/env';

const OUTPUT_DIR = path.join(process.cwd(), '.ui-evidence');

// ============================================================================
// Raw JSON types (shape of mobilecli dump ui output)
// ============================================================================

interface RawNode {
  ref: string;
  type: string;
  text?: string;
  label?: string;
  identifier?: string;
  rect: { x: number; y: number; width: number; height: number };
  children?: RawNode[];
  focused?: boolean;
  checked?: boolean;
  selected?: boolean;
}

interface RawDump {
  status: string;
  data: {
    elements: RawNode[];
  };
}

// ============================================================================
// Filtered node type (rect and ref stripped)
// ============================================================================

interface FilteredNode {
  type: string;
  label?: string;
  text?: string;
  identifier?: string;
  focused?: boolean;
  checked?: boolean;
  selected?: boolean;
  children?: FilteredNode[];
}

// ============================================================================
// Constants
// ============================================================================

/** Widget types that are pure layout containers with no accessible semantics. */
const LAYOUT_TYPES = new Set([
  'android.widget.FrameLayout',
  'android.widget.LinearLayout',
  'android.view.ViewGroup',
  'android.widget.ScrollView',
  'android.widget.HorizontalScrollView',
]);

// ============================================================================
// Filter helpers
// ============================================================================

/** True if a node carries accessible meaning an agent can use for locators. */
function hasSemantic(node: RawNode): boolean {
  return Boolean(
    node.label ||
    (node.text && node.text.trim()) ||
    node.focused ||
    node.checked !== undefined ||
    node.selected !== undefined,
  );
}

/**
 * Recursively filters a raw node:
 * - Strips rect and ref
 * - Redacts text on EditText nodes
 * - Drops layout-only wrappers that add no information
 * - Shortens Android type names (e.g. "android.widget.Button" → "Button")
 *
 * Returns null if the node (and all its descendants) carry no locator value.
 */
function filterNode(node: RawNode): FilteredNode | null {
  const filteredChildren: FilteredNode[] = [];

  for (const child of node.children ?? []) {
    const filtered = filterNode(child);
    if (filtered !== null) filteredChildren.push(filtered);
  }

  const isLayoutOnly = LAYOUT_TYPES.has(node.type) && !hasSemantic(node);

  // Layout wrapper with nothing useful in it or under it → drop entirely
  if (isLayoutOnly && filteredChildren.length === 0) return null;

  // Redact user-entered text on input fields
  const rawText = node.text?.trim();
  const text =
    node.type === 'android.widget.EditText' && rawText ? '[REDACTED]' : rawText || undefined;

  // Shorten the type name for readability
  const shortType = node.type
    .replace('android.widget.', '')
    .replace('android.view.', '');

  const result: FilteredNode = {
    type: shortType,
    ...(node.label !== undefined && { label: node.label }),
    ...(text !== undefined && { text }),
    // Keep identifier only for app content (not system UI — already excluded at root)
    ...(node.identifier &&
      !node.identifier.startsWith('com.android.systemui') && { identifier: node.identifier }),
    ...(node.focused && { focused: true }),
    ...(node.checked !== undefined && { checked: node.checked }),
    ...(node.selected !== undefined && { selected: node.selected }),
    ...(filteredChildren.length > 0 && { children: filteredChildren }),
  };

  return result;
}

/**
 * Finds the app content root: the element with identifier "android:id/content".
 * This is the boundary between Android system UI and the app's own widget tree.
 */
function findAppRoot(elements: RawNode[]): RawNode | null {
  for (const el of elements) {
    if (el.identifier === 'android:id/content') return el;
    const found = findAppRoot(el.children ?? []);
    if (found) return found;
  }
  return null;
}

// ============================================================================
// Gold output: flat YAML-style locator summary
// ============================================================================

/**
 * Converts filtered nodes to an indented YAML-style string.
 * Layout wrappers with no semantic content are collapsed (children hoisted up),
 * keeping the output flat and agent-readable.
 */
function toYaml(nodes: FilteredNode[], indentLevel = 0): string {
  const pad = '  '.repeat(indentLevel);
  const lines: string[] = [];

  for (const node of nodes) {
    const isPassthrough =
      !node.label &&
      !node.text &&
      !node.focused &&
      node.checked === undefined &&
      node.selected === undefined;

    // Collapse layout wrappers: hoist their children up to this level
    if (isPassthrough && node.children) {
      lines.push(toYaml(node.children, indentLevel));
      continue;
    }

    lines.push(`${pad}- type: ${node.type}`);
    if (node.label !== undefined) lines.push(`${pad}  label: ${JSON.stringify(node.label)}`);
    if (node.text !== undefined)  lines.push(`${pad}  text: ${JSON.stringify(node.text)}`);
    if (node.focused)             lines.push(`${pad}  focused: true`);
    if (node.checked !== undefined)  lines.push(`${pad}  checked: ${node.checked}`);
    if (node.selected !== undefined) lines.push(`${pad}  selected: ${node.selected}`);

    if (node.children?.length) {
      lines.push(`${pad}  children:`);
      lines.push(toYaml(node.children, indentLevel + 2));
    }
  }

  return lines.filter(Boolean).join('\n');
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Dumps the current accessibility tree from the connected Android device,
 * filters it to app-only content, and saves two evidence files:
 *
 *   .ui-evidence/<screenName>-tree.json    (Silver — filtered app JSON)
 *   .ui-evidence/<screenName>-locators.yml (Gold  — flat locator summary for POM builder)
 *
 * The app must already be navigated to the target screen before calling this.
 * Text values on EditText nodes are automatically REDACTED.
 *
 * @param screenName - Slug identifying the screen, used as the output filename prefix.
 *                     Examples: 'login', 'home-phase3', 'profile'
 */
export function dumpUITree(screenName: string): void {
  const deviceId = ENV.deviceId;
  if (!deviceId) {
    throw new Error(
      '[ui-tree-extractor] DEVICE_ID is not set. ' +
      'Ensure your .env file exists and contains DEVICE_ID.',
    );
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Step 1: Capture raw dump
  console.log(`[ui-tree-extractor] Dumping UI tree for device: ${deviceId}`);
  const raw = execSync(`npx mobilecli dump ui --device ${deviceId}`, { encoding: 'utf-8' });

  // Step 2: Parse and validate structure
  let dump: RawDump;
  try {
    dump = JSON.parse(raw) as RawDump;
  } catch {
    throw new Error(
      `[ui-tree-extractor] mobilecli output was not valid JSON:\n${raw.slice(0, 500)}`,
    );
  }

  if (dump.status !== 'ok' || !Array.isArray(dump.data?.elements)) {
    throw new Error(
      `[ui-tree-extractor] Unexpected dump structure: ${JSON.stringify(dump).slice(0, 200)}`,
    );
  }

  // Step 3: Find android:id/content — the app boundary
  const appRoot = findAppRoot(dump.data.elements);
  if (!appRoot) {
    throw new Error(
      '[ui-tree-extractor] Could not find android:id/content root. ' +
      'Is the app in the foreground?',
    );
  }

  // Step 4: Filter the app subtree
  const filtered = filterNode(appRoot);
  if (!filtered) {
    throw new Error(
      '[ui-tree-extractor] App root filtered to nothing — ' +
      'the screen may have no accessible elements.',
    );
  }

  // Step 5: Save Silver output — filtered JSON
  const jsonPath = path.join(OUTPUT_DIR, `${screenName}-tree.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(filtered, null, 2), 'utf-8');

  // Step 6: Save Gold output — flat YAML locator summary
  const appNodes = filtered.children ?? [filtered];
  const yamlHeader = [
    `# UI Evidence — ${screenName}`,
    `# Generated: ${new Date().toISOString()}`,
    `# Text values on EditText nodes are REDACTED.`,
    `# Use the labels and roles below to build Mobilewright locators.`,
    `# Locator priority: getByLabel > getByRole > getByText`,
    ``,
    `elements:`,
    ``,
  ].join('\n');

  const ymlPath = path.join(OUTPUT_DIR, `${screenName}-locators.yml`);
  fs.writeFileSync(ymlPath, yamlHeader + toYaml(appNodes, 1), 'utf-8');

  const rawSize = Buffer.byteLength(raw, 'utf-8');
  const filteredSize = fs.statSync(jsonPath).size + fs.statSync(ymlPath).size;
  const reduction = Math.round((1 - filteredSize / rawSize) * 100);

  console.log(
    `\n✅ UI Evidence saved for '${screenName}':` +
    `\n   Silver: ${jsonPath}` +
    `\n   Gold:   ${ymlPath}` +
    `\n   Token reduction: ~${reduction}% (${rawSize} bytes → ${filteredSize} bytes combined)\n`,
  );
}
```

---

## Verification

After implementation:
1. With the home screen open on the device, call `dumpUITree('home')` from a test.
2. Confirm `.ui-evidence/home-tree.json` exists and contains only app nodes (no `com.android.systemui`).
3. Confirm `.ui-evidence/home-locators.yml` is under 60 lines and contains `LOGIN_INPUT_USERNAME`,
   `HOME_CHECKBOX_TERMS`, `Egypt`, etc.
4. Confirm `EditText` text is `[REDACTED]`, not `omar_phase3`.
5. Confirm no `rect` or `ref` fields appear in either output file.
6. Run `npx mobilewright test tests/home.spec.ts` — existing tests still pass (extractor is a
   utility, not part of the test runner).

---

## Scope of Approval

- **1 file modified:** `utils/ui-tree-extractor.ts` (full rewrite)
- **No other files touched.**
