import React, { createContext, useContext } from 'react';
import { ViewSettings } from '@/types/book';
import { useEnv } from '@/context/EnvContext';
import { useReaderStore } from '@/store/readerStore';
import { useBookDataStore } from '@/store/bookDataStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTranslation } from '@/hooks/useTranslation';
import { saveViewSettings } from '@/helpers/settings';
import { isSameViewSettingValue } from '@/utils/serializer';
import OverrideBadge from './OverrideBadge';

/**
 * Which of the two stores a settings panel writes to (#5632).
 *
 * `viewSettings.isGlobal` has always decided this, but it lived behind one
 * checkmark in the overflow menu, so a font picked while a book was open
 * silently became a per-book override that the reader could neither see nor
 * find later. This context surfaces the flag: `<SettingsScopeBanner>` states
 * the active scope in the dialog header, and `useScopedLabel` marks the
 * individual settings this book overrides.
 *
 * Effective view settings are `{ ...globalViewSettings, ...perBookOverrides }`,
 * and `serializeConfig` persists only the keys that differ from global. So a
 * per-book value that differs from the global one IS the override, and writing
 * the global value back drops the key from `book_configs` — real inheritance,
 * not a pinned copy. That is why the reset action needs no separate unset path.
 */
export interface SettingsScope {
  /** False in the library context: with no book there is nothing to scope to. */
  canScopeToBook: boolean;
  /** True when the panels write the global defaults instead of book overrides. */
  isGlobal: boolean;
  /** Title of the scoped book, for the banner. Empty in the library context. */
  bookTitle: string;
  /** Switch the scope. No-op in the library context. */
  setGlobal: (global: boolean) => void;
  /** True when this book stores a value that differs from the global default. */
  isOverridden: <K extends keyof ViewSettings>(key: K) => boolean;
  getGlobalValue: <K extends keyof ViewSettings>(key: K) => ViewSettings[K];
}

const SettingsScopeContext = createContext<SettingsScope | null>(null);

export const SettingsScopeProvider: React.FC<{ bookKey: string; children: React.ReactNode }> = ({
  bookKey,
  children,
}) => {
  const { envConfig } = useEnv();
  const { settings } = useSettingsStore();
  const { getViewSettings } = useReaderStore();
  const { getBookData } = useBookDataStore();

  const viewSettings = getViewSettings(bookKey);
  const globalViewSettings = settings?.globalViewSettings;
  const canScopeToBook = !!bookKey;
  const isGlobal = !canScopeToBook || (viewSettings?.isGlobal ?? true);

  const scope: SettingsScope = {
    canScopeToBook,
    isGlobal,
    bookTitle: getBookData(bookKey)?.book?.title ?? '',
    setGlobal: (global) => {
      if (!canScopeToBook || global === isGlobal) return;
      // skipGlobal, so the flag itself is always stored on the book.
      saveViewSettings(envConfig, bookKey, 'isGlobal', global, true, false);
    },
    // Deliberately NOT gated on `isGlobal`. The scope flag only governs where
    // THIS dialog writes; the View menu and Book menu write per-book always
    // (15 keys pass `skipGlobal`), so a book can hold its own value while the
    // banner reads "Global". Gating here would hide exactly those, which is
    // the case that misleads readers. `viewSettings` is null in the library,
    // where there is no book to override anything.
    //
    // Compare by value, exactly like serializeConfig does — an array or object
    // setting is a fresh reference on every read and would otherwise always
    // report as overridden.
    isOverridden: (key) =>
      !!viewSettings &&
      !!globalViewSettings &&
      // The comparison target is the RESOLVED global — whatever the reader has
      // set globally — not the factory default. Those differ once anything is
      // changed globally, and only the resolved value is what this book would
      // inherit. `key in` guards a key the global side has never held: with
      // nothing to fall back to there is no override to report, and resetting
      // would write `undefined`.
      key in globalViewSettings &&
      !isSameViewSettingValue(viewSettings[key], globalViewSettings[key]),
    getGlobalValue: (key) => globalViewSettings?.[key],
  };

  return <SettingsScopeContext.Provider value={scope}>{children}</SettingsScopeContext.Provider>;
};

export const useSettingsScope = () => useContext(SettingsScopeContext);

/**
 * Returns a decorator for settings-row labels. Wrap a label with it to get the
 * "overridden for this book" badge plus its reset-to-global button:
 *
 * ```tsx
 * <SettingsRow label={scopedLabel(_('Serif Font'), 'serifFont', setSerifFont)}>
 * ```
 *
 * `onReset` is the same state setter the control itself uses, so resetting
 * flows through the panel's existing save effect — nothing new to keep in sync.
 * The label passes through untouched for settings that match global, so callers
 * can decorate unconditionally.
 *
 * The badge shows in BOTH scopes: it answers "does this book have its own
 * value", which is true regardless of where the dialog currently writes.
 *
 * Do NOT decorate settings that have no meaningful global counterpart — the
 * `isGlobal` flag itself, and anything saved with `skipGlobal` (`writingMode`,
 * `referencePageCount`). They are per-book by design and would always read as
 * overridden. Tag those with `useScopeTags().alwaysBook` instead.
 *
 * For the rows this banner does NOT govern, use `useScopeTags` from
 * `./ScopeTag` instead. Those tags are static and store-free by design, so a
 * leaf component can mark a row without importing the settings stores.
 */
export const useScopedLabel = () => {
  const _ = useTranslation();
  const scope = useSettingsScope();

  const scopedLabel = <K extends keyof ViewSettings>(
    label: React.ReactNode,
    key: K,
    onReset: (value: ViewSettings[K]) => void,
  ): React.ReactNode => {
    if (!scope?.isOverridden(key)) return label;
    // A fragment, not a wrapper element: labels render inside `<SettingLabel>`,
    // whose `line-clamp-2` makes a `-webkit-box`. Keeping the badge inline-level
    // lets it share the label's anonymous block instead of stacking under it.
    return (
      <>
        {label}
        <OverrideBadge
          title={_('This book has its own value — reset it to your global setting')}
          onReset={() => onReset(scope.getGlobalValue(key))}
        />
      </>
    );
  };

  return scopedLabel;
};
