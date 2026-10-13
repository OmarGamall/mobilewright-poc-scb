import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { ROLE_TYPE_MAP, bareTypeName } from '@mobilewright/core';
import { ENV } from '../config/env';
import { BUNDLE_IDS } from '../config/targets';

/**
 * @fileoverview UI evidence extractor: captures the current screen of the connected
 * device and writes `.ui-evidence/<slug>-locators.yml` (+ screenshot, + raw dump on
 * request) for agents and people writing locators.
 *
 * Android only for now: the app-root, system-UI and layout rules below are Android's.
 * Other platforms are rejected (see `assertSupportedDevice`) until the config refactor
 * adds per-platform support.
 */

const OUTPUT_DIR = path.join(process.cwd(), '.ui-evidence');

// ============================================================================
// mobilecli output shapes (only the fields observed on a real Android device)
// ============================================================================

interface Rect { x: number; y: number; width: number; height: number }

interface RawNode {
  type: string;
  text?: string;
  label?: string;
  identifier?: string;
  placeholder?: string;
  rect?: Rect;
  focused?: boolean;
  checked?: boolean;
  selected?: boolean;
  children?: RawNode[];
}

export interface DeviceInfo {
  id: string;
  name: string;
  platform: string;
  type: string;
  version: string;
  model?: string;
  screenSize: { width: number; height: number };
}

export interface ForegroundApp { packageName: string; version?: string }

// ============================================================================
// Evidence node (what the YAML shows)
// ============================================================================

interface EvidenceNode {
  role: string;
  type: string;
  label?: string;
  text?: string;
  identifier?: string;
  placeholder?: string;
  focused?: true;
  checked?: true;
  selected?: true;
  at?: string;
  offscreen?: true;
  zeroSize?: true;
  children?: EvidenceNode[];
}

// ============================================================================
// Android rules
// ============================================================================

const APP_ROOT_ID = 'android:id/content';
const SYSTEM_UI_PREFIX = 'com.android.systemui';

/** Pure layout containers: dropped (children hoisted) when they carry nothing locatable. */
const LAYOUT_TYPES = new Set([
  'android.widget.FrameLayout',
  'android.widget.LinearLayout',
  'android.widget.RelativeLayout',
  'android.view.ViewGroup',
  'android.widget.ScrollView',
  'android.widget.HorizontalScrollView',
]);

/** Roles a user interacts with: kept even without a label, and flagged when unreachable. */
const INTERACTIVE_ROLES = new Set([
  'button', 'textfield', 'checkbox', 'radio', 'switch', 'slider', 'combobox', 'tab', 'link',
]);

/** Mobilewright's own role for a native type (same tables `getByRole` uses), or 'none'. */
function roleOf(type: string): string {
  const bare = bareTypeName(type);
  for (const [role, types] of Object.entries(ROLE_TYPE_MAP)) {
    if ((types as readonly string[]).includes(bare)) return role;
  }
  return 'none';
}

/** "android.widget.EditText" → "EditText". */
const shortType = (type: string): string => type.slice(type.lastIndexOf('.') + 1);

const REDACTED = '[REDACTED]';

const isAppIdentifier =(id: string | undefined): id is string =>
  Boolean(id) && !id!.startsWith('android:id/') && !id!.startsWith(SYSTEM_UI_PREFIX);

// ============================================================================
// mobilecli helpers
// ============================================================================

