/**
 * `useEditedViewSettings` is the seam every settings panel now reads from.
 *
 * A panel used to seed its controls from the open book's effective values in
 * BOTH scopes. In global scope that made the panel lie: it showed the book's
 * values, and because most save effects run on mount, opening the panel copied
 * the book's overrides into the global defaults — which then reached every
 * other book. That is the "per-book settings are carrying between books" report.
 *
 * The rule the hook exists to hold: `edited` follows the scope, `book` never
 * does. Seed and guard from `edited`; read `book` only for what describes the
 * book being rendered.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => ({
  settings: undefined as unknown,
  bookViewSettings: undefined as unknown,
}));

vi.mock('@/store/settingsStore', () => ({
  useSettingsStore: () => ({ settings: state.settings }),
}));
vi.mock('@/store/readerStore', () => ({
  useReaderStore: () => ({ getViewSettings: () => state.bookViewSettings }),
}));

import { useEditedViewSettings } from '@/hooks/useEditedViewSettings';
import type { ViewSettings } from '@/types/book';

const GLOBAL = { defaultFont: 'Bookerly' } as unknown as ViewSettings;

describe('useEditedViewSettings', () => {
  beforeEach(() => {
    state.settings = { globalViewSettings: GLOBAL };
    state.bookViewSettings = undefined;
  });

  it('edits the global defaults when the book is in global scope', () => {
    state.bookViewSettings = { isGlobal: true, defaultFont: 'Literata' };

    const { edited, book, isGlobal } = useEditedViewSettings('book-1');

    expect(isGlobal).toBe(true);
    // The control must show 'Bookerly', not the book's 'Literata'. Seeding
    // from the book here is what leaked overrides into the global defaults.
    expect(edited.defaultFont).toBe('Bookerly');
    // `book` still reports the book, for structural reads.
    expect(book.defaultFont).toBe('Literata');
  });

  it('edits the book when the book is in book scope', () => {
    state.bookViewSettings = { isGlobal: false, defaultFont: 'Literata' };

    const { edited, isGlobal } = useEditedViewSettings('book-1');

    expect(isGlobal).toBe(false);
    expect(edited.defaultFont).toBe('Literata');
  });

  it('is global in the library, where there is no book', () => {
    const { edited, isGlobal } = useEditedViewSettings('');

    expect(isGlobal).toBe(true);
    expect(edited.defaultFont).toBe('Bookerly');
  });

  it('survives the first renders, before the settings store is populated', () => {
    // The store starts as `{} as SystemSettings`. The reader's header bar reads
    // this hook during those renders, so it must not throw.
    state.settings = {};
    expect(() => useEditedViewSettings('book-1')).not.toThrow();
    state.settings = undefined;
    expect(() => useEditedViewSettings('book-1')).not.toThrow();
  });
});
