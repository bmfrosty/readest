import { ViewSettings } from '@/types/book';
import { SystemSettings } from '@/types/settings';
import { EnvConfigType } from '@/services/environment';
import { useBookDataStore } from '@/store/bookDataStore';
import { useReaderStore } from '@/store/readerStore';
import { useSettingsStore } from '@/store/settingsStore';
import { getStyles } from '@/utils/style';

/**
 * Resolve the effective background texture for the library page (issue #4743).
 * The library texture is stored separately from the reader's, but each field
 * falls back to the reader/global value when unset — so the bookshelf inherits
 * the current look until the user explicitly picks a library texture, then
 * decouples per-field. Returns a `ViewSettings` so it can be handed straight to
 * `useBackgroundTexture().applyBackgroundTexture`.
 */
export const getLibraryViewSettings = (settings: SystemSettings): ViewSettings => {
  // globalViewSettings can be absent on the very first renders — the store
  // starts as `{} as SystemSettings` until appService.loadSettings() runs — so
  // every read is optional and falls back to a no-texture default.
  const globalViewSettings = settings.globalViewSettings;
  return {
    ...globalViewSettings,
    backgroundTextureId:
      settings.libraryBackgroundTextureId ?? globalViewSettings?.backgroundTextureId ?? 'none',
    backgroundOpacity:
      settings.libraryBackgroundOpacity ?? globalViewSettings?.backgroundOpacity ?? 0.6,
    backgroundSize: settings.libraryBackgroundSize ?? globalViewSettings?.backgroundSize ?? 'cover',
  };
};

export type BackgroundTextureScope = 'library' | 'reader';

/**
 * Resolve the three background-texture fields for one scope of the Settings →
 * Theme picker (issue #5306). 'library' resolves exactly like the library page
 * (per-field inheritance, see getLibraryViewSettings); 'reader' reads the open
 * book's view settings when provided, else the global defaults.
 */
export const getBackgroundTextureSettings = (
  scope: BackgroundTextureScope,
  settings: SystemSettings,
  readerViewSettings?: ViewSettings,
): Pick<ViewSettings, 'backgroundTextureId' | 'backgroundOpacity' | 'backgroundSize'> => {
  const source =
    scope === 'library'
      ? getLibraryViewSettings(settings)
      : (readerViewSettings ?? settings.globalViewSettings);
  return {
    backgroundTextureId: source?.backgroundTextureId ?? 'none',
    backgroundOpacity: source?.backgroundOpacity ?? 0.6,
    backgroundSize: source?.backgroundSize ?? 'cover',
  };
};

/**
 * What a book resolves to when it has no scope flag of its own: the reader's
 * `openSettingsInBookScope` preference, inverted.
 *
 * Exported so the Settings Menu computes it the same way the resolver does.
 * Two copies of this expression could drift, and a drift is not cosmetic — the
 * menu's clearing rule and the resolver must agree or the pair cancels.
 */
export const preferredScopeGlobal = (settings: SystemSettings | undefined): boolean =>
  // The settings store starts as `{} as SystemSettings` and fills in
  // asynchronously, so an absent preference reads as off.
  !settings?.openSettingsInBookScope;

/**
 * What to store on a book when the reader picks a scope for it.
 *
 * The flag is stored only while it DIFFERS from the reader's default, which is
 * the same rule `serializeConfig` applies to every other per-book value.
 * Choosing the default clears the flag, and the book follows the preference
 * again.
 *
 * Writing an explicit flag every time made the "never chose" state a one-way
 * door: after one click a book always had a stored value, so the preference
 * could never reach it again.
 *
 * `defaultIsGlobal` is what the book would resolve to with no flag of its own.
 * The caller supplies it rather than a settings object so that it cannot be
 * computed from a different generation of the preference than the one the
 * caller used to work out the current scope. Given two, the pair cancels
 * whenever they differ: the clearing branch then returns `undefined` for a key
 * that is already absent, and half the state table gives the reader the
 * opposite of the scope they clicked.
 */
export const scopeFlagToStore = (
  desiredGlobal: boolean,
  defaultIsGlobal: boolean,
): boolean | undefined => (desiredGlobal === defaultIsGlobal ? undefined : desiredGlobal);

