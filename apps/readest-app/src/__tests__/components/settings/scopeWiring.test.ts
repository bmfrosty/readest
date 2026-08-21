/**
 * Tripwires for the wirings that no behavioural test reaches.
 *
 * Most of the logic here is covered by unit tests: the scope resolver, the
 * clearing rule, the migration function, the banner component. Each tests its
 * part in isolation, so reverting the line that CONNECTS a part to the app
 * leaves every one of them green. These pin those lines:
 *
 * The marker is the exception. It has no unit test — the file that rendered a
 * copy of its row was deleted, because a copy can only fail when the copy is
 * edited. So the first block below is the marker's ONLY coverage. Do not treat
 * it as redundant with something else.
 *
 *   - `ControlPanel` composing the marker, globe decorative and inline
 *   - `SettingsDialog` rendering the banner, for this book
 *   - `loadSettings` calling the migration, after the merge
 *   - `DialogMenu` resolving and clearing from ONE preference, the stored one
 *   - the preference being written on close, and on pagehide
 *   - `PANEL_SCOPE` staying an exhaustive Record
 *   - the Behavior tab staying scoped
 *
 * Rendering these would need a large mock harness for what is, in each
 * case, a single line. So this reads the committed source instead. It is a
 * crude instrument and it will need updating if the code is refactored — that
 * is the intended cost. A silent disconnection is worse.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = (path: string): string => readFileSync(join(process.cwd(), path), 'utf8');

describe('scope wiring', () => {
  it('ControlPanel marks the app-wide row from the scope hook', () => {
    const src = source('src/components/settings/ControlPanel.tsx');
    // Reads the scope for THIS book...
    expect(src).toMatch(/contradictsBanner\s*=\s*!useSettingsScope\(bookKey\)/);
    expect(src).toMatch(/contradictsBanner\s*&&\s*'text-error'/);
    expect(src).toContain('MdOutlinePublic');
    // Decorative icon plus a text equivalent. A NAMED icon would join the
    // switch's own accessible name, and the name it carried was that of the ⋮
    // item which really changes the scope.
    expect(src, 'the globe must stay decorative').toMatch(/<MdOutlinePublic\s+aria-hidden='true'/);
    // Inline-block, not a flex child: SettingLabel clamps with -webkit-box, and
    // a flex container inside that clamp can stop the clamp working.
    expect(src, 'the globe must flow inline inside the clamp').toMatch(
      /'me-1\.5 inline-block h-4 w-4/,
    );
    expect(src, 'the app-wide fact must not rest on colour alone').toMatch(
      /className='sr-only'>\{_\('Applies to all books'\)\}/,
    );
  });

  it('the banner carries the classes the e-ink test measures', () => {
    // `scope-banner-eink.browser.test.tsx` proves what `eink-bordered` does to
    // a tinted, thick-edged surface. It measures literal classes, so this pins
    // that the banner is really built from them — the two together are the
    // whole claim.
    const src = source('src/components/settings/SettingsScopeBanner.tsx');
    expect(src, 'eink-bordered is what flattens the tint on e-ink').toContain('eink-bordered');
    expect(src, 'the saturated inline-start bar').toContain('border-s-4');
    expect(src).toMatch(/border-info bg-info\/15/);
    expect(src).toMatch(/border-warning bg-warning\/10/);
  });

  it('SettingsDialog renders the banner on every panel, for this book', () => {
    const src = source('src/components/settings/SettingsDialog.tsx');
    expect(src).toContain('<SettingsScopeBanner');
    // Without the bookKey the banner would read global for every book.
    // A generous window: props get reordered and reflowed by the formatter.
    expect(src, 'restore the bookKey prop, or widen this window').toMatch(
      /<SettingsScopeBanner[\s\S]{0,400}?bookKey=\{bookKey\}/,
    );
  });

  it('loadSettings runs the migration, not just defines it', () => {
    const src = source('src/services/settingsService.ts');
    expect(src).toContain('export function migrateScopeFlagOutOfGlobals');
    // The call, inside loadSettings, after the merge that would restore the key.
    expect(src).toMatch(/migrateScopeFlagOutOfGlobals\(settings\);/);
    const merge = src.indexOf('...settings.globalViewSettings,');
    const call = src.indexOf('migrateScopeFlagOutOfGlobals(settings);');
    // Without these, a drifted literal makes `merge` -1 and the ordering check
    // passes for any call, including one placed BEFORE the merge.
    expect(merge, 'the load merge moved; update this anchor').toBeGreaterThan(-1);
    expect(call, 'the migration call moved; update this anchor').toBeGreaterThan(-1);
    expect(call, 'the migration must run AFTER the merge, or the key comes back').toBeGreaterThan(
      merge,
    );
  });

  it('the Settings Menu resolves and clears through the helpers', () => {
    const src = source('src/components/settings/DialogMenu.tsx');
    // Reads the scope through the shared resolver, not `?? true`, or the menu
    // and the banner could disagree.
    expect(src).toMatch(/isSettingsScopeGlobal\(\s*bookKey,\s*viewSettings,\s*settings,?\s*\)/);
    // Stores through `scopeFlagToStore`, so choosing the preference's own value
    // CLEARS the flag. Writing it every time made "never chose" a one-way door.
    // The SAME preference as the resolve above. Given different generations
    // they cancel whenever they differ: half the state table then gives the
    // opposite of what the reader clicked, and one path drops a stored flag.
    expect(src, 'resolve and clear must read one preference').toMatch(
      /scopeFlagToStore\(\s*!isSettingsGlobal,\s*preferredScopeGlobal\(settings\),?\s*\)/,
    );
    expect(src).not.toMatch(/'isGlobal',\s*!isSettingsGlobal/);
  });

  it('the preference is written on close, not on the click', () => {
    // If it were written at once, the scope would move under an open dialog
    // whose panels had already seeded from the other store. Deferring the WRITE
    // keeps the banner, the Settings Menu and every save path in agreement,
    // and makes the row's "next time you open Settings" promise true.
    const dialog = source('src/components/settings/SettingsDialog.tsx');
    // The dialog owns it — ControlPanel unmounts on every tab switch.
    expect(dialog).toMatch(/const \[pendingBookScope, setPendingBookScope\] = useState\(/);
    // The write itself lives in one guarded helper, called from the cleanup and
    // from pagehide — React does not run cleanups when the webview is torn down,
    // so quitting with the dialog open would drop the toggle silently.
    expect(dialog, 'the preference must be written from a commit helper').toMatch(
      /const commit = \(\) => \{[\s\S]{0,320}?saveSysSettings\(\s*envConfig,\s*'openSettingsInBookScope'/,
    );
    expect(dialog, 'the cleanup must still commit').toMatch(
      /return \(\) => \{[\s\S]{0,200}?commit\(\);/,
    );
    // Nothing is written unless the reader moved the switch. Without this, a
    // dialog opened before settings finished loading would commit its `?? false`
    // placeholder over a stored `true` and turn the preference off.
    expect(dialog, 'an untouched switch must never be committed').toMatch(
      /if \(!touchedRef\.current\) return;/,
    );
    expect(dialog, 'a webview teardown would drop the toggle').toMatch(
      /addEventListener\('pagehide', commit\)/,
    );

    // And the panel must not write it itself.
    const panel = source('src/components/settings/ControlPanel.tsx');
    expect(panel).not.toMatch(/saveSysSettings\([^)]*openSettingsInBookScope/);
    expect(panel).toContain('onOpenSettingsInBookScopeChange');
  });

  it('the panel map is exhaustive, so a new panel cannot default to wrong', () => {
    const src = source('src/components/settings/SettingsDialog.tsx');
    // A Record keyed by the union, not an array: the compiler then refuses a
    // new SettingsPanelType until this file says which kind it is. An allowlist
    // would silently default a new panel to "Always Global Settings".
    expect(src, 'PANEL_SCOPE must stay a Record for exhaustiveness').toMatch(
      /const PANEL_SCOPE: Record<SettingsPanelType, 'scoped' \| 'always-global'>/,
    );
    expect(src).toMatch(/alwaysGlobal=\{PANEL_SCOPE\[activePanel\] === 'always-global'\}/);
  });

  it('the Behavior tab is governed by the scope', () => {
    // Marking it 'always-global' would give a tab with ten-plus per-book rows
    // the "Always Global Settings" banner.
    const src = source('src/components/settings/SettingsDialog.tsx');
    const map = src.slice(
      src.indexOf('const PANEL_SCOPE'),
      src.indexOf('};', src.indexOf('const PANEL_SCOPE')),
    );
    expect(map.length, 'PANEL_SCOPE moved or was renamed').toBeGreaterThan(100);
    for (const panel of ['Font', 'Layout', 'Theme', 'Control', 'TTS', 'Language', 'Custom']) {
      expect(map, `${panel} must stay scoped`).toMatch(new RegExp(`${panel}: 'scoped'`));
    }
    for (const panel of ['AI', 'Integrations']) {
      expect(map, `${panel} has no per-book form`).toMatch(new RegExp(`${panel}: 'always-global'`));
    }
  });
});
