/**
 * Which of the two settings stores the Settings dialog edits.
 *
 * `isGlobal` used to live in `globalViewSettings`, and a book's config stores
 * only the keys that differ from it. The global value was `true`, so a book
 * deliberately set to global stored NOTHING — byte-identical on disk to a book
 * that had never been scoped at all. The two states were indistinguishable, so
 * a preference could not be applied to one without also moving the other.
 *
 * The flag is now per-book only, which makes three states distinct:
 *
 *   stored `false`  — the reader chose this book
 *   stored `true`   — the reader chose global
 *   not stored      — the reader never chose, so follow the preference
 */
import { describe, test, expect } from 'vitest';

import { isSettingsScopeGlobal, scopeFlagToStore } from '@/helpers/settings';
import { getDefaultViewSettings, migrateScopeFlagOutOfGlobals } from '@/services/settingsService';
import { deserializeConfig, serializeConfig } from '@/utils/serializer';
import type { BookConfig, ViewSettings } from '@/types/book';
import type { SystemSettings } from '@/types/settings';

const vs = (isGlobal?: boolean) =>
  ({ ...(isGlobal === undefined ? {} : { isGlobal }) }) as ViewSettings;
const prefs = (openSettingsInBookScope: boolean) => ({ openSettingsInBookScope }) as SystemSettings;

describe('isSettingsScopeGlobal', () => {
  test('the library is always global — there is no book to scope to', () => {
    expect(isSettingsScopeGlobal('', undefined, prefs(true))).toBe(true);
  });

  test('a book the reader scoped to itself stays scoped to itself', () => {
    expect(isSettingsScopeGlobal('book-1', vs(false), prefs(false))).toBe(false);
    // Even with the preference off, an explicit choice wins.
    expect(isSettingsScopeGlobal('book-1', vs(false), prefs(true))).toBe(false);
  });

  test('a book the reader scoped to global stays global', () => {
    // This is the case that was previously unrepresentable.
    expect(isSettingsScopeGlobal('book-1', vs(true), prefs(true))).toBe(true);
  });

  test('a book that never chose follows the preference', () => {
    expect(isSettingsScopeGlobal('book-1', vs(undefined), prefs(false))).toBe(true);
    expect(isSettingsScopeGlobal('book-1', vs(undefined), prefs(true))).toBe(false);
  });

  test('a non-boolean flag means "never chose"', () => {
    // The old code read `?? true`, which treated null as absent. A bare
    // `!== undefined` would return the null itself — falsy — and silently move
    // a book with a hand-edited or foreign-written config into book scope.
    const settings = prefs(false); // default is global
    for (const junk of [null, 0, 1, 'true', {}]) {
      const vsJunk = { isGlobal: junk } as unknown as ViewSettings;
      expect(isSettingsScopeGlobal('book-1', vsJunk, settings), String(junk)).toBe(true);
    }
    // And a real boolean is still honoured.
    expect(isSettingsScopeGlobal('book-1', vs(false), settings)).toBe(false);
  });

  test('a book whose view is reloading resolves to global, not to the book', () => {
    // `initViewState` sets `viewSettings: null` and holds it there for the whole
    // document load — seconds, not milliseconds. Seven rows inside the open
    // dialog recreate the viewer: Allow Scripts, Writing Mode, and five
    // language rows.
    //
    // Book scope during that window loses the write outright: `applyViewSettings`
    // guards on `viewSettings` and returns, so nothing is stored and nothing is
    // applied. The global branch always saves. Upstream's `?? true` had this
    // property; the preference must not take it away.
    expect(isSettingsScopeGlobal('book-1', null, prefs(true))).toBe(true);
    expect(isSettingsScopeGlobal('book-1', undefined, prefs(true))).toBe(true);
  });

  test('defaults to global when the settings store has not loaded yet', () => {
    // The store starts as `{} as SystemSettings`; the dialog can render first.
    expect(isSettingsScopeGlobal('book-1', vs(undefined), undefined)).toBe(true);
    expect(isSettingsScopeGlobal('book-1', undefined, {} as SystemSettings)).toBe(true);
  });
});

describe('migrateScopeFlagOutOfGlobals', () => {
  /**
   * Installs that predate the per-book change have `isGlobal: true` saved in
   * `settings.json`. The load merge puts saved values last, so without this the
   * key comes straight back and every unscoped book reads as an explicit
   * "chose global" — which no preference could then move.
   */
  test('drops the flag that older installs have saved', () => {
    const settings = {
      globalViewSettings: { isGlobal: true, serifFont: 'Bitter' },
    } as unknown as SystemSettings;

    migrateScopeFlagOutOfGlobals(settings);

    expect('isGlobal' in settings.globalViewSettings).toBe(false);
    // Nothing else is touched.
    expect(settings.globalViewSettings.serifFont).toBe('Bitter');
  });

  test('is a no-op on settings that never had it', () => {
    const settings = { globalViewSettings: { serifFont: 'Bitter' } } as unknown as SystemSettings;
    expect(() => migrateScopeFlagOutOfGlobals(settings)).not.toThrow();
    expect(settings.globalViewSettings.serifFont).toBe('Bitter');
  });

  test('tolerates settings loaded before globalViewSettings exists', () => {
    expect(() => migrateScopeFlagOutOfGlobals({} as SystemSettings)).not.toThrow();
  });
});

