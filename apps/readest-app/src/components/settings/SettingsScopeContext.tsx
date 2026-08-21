import React, { createContext, useContext } from 'react';
import { useEnv } from '@/context/EnvContext';
import { useBookDataStore } from '@/store/bookDataStore';
import { useReaderStore } from '@/store/readerStore';
import { saveViewSettings } from '@/helpers/settings';

/**
 * Which of the two stores the settings panels are writing.
 *
 * `viewSettings.isGlobal` has always decided this, but it lived behind one
 * checkmark in the overflow menu, so a font picked while a book was open
 * silently became a per-book value the reader could neither see nor find.
 * `<SettingsScopeBanner>` states it in words and carries the switch; this
 * context is what it reads.
 */
export interface SettingsScope {
  /** False in the library, where there is no book to scope to. */
  canScopeToBook: boolean;
  /** True when the panels show and write the global defaults. */
  isGlobal: boolean;
  /** Title of the scoped book, for the banner. Empty in the library. */
  bookTitle: string;
  /** Switch the scope. No-op in the library. */
  setGlobal: (global: boolean) => void;
}

const SettingsScopeContext = createContext<SettingsScope | null>(null);

export const SettingsScopeProvider: React.FC<{ bookKey: string; children: React.ReactNode }> = ({
  bookKey,
  children,
}) => {
  const { envConfig } = useEnv();
  const { getBookData } = useBookDataStore();
  const { getViewSettings } = useReaderStore();
  const canScopeToBook = !!bookKey;
  // No book means the library, where every write is global by definition.
  // Subscribe to the whole store, not a selector: `applyViewSettings` mutates
  // the view-settings object in place and it keeps its identity for the life of
  // the view, so a selector on it would never fire.
  const isGlobal = !canScopeToBook || (getViewSettings(bookKey)?.isGlobal ?? true);

  const scope: SettingsScope = {
    canScopeToBook,
    isGlobal,
    bookTitle: getBookData(bookKey)?.book?.title ?? '',
    setGlobal: (global) => {
      if (!canScopeToBook || global === isGlobal) return;
      // skipGlobal, so the flag itself is always stored on the book.
      saveViewSettings(envConfig, bookKey, 'isGlobal', global, true, false);
    },
  };

  return <SettingsScopeContext.Provider value={scope}>{children}</SettingsScopeContext.Provider>;
};

export const useSettingsScope = () => useContext(SettingsScopeContext);
