import { ViewSettings } from '@/types/book';
import { useReaderStore } from '@/store/readerStore';
import { useSettingsStore } from '@/store/settingsStore';

/**
 * The two view-setting objects a settings panel needs, kept apart on purpose.
 *
 * A panel used to seed every control from the open book's effective values in
 * both scopes. That made the Global scope lie twice over: it showed the book's
 * values under a banner promising the global ones, and — because most save
 * effects run unguarded on mount and `saveViewSettings` does not guard the
 * global path — merely opening the panel copied the book's overrides into the
 * global defaults, which then replayed onto every other open book. That is the
 * "per book settings are carrying between individual books" report.
 *
 *  - `edited` is what the controls show and write. It follows the scope: the
 *    global defaults in global scope, the book's effective values in book
 *    scope. Seed control state from this, and compare against it in the
 *    on-mount equality guards, so a mount can never write across scopes.
 *  - `book` is the open book's effective values, for structural reads only —
 *    writing mode, vertical, grid insets, the legacy margin fields. Those
 *    describe the book being rendered, not the values being edited.
 */
export const useEditedViewSettings = (bookKey: string) => {
  const { settings } = useSettingsStore();
  const { getViewSettings } = useReaderStore();

  const bookViewSettings = getViewSettings(bookKey);
  // The settings store starts as `{} as SystemSettings` and is populated
  // asynchronously, so every read here is optional. Callers run during those
  // first renders — the reader's header bar among them.
  const globalViewSettings = settings?.globalViewSettings;
  // No book means the library, where every write is global by definition.
  const isGlobal = !bookKey || (bookViewSettings?.isGlobal ?? true);
  const book: ViewSettings = bookViewSettings || globalViewSettings;

  return {
    edited: isGlobal ? globalViewSettings : book,
    book,
    isGlobal,
  };
};
