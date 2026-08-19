import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The scope banner makes a blanket claim over a whole panel: "Global defaults"
 * or "This book". Most rows honour it, but two kinds do not — rows saved with
 * `skipGlobal` (always the book) and rows saved through `saveSysSettings`
 * (always app-wide, never per-book). Those rows carry a `useScopeTags().alwaysBook`
 * or `useScopeTags().appWide` tag so the banner is never silently contradicted.
 *
 * Scope is a property of the call site, not of the setting, so nothing in the
 * type system can enforce this. This is the tripwire instead: add a new
 * exception write and the expected set below stops matching, which forces a
 * deliberate choice about tagging its row rather than letting the banner lie.
 */

const SETTINGS_DIR = 'src/components/settings';

/**
 * Written to the book whatever the scope switch says, keyed by the file that
 * writes it. Every entry is either tagged on its row or exempt for a stated
 * reason.
 */
const ALWAYS_BOOK: Record<string, string[]> = {
  // Tagged `useScopeTags().alwaysBook` on the row.
  'ControlPanel.tsx': ['allowScript'],
  'LangPanel.tsx': ['translationEnabled'],
  'LayoutPanel.tsx': ['referencePageCount', 'writingMode'],
  // The scope switch itself, not a row it governs.
  'DialogMenu.tsx': ['isGlobal'],
  'SettingsScopeContext.tsx': ['isGlobal'],
};

/**
 * Written app-wide; `bookKey` is never consulted. Same rule: tagged, or exempt
 * with the reason recorded here.
 */
const APP_WIDE: Record<string, string[]> = {
  // Tagged `useScopeTags().appWide` on each row.
  'ControlPanel.tsx': [
    'autoCheckUpdates',
    'autoScreenBrightness',
    'autohideCursor',
    'screenWakeLock',
    'swipeBrightnessGesture',
    'telemetryEnabled',
    'updateChannel',
  ],
  // Tagged once on the whole group — every row in it is app-wide.
  'PageTurnerSettings.tsx': ['hardwarePageTurner'],
  // librarySkeuomorphicCovers is written here but its row lives in (and is
  // tagged by) LibrarySettings.tsx. The libraryBackground* trio is the one
  // deliberate omission: its scope is conditional, and the Background Image
  // picker already shows its own Library / Reader switch.
  'ThemePanel.tsx': [
    'libraryBackgroundOpacity',
    'libraryBackgroundSize',
    'libraryBackgroundTextureId',
    'librarySkeuomorphicCovers',
  ],
  // Exempt: the Integrations tab is not in SCOPED_PANELS, so no banner shows.
  'IntegrationsPanel.tsx': ['discordRichPresenceEnabled'],
  // Exempt: only *filed* under settings/. Providers.tsx renders it as a
  // top-level modal opened from the library menu, never under the banner.
  'AppLockDialog.tsx': ['biometricUnlockEnabled', 'pinCodeEnabled', 'pinCodeHash', 'pinCodeSalt'],
};

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(name) ? [full] : [];
  });

/** Top-level comma-separated arguments of the call opening at `open`. */
const callArgs = (src: string, open: number): string[] => {
  let depth = 0;
  let close = open;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '(') depth++;
    else if (src[i] === ')' && --depth === 0) {
      close = i;
      break;
    }
  }
  const parts: string[] = [];
  let cur = '';
  depth = 0;
  for (const ch of src.slice(open + 1, close)) {
    if ('([{'.includes(ch)) depth++;
    if (')]}'.includes(ch)) depth--;
    if (ch === ',' && depth === 0) {
      parts.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  parts.push(cur.trim());
  return parts;
};

const sorted = (m: Record<string, string[]>): Record<string, string[]> =>
  Object.fromEntries(
    Object.entries(m)
      .map(([file, keys]) => [file, [...keys].sort()] as const)
      .sort((a, b) => a[0].localeCompare(b[0])),
  );

const keysWritten = (
  fn: 'saveViewSettings' | 'saveSysSettings',
  keyIndex: number,
  skipGlobalOnly: boolean,
) => {
  const byFile: Record<string, Set<string>> = {};
  for (const file of sourceFiles(SETTINGS_DIR)) {
    const src = readFileSync(file, 'utf8');
    const re = new RegExp(`${fn}\\s*\\(`, 'g');
    for (let m = re.exec(src); m; m = re.exec(src)) {
      const args = callArgs(src, re.lastIndex - 1);
      if (skipGlobalOnly && args[4] !== 'true') continue;
      const key = args[keyIndex]?.replace(/^['"]|['"]$/g, '');
      if (!key || !/^[a-zA-Z]\w*$/.test(key)) continue;
      const name = file.split('/').pop()!;
      (byFile[name] ??= new Set()).add(key);
    }
  }
  return sorted(Object.fromEntries(Object.entries(byFile).map(([f, keys]) => [f, [...keys]])));
};

describe('settings rows the scope banner does not govern', () => {
  it('has no unrecorded per-book write in the settings UI', () => {
    expect(keysWritten('saveViewSettings', 2, true)).toEqual(sorted(ALWAYS_BOOK));
  });

  it('has no unrecorded app-wide write in the settings UI', () => {
    expect(keysWritten('saveSysSettings', 1, false)).toEqual(sorted(APP_WIDE));
  });

  it('tags every panel that holds one, so no banner is left contradicted', () => {
    const tagged = sourceFiles(SETTINGS_DIR).filter(
      (f) =>
        // Skip the module that defines the helpers; it names them in its docs.
        !f.endsWith('ScopeTag.tsx') &&
        /scopeTag\.(alwaysBook|appWide)\(/.test(readFileSync(f, 'utf8')),
    );
    expect(tagged.map((f) => f.split('/').pop()).sort()).toEqual([
      'ControlPanel.tsx',
      'LangPanel.tsx',
      'LayoutPanel.tsx',
      'LibrarySettings.tsx',
      'PageTurnerSettings.tsx',
    ]);
  });
});

/**
 * Control state must be seeded from the scope being edited, never from the open
 * book. Seed from the book while the mount guard tests the global and the panel
 * writes the book's value into the global defaults the moment it opens — which
 * then replays onto every open book and destroys their values.
 *
 * That defect shipped three times on this branch, in four files, and every
 * mounted-panel test passed each time. The seeds are the thing to police, so
 * police them directly.
 *
 * `book.` is the deliberate exception: settings saved with `skipGlobal` are
 * per-book whatever the scope says, so they must show the book's value.
 */
describe('settings controls are seeded from the scope being edited', () => {
  const offenders = (re: RegExp) =>
    sourceFiles(SETTINGS_DIR).flatMap((file) =>
      readFileSync(file, 'utf8')
        .split('\n')
        .map((line, i) => ({ line: line.trim(), at: `${file.split('/').pop()}:${i + 1}` }))
        .filter(({ line }) => re.test(line))
        .map(({ line, at }) => `${at}  ${line.slice(0, 80)}`),
    );

  it('never seeds a control from the open book', () => {
    // Catches `useState(viewSettings.x)`, the multiline generic form, and the
    // deprecated-field fallback `useState(edited.a || viewSettings.b)`.
    expect(offenders(/useState[<(].*viewSettings\./)).toEqual([]);
  });

  it('never re-syncs a control from the open book after seeding', () => {
    expect(offenders(/^set[A-Z]\w*\(viewSettings\./)).toEqual([]);
  });
});