function runMobilecli(args: string): string {
  return execSync(`npx mobilecli ${args}`, { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
}

function mobilecliData<T>(args: string): T {
  const out = runMobilecli(args);
  let parsed: { status?: string; data?: T };
  try {
    parsed = JSON.parse(out) as { status?: string; data?: T };
  } catch {
    throw new Error(`[ui-tree-extractor] mobilecli ${args} did not return JSON:\n${out.slice(0, 300)}`);
  }
  if (parsed.status !== 'ok' || parsed.data === undefined) {
    throw new Error(`[ui-tree-extractor] mobilecli ${args} failed: ${out.slice(0, 300)}`);
  }
  return parsed.data;
}

function assertSupportedDevice(device: DeviceInfo): void {
  if (device.platform !== 'android') {
    throw new Error(
      `[ui-tree-extractor] ${device.platform} is not supported yet; only Android captures are ` +
      'implemented (text redaction and app-root detection are Android-specific).',
    );
  }
}

// ============================================================================
// Filtering
// ============================================================================

function findAll(nodes: RawNode[], match: (n: RawNode) => boolean, out: RawNode[] = []): RawNode[] {
  for (const node of nodes) {
    if (match(node)) out.push(node);
    findAll(node.children ?? [], match, out);
  }
  return out;
}

interface FilterContext {
  screen: { width: number; height: number };
  /** Interactive nodes with no label/text/id and no labelled ancestor to chain from. */
  noHandle: string[];
}

const formatRect = (r: Rect): string => `${r.x},${r.y} ${r.width}x${r.height}`;

/**
 * Turns a raw node into evidence nodes (0, 1, or its hoisted children):
 * - layout containers and empty non-interactive nodes disappear, children are hoisted;
 * - every kept node gets its Mobilewright role, position and visibility flags;
 * - text in text fields is redacted (by role, so every text-input class is covered).
 */
function filterNode(node: RawNode, ctx: FilterContext, labelledAncestor: boolean): EvidenceNode[] {
  const role = roleOf(node.type);
  const label = node.label || undefined;
  // Untrimmed, as Mobilewright matches it exactly; whitespace-only text is no handle.
  const rawText = node.text?.trim() ? node.text : undefined;
  const text = rawText && role === 'textfield' ? REDACTED : rawText;
  const identifier = isAppIdentifier(node.identifier) ? node.identifier : undefined;
  const placeholder = node.placeholder || undefined;
  // Typed text is redacted and changes with input, so it is never a handle for a text field.
  const hasHandle = Boolean(label || (role !== 'textfield' && rawText) || identifier || placeholder);
  const hasState = Boolean(node.focused || node.checked || node.selected);

  const children = (node.children ?? []).flatMap((c) => filterNode(c, ctx, labelledAncestor || Boolean(label)));

  const keep = INTERACTIVE_ROLES.has(role) || (!LAYOUT_TYPES.has(node.type) && (hasHandle || hasState));
  if (!keep) return children;

  if (INTERACTIVE_ROLES.has(role) && !hasHandle && !labelledAncestor) {
    ctx.noHandle.push(`${shortType(node.type)}${node.rect ? ` at ${formatRect(node.rect)}` : ''}`);
  }

  const result: EvidenceNode = { role, type: shortType(node.type) };
  if (label) result.label = label;
  if (text) result.text = text;
  if (identifier) result.identifier = identifier;
  if (placeholder) result.placeholder = placeholder;
  if (node.focused) result.focused = true;
  if (node.checked) result.checked = true;
  if (node.selected) result.selected = true;
  if (node.rect) {
    const r = node.rect;
    result.at = formatRect(r);
    if (r.width <= 0 || r.height <= 0) result.zeroSize = true;
    else if (r.x + r.width <= 0 || r.y + r.height <= 0 || r.x >= ctx.screen.width || r.y >= ctx.screen.height) {
      result.offscreen = true;
    }
  }
  if (children.length) result.children = children;
  return [result];
}

function flatten(nodes: EvidenceNode[], out: EvidenceNode[] = []): EvidenceNode[] {
  for (const n of nodes) {
    out.push(n);
    flatten(n.children ?? [], out);
  }
  return out;
}

/** Locator-relevant warnings an agent must see before writing locators. */
function collectWarnings(nodes: EvidenceNode[], ctx: FilterContext, windowWarnings: string[]): string[] {
  const all = flatten(nodes);
  const warnings = [...windowWarnings];

  // Mobilewright has no strict mode: a locator matching several nodes silently uses the first.
  // Count what each locator really matches (query-engine): getByLabel → label;
  // getByText → text, else label; getByRole name → label, else text.
  const counts = new Map<string, Map<string, number>>();
  const count = (value: string | undefined, locator: string): void => {
    if (!value || value === REDACTED) return;
    const byLocator = counts.get(value) ?? new Map<string, number>();
    byLocator.set(locator, (byLocator.get(locator) ?? 0) + 1);
    counts.set(value, byLocator);
  };
  for (const n of all) {
    count(n.label, 'getByLabel');
    count(n.text ?? n.label, 'getByText');
    if (n.role !== 'none') count(n.label ?? n.text, `getByRole('${n.role}')`);
  }
  for (const [value, byLocator] of counts) {
    const dups = [...byLocator].filter(([, c]) => c > 1).map(([locator, c]) => `${locator} ×${c}`);
    if (dups.length) {
      warnings.push(`duplicate ${q(value)}: ${dups.join(', ')}; a locator on it acts on the first match, so scope by container`);
    }
  }

  if (all.some((n) => n.role === 'textfield' && n.focused)) {
    warnings.push(
      'keyboard: a text field is focused, so the soft keyboard may be open (it never appears in the ' +
      'dump; a field can stay focused after the keyboard closes): check the screenshot before trusting lower elements',
    );
  }
  for (const item of ctx.noHandle) {
    warnings.push(`no-handle: interactive ${item} has no label, text or identifier; ask the app team for a Semantics label/identifier`);
  }
  const offscreen = all.filter((n) => n.offscreen).length;
  if (offscreen) warnings.push(`offscreen: ${offscreen} element(s) are outside the screen and need scrolling before a tap`);
  const zero = all.filter((n) => n.zeroSize).length;
  if (zero) warnings.push(`zero-size: ${zero} element(s) have no size; Mobilewright treats them as not visible`);
  if (!all.some((n) => n.identifier)) {
    warnings.push('no-identifiers: no app element has a test id here, so getByTestId cannot be used on this screen');
  }
  return warnings;
}

// ============================================================================
// YAML output
// ============================================================================

/** Double-quoted YAML string; invisible format characters (e.g. U+200E) are escaped so they show. */
const q = (s: string): string =>
  JSON.stringify(s).replace(/\p{Cf}/gu, (c) => {
    const cp = c.codePointAt(0) ?? 0;
    return cp > 0xffff ? `\\U${cp.toString(16).padStart(8, '0')}` : `\\u${cp.toString(16).padStart(4, '0')}`;
  });

function toYaml(nodes: EvidenceNode[], indent: number): string[] {
  const pad = '  '.repeat(indent);
  const lines: string[] = [];
  for (const n of nodes) {
    lines.push(`${pad}- role: ${n.role}`);
    lines.push(`${pad}  type: ${n.type}`);
    if (n.label !== undefined) lines.push(`${pad}  label: ${q(n.label)}`);
    if (n.text !== undefined) lines.push(`${pad}  text: ${q(n.text)}`);
    if (n.identifier !== undefined) lines.push(`${pad}  identifier: ${q(n.identifier)}`);
    if (n.placeholder !== undefined) lines.push(`${pad}  placeholder: ${q(n.placeholder)}`);
    if (n.focused) lines.push(`${pad}  focused: true`);
    if (n.checked) lines.push(`${pad}  checked: true`);
    if (n.selected) lines.push(`${pad}  selected: true`);
    if (n.at) lines.push(`${pad}  at: ${n.at}`);
    if (n.offscreen) lines.push(`${pad}  offscreen: true`);
    if (n.zeroSize) lines.push(`${pad}  zeroSize: true`);
    if (n.children?.length) {
      lines.push(`${pad}  children:`);
      lines.push(...toYaml(n.children, indent + 2));
    }
  }
  return lines;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Turns a raw `mobilecli dump ui` output into the evidence YAML. Pure apart from the
 * capture timestamp, so the filter can be tested against a saved dump without a device.
 *
 * @param screenName - Slug naming the screen and its state.
 * @param rawDump - Untouched stdout of `mobilecli dump ui`.
 * @param device - `mobilecli device info` data for the capturing device.
 * @param app - Foreground app, or undefined when mobilecli could not determine it.
 * @param initialWarnings - Warnings gathered before the dump (e.g. unverified app).
 * @returns The YAML text and the warnings it contains.
 */
export function renderEvidence(
  screenName: string,
  rawDump: string,
  device: DeviceInfo,
  app: ForegroundApp | undefined,
  initialWarnings: string[] = [],
): { yaml: string; warnings: string[] } {
  let elements: RawNode[];
  try {
    const parsed = JSON.parse(rawDump) as { status?: string; data?: { elements?: RawNode[] } };
    if (parsed.status !== 'ok' || !Array.isArray(parsed.data?.elements)) throw new Error('bad shape');
    elements = parsed.data.elements;
  } catch {
    throw new Error(`[ui-tree-extractor] unexpected mobilecli dump output:\n${rawDump.slice(0, 300)}`);
  }

  // App window vs. anything else on screen.
  const windowWarnings = [...initialWarnings];
  const appRoots = findAll(elements, (n) => n.identifier === APP_ROOT_ID);
  if (appRoots.length === 0) {
    throw new Error(`[ui-tree-extractor] no app window (${APP_ROOT_ID}) in the dump. Is the app in the foreground and the device unlocked?`);
  }
  if (appRoots.length > 1) {
    windowWarnings.push(`windows: ${appRoots.length} app content windows (e.g. a dialog); captured the first`);
  }
  for (const top of elements) {
    const isSystemUi = top.identifier?.startsWith(SYSTEM_UI_PREFIX);
    // Windows holding any app root are covered by the "windows" warning above.
    const containsAppRoot = findAll([top], (n) => appRoots.includes(n)).length > 0;
    if (!isSystemUi && !containsAppRoot) {
      windowWarnings.push(`overlay: another window is on screen (${top.identifier ?? top.type}); the capture may not match what a test sees`);
    }
  }

  const ctx: FilterContext = { screen: device.screenSize, noHandle: [] };
  const nodes = (appRoots[0].children ?? []).flatMap((c) => filterNode(c, ctx, false));
  if (nodes.length === 0) {
    throw new Error('[ui-tree-extractor] the app window has no locatable elements (blank or loading screen?)');
  }
  const warnings = collectWarnings(nodes, ctx, windowWarnings);

  const header = [
    `# UI Evidence — ${screenName}`,
    `# Captured: ${new Date().toISOString()} · app ${app ? `${app.packageName} v${app.version ?? '?'}` : `${BUNDLE_IDS.android} (not verified)`} · ` +
      `device ${device.name}${device.model ? ` (${device.model})` : ''}, ${device.platform} ${device.version}, ${device.type} · ` +
      `screen ${device.screenSize.width}x${device.screenSize.height}`,
    '# Redacted: text typed into text fields. NOT redacted: labels, static text, and the screenshot (all may contain names/emails).',
    '# role: Mobilewright getByRole role ("none" = no role; use getByLabel / getByText). at: x,y widthxheight (px).',
    '# focused / checked / selected are listed only when true.',
    '# Locator priority: getByTestId(identifier) > getByLabel > getByRole > getByText.',
    '',
  ];
  const body = [
    'elements:',
    ...toYaml(nodes, 1),
    '',
    warnings.length ? 'warnings:' : 'warnings: []',
    ...warnings.map((w) => `  - ${q(w)}`),
    '',
  ];
  return { yaml: [...header, ...body].join('\n'), warnings };
}

export interface ExtractOptions {
  /** Also save mobilecli's untouched dump as `<slug>-raw.json` (deep debugging only). */
  raw?: boolean;
}

/**
 * Captures the current screen of the connected Android device into `.ui-evidence/`:
 *
 *   <slug>-locators.yml  evidence for writing locators (always; the file agents read)
 *   <slug>.png           screenshot, to confirm the screen state (always)
 *   <slug>-raw.json      mobilecli's unfiltered dump (only with `raw: true`; otherwise an
 *                        older one for the same slug is removed)
 *
 * The app (BUNDLE_IDS.android) must be in the foreground on the target screen and state.
 *
 * @param screenName - Slug naming the screen and its state, e.g. 'home', 'home-country-dropdown'.
 * @param options - Extra outputs; see {@link ExtractOptions}.
 */
export function dumpUITree(screenName: string, options: ExtractOptions = {}): void {
  const deviceId = ENV.deviceId;
  if (!deviceId) {
    throw new Error('[ui-tree-extractor] DEVICE_ID is not set. Ensure your .env file exists and contains DEVICE_ID.');
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Device and foreground app: refuse captures of the wrong platform or the wrong app.
  const device = mobilecliData<{ device: DeviceInfo }>(`device info --device ${deviceId}`).device;
  assertSupportedDevice(device);
  const windowWarnings: string[] = [];
  // `apps foreground` is unreliable on some Android devices (it intermittently fails to
  // determine the app), so an unknown answer is a warning; a different app is an error.
  let app: ForegroundApp | undefined;
  try {
    app = mobilecliData<ForegroundApp>(`apps foreground --device ${deviceId}`);
  } catch {
    windowWarnings.push(`app: mobilecli could not determine the foreground app; check the screenshot shows ${BUNDLE_IDS.android}`);
  }
  if (app && app.packageName !== BUNDLE_IDS.android) {
    throw new Error(
      `[ui-tree-extractor] foreground app is ${app.packageName}, expected ${BUNDLE_IDS.android}. ` +
      'Open the app on the target screen (and unlock the device), then retry.',
    );
  }

  console.log(`[ui-tree-extractor] Capturing '${screenName}' on ${device.name} (${deviceId})`);
  const rawDump = runMobilecli(`dump ui --device ${deviceId}`);
  const { yaml, warnings } = renderEvidence(screenName, rawDump, device, app, windowWarnings);

  // Screenshot before the YAML: if it fails, the previous YAML + PNG pair stays consistent.
  const pngPath = path.join(OUTPUT_DIR, `${screenName}.png`);
  runMobilecli(`screenshot --device ${deviceId} -o "${pngPath}"`);

  const ymlPath = path.join(OUTPUT_DIR, `${screenName}-locators.yml`);
  fs.writeFileSync(ymlPath, yaml, 'utf-8');

  const written = [ymlPath, pngPath];
  const rawPath = path.join(OUTPUT_DIR, `${screenName}-raw.json`);
  if (options.raw) {
    fs.writeFileSync(rawPath, rawDump, 'utf-8');
    written.push(rawPath);
  } else {
    // A raw dump from an earlier capture of this slug would no longer match the evidence.
    fs.rmSync(rawPath, { force: true });
  }

  console.log(`\n✅ UI evidence saved for '${screenName}':\n${written.map((p) => `   ${p}`).join('\n')}`);
  if (warnings.length) console.log(`\n⚠️  Warnings:\n${warnings.map((w) => `   - ${w}`).join('\n')}`);
  console.log('');
}