/**
 * Which store the Settings dialog edits for a book.
 *
 * Three states, kept apart on purpose:
 *   - `isGlobal` stored `false` — the reader scoped this book to itself
 *   - `isGlobal` stored `true`  — the reader scoped this book to the global
 *   - `isGlobal` absent         — the reader never chose, so follow the
 *                                 `openSettingsInBookScope` preference
 *
 * The third state only exists because `isGlobal` is per-book. While it also had
 * a global value, `serializeConfig` dropped it from every book that matched, so
 * "chose global" and "never chose" collapsed into one.
 */
export const isSettingsScopeGlobal = (
  bookKey: string,
  bookViewSettings: ViewSettings | null | undefined,
  settings: SystemSettings | undefined,
): boolean => {
  // No book means the library, where every write is global by definition.
  if (!bookKey) return true;
  // A view mid-reload has `viewSettings: null` for the whole document load, and
  // `applyViewSettings` returns early on a null object. Resolving to book scope
  // there would send the write to a branch that stores nothing and applies
  // nothing — the reader sees the control move and the change is gone. The
  // global branch always saves, so fall back to it, as `?? true` used to.
  if (!bookViewSettings) return true;
  // `typeof === 'boolean'`, not `!== undefined`. The old code read
  // `?? true`, which treated a null as absent; a bare `!== undefined` would
  // return the null, which is falsy, and silently move a book with a
  // hand-edited or foreign-written config into book scope. Anything that is not
  // a boolean means "the reader never chose".
  const chosen = bookViewSettings.isGlobal;
  if (typeof chosen === 'boolean') return chosen;
  return preferredScopeGlobal(settings);
};

export const saveViewSettings = async <K extends keyof ViewSettings>(
  envConfig: EnvConfigType,
  bookKey: string,
  key: K,
  value: ViewSettings[K],
  skipGlobal = false,
  applyStyles = true,
) => {
  const { settings, setSettings, saveSettings } = useSettingsStore.getState();
  const { bookKeys, getView, getViewState, getViewSettings, setViewSettings } =
    useReaderStore.getState();
  const { getConfig, saveConfig } = useBookDataStore.getState();

  const applyViewSettings = async (bookKey: string) => {
    const viewSettings = getViewSettings(bookKey);
    const viewState = getViewState(bookKey);
    if (bookKey && viewSettings && viewSettings[key] !== value) {
      viewSettings[key] = value;
      setViewSettings(bookKey, viewSettings);
      if (applyStyles) {
        const view = getView(bookKey);
        view?.renderer.setStyles?.(getStyles(viewSettings));
      }
      const config = getConfig(bookKey);
      if (viewState?.isPrimary && config) {
        await saveConfig(envConfig, bookKey, config, settings);
      }
    }
  };

  // `isGlobal` is per-book by definition, so it can never take the global
  // branch. Forced here rather than left to the call site: one dropped argument
  // would write it into globalViewSettings, and serializeConfig would then drop
  // every book's matching stored flag on its next save — silently, and a launch
  // before the migration could clean up.
  const skipGlobalWrite = skipGlobal || key === 'isGlobal';
  const isSettingsGlobal = isSettingsScopeGlobal(bookKey, getViewSettings(bookKey), settings);
  if (isSettingsGlobal && !skipGlobalWrite) {
    // Build a NEW settings object (and a NEW globalViewSettings) so the
    // settingsStore subscriber that gates replica push fires — it compares
    // `state.settings !== prev.settings`, so an in-place mutation followed
    // by setSettings(same_ref) silently bypasses the publish path and
    // whitelisted writes (userStylesheet, userUIStylesheet) only ship
    // on the next unrelated setSettings call.
    const nextSettings: SystemSettings = {
      ...settings,
      globalViewSettings: { ...settings.globalViewSettings, [key]: value },
    };
    setSettings(nextSettings);

    for (const bookKey of bookKeys) {
      await applyViewSettings(bookKey);
    }
    await saveSettings(envConfig, nextSettings);
  } else if (bookKey) {
    await applyViewSettings(bookKey);
  }
};

export const saveSysSettings = async <K extends keyof SystemSettings>(
  envConfig: EnvConfigType,
  key: K,
  value: SystemSettings[K],
) => {
  const { settings, setSettings, saveSettings } = useSettingsStore.getState();
  if (settings[key] !== value) {
    settings[key] = value;
    setSettings(settings);
    await saveSettings(envConfig, settings);
  }
};
