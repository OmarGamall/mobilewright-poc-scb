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
 *
 * @param node - The raw node to filter.
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
    // Keep identifier only for app content (not system UI — already excluded at root level)
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
 *
 * @param elements - Top-level elements from the raw dump.
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
 *
 * @param nodes - Filtered nodes to convert.
 * @param indentLevel - Current indentation depth (2 spaces per level).
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
 *   .ui-evidence/<screenName>-tree.json    (Silver — filtered app JSON, for fallback/debug)
 *   .ui-evidence/<screenName>-locators.yml (Gold  — flat locator summary for the POM builder skill)
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

  // Step 1: Capture raw dump from device
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

  // Step 3: Find android:id/content — the app/system UI boundary
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

  // Step 5: Save Silver output — filtered JSON (fallback/debug)
  const jsonPath = path.join(OUTPUT_DIR, `${screenName}-tree.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(filtered, null, 2), 'utf-8');

  // Step 6: Save Gold output — flat YAML locator summary (POM builder input)
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

  // Report sizes and token reduction
  const rawSize = Buffer.byteLength(raw, 'utf-8');
  const filteredSize = fs.statSync(jsonPath).size + fs.statSync(ymlPath).size;
  const reduction = Math.round((1 - filteredSize / rawSize) * 100);

  console.log(
    `\n✅ UI Evidence saved for '${screenName}':` +
    `\n   Silver: ${jsonPath}` +
    `\n   Gold:   ${ymlPath}` +
    `\n   Token reduction: ~${reduction}% (${rawSize} bytes raw → ${filteredSize} bytes combined)\n`,
  );
}