describe('scopeFlagToStore', () => {
  /**
   * The ⋮ menu used to write an explicit flag every time. After one click a
   * book always had a stored value, so `isSettingsScopeGlobal` never reached
   * the preference again — for that book, the preference was dead. The "never
   * chose" state was a one-way door with no way back.
   *
   * The flag is now stored only while it DIFFERS from the reader's default,
   * which is the same rule `serializeConfig` applies to every other per-book
   * value. Choosing the default clears the flag and the book follows along.
   */
  test('stores nothing when the choice matches the default', () => {
    // Preference off: the default is global. Choosing global stores nothing.
    expect(scopeFlagToStore(true, true)).toBeUndefined();
    // Preference on: the default is the book. Choosing the book stores nothing.
    expect(scopeFlagToStore(false, false)).toBeUndefined();
  });

  test('stores the flag when the choice disagrees with the default', () => {
    expect(scopeFlagToStore(false, true)).toBe(false);
    expect(scopeFlagToStore(true, false)).toBe(true);
  });

  test('a book returns to following the default', () => {
    const settings = prefs(true); // default is book scope
    // The reader pins this book to global. That disagrees, so it is stored.
    const pinned = scopeFlagToStore(true, false);
    expect(pinned).toBe(true);
    expect(isSettingsScopeGlobal('book-1', vs(pinned), settings)).toBe(true);

    // The reader toggles back. That matches the default, so the flag clears.
    const cleared = scopeFlagToStore(false, false);
    expect(cleared).toBeUndefined();
    expect(isSettingsScopeGlobal('book-1', vs(cleared), settings)).toBe(false);
  });

  test('every ⋮ click gives the reader the scope they asked for', () => {
    // The full table of stored flag x preference. Each row: what the book reads
    // now, what one ⋮ click stores, and what it reads after. A click must
    // always land on the opposite of what it read — that is what the item says
    // it does. This failed for half the table while the resolve and the write
    // used different generations of the preference.
    const rows: Array<[boolean | undefined, boolean]> = [
      [undefined, false],
      [undefined, true],
      [false, false],
      [false, true],
      [true, false],
      [true, true],
    ];
    for (const [stored, preferBookScope] of rows) {
      const settings = prefs(preferBookScope);
      const before = isSettingsScopeGlobal('book-1', vs(stored), settings);
      const next = scopeFlagToStore(!before, !preferBookScope);
      const after = isSettingsScopeGlobal('book-1', vs(next), settings);
      expect(after, `stored=${stored} preference=${preferBookScope}`).toBe(!before);
    }
  });

  test('a default of global behaves like an unset preference', () => {
    // No preference reads as off, so global is the default.
    expect(scopeFlagToStore(true, true)).toBeUndefined();
    expect(scopeFlagToStore(false, true)).toBe(false);
  });
});

describe('clearing the flag on disk', () => {
  /**
   * `scopeFlagToStore` returning `undefined` is only useful if `undefined`
   * actually removes the key from the book's config. It does, by a shorter
   * route than the diff loop: `serializeConfig` starts with
   * `JSON.parse(JSON.stringify(config))`, and `JSON.stringify` omits a property
   * whose value is `undefined`. The key is gone before any comparison runs.
   *
   * The two tests below it — the stored `false` and the stored `true` — are the
   * ones that fail if `isGlobal` is ever put back into the global defaults,
   * because they build their global from the real `getDefaultViewSettings`.
   * That is the regression that would collapse the third state.
   */
  // The REAL defaults, not a hand-built object. That is the whole point: this
  // suite must fail if `isGlobal` ever returns to `getDefaultViewSettings`,
  // because that is what collapsed "chose global" into "never chose".
  const globalViewSettings = getDefaultViewSettings({
    fs: {} as never,
    isMobile: false,
    isEink: false,
    isAppDataSandbox: false,
  });
  const searchDefaults = {} as never;

  test('a cleared flag is not written to the book config', () => {
    const config = {
      viewSettings: { isGlobal: undefined, serifFont: 'Literata' },
    } as unknown as BookConfig;

    const stored = JSON.parse(serializeConfig(config, globalViewSettings, searchDefaults));

    expect('isGlobal' in stored.viewSettings).toBe(false);
    // A genuine override is untouched.
    expect(stored.viewSettings.serifFont).toBe('Literata');
  });

  test('a flag that disagrees with the default IS written', () => {
    const config = { viewSettings: { isGlobal: false } } as unknown as BookConfig;
    const stored = JSON.parse(serializeConfig(config, globalViewSettings, searchDefaults));
    expect(stored.viewSettings.isGlobal).toBe(false);
  });

  test('an explicit `true` is written too', () => {
    // "The reader chose global" is a state that could not be stored before, so
    // it is the one most worth pinning. It only survives because
    // `globalViewSettings` no longer carries `isGlobal`: while it held `true`,
    // serializeConfig dropped a matching `true` from every book.
    const config = { viewSettings: { isGlobal: true } } as unknown as BookConfig;
    const stored = JSON.parse(serializeConfig(config, globalViewSettings, searchDefaults));
    expect(stored.viewSettings.isGlobal).toBe(true);
  });

  test('a book with no stored flag follows the preference after a reload', () => {
    const reloaded = deserializeConfig(
      JSON.stringify({ viewSettings: {} }),
      globalViewSettings,
      searchDefaults,
    );
    expect(reloaded.viewSettings!.isGlobal).toBeUndefined();
    expect(
      isSettingsScopeGlobal('book-1', reloaded.viewSettings as ViewSettings, prefs(true)),
    ).toBe(false);
  });
});
