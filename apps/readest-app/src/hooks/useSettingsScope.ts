import { useReaderStore } from '@/store/readerStore';
import { useSettingsStore } from '@/store/settingsStore';
import { isSettingsScopeGlobal } from '@/helpers/settings';

/**
 * Which of the two stores the settings panels are writing, for one book.
 *
 * `viewSettings.isGlobal` has always decided this, but it lived behind one
 * checkmark in the Settings Menu, so a font picked while a book was open
 * silently became a per-book value the reader could neither see nor find.
 * `<SettingsScopeBanner>` states it in words; this is what it reads.
 *
 * Read-only: the Settings Menu checkmark remains the way to change the flag.
 *
 * Subscribes to the whole reader store rather than selecting the view-settings
 * object: `applyViewSettings` mutates that object in place and hands the same
 * reference back, so a selector RETURNING IT would miss a scope change. Other
 * call sites do replace the object, so the identity is not stable in general —
 * it is the scope write specifically that a selector would miss. A selector returning the primitive `...?.isGlobal` would fire, and
 * would narrow this correctly — the ban is on selecting the object, not on
 * selectors.
 */
export const useSettingsScope = (bookKey: string): boolean => {
  const { settings } = useSettingsStore();
  const { getViewSettings } = useReaderStore();
  return isSettingsScopeGlobal(bookKey, getViewSettings(bookKey), settings);
};
