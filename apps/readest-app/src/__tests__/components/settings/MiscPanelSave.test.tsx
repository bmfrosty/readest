/**
 * Settings → Misc, "Custom Content CSS" / "Custom Reader UI CSS", scoped to one
 * book.
 *
 * `applyStyles` used to write the new CSS onto the book's live view-settings
 * object and store it, and only then call `saveViewSettings`. `saveViewSettings`
 * guards its work with `viewSettings[key] !== value`. The value was already
 * there, so the guard was false, and `saveConfig` never ran.
 *
 * Nothing looked wrong: the panel had applied the styles itself and marked the
 * editor saved. The CSS was gone at the next open of the book.
 *
 * This test uses the REAL `saveViewSettings`, because a mocked one cannot show
 * the skip.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';

import MiscPanel from '@/components/settings/MiscPanel';
import type { ViewSettings } from '@/types/book';

const state = vi.hoisted(() => ({
  bookViewSettings: {} as ViewSettings,
  saveConfig: vi.fn(),
}));

vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => (s: string) => s }));
vi.mock('@/context/EnvContext', () => ({
  useEnv: () => ({ appService: null, envConfig: {} }),
}));
vi.mock('@/hooks/useResetSettings', () => ({ useResetViewSettings: () => vi.fn() }));
vi.mock('@/utils/style', () => ({ getStyles: () => '' }));

const stores = vi.hoisted(() => {
  const settingsState = () => ({
    settings: { globalViewSettings: { userStylesheet: '', userUIStylesheet: '' } },
    setSettings: vi.fn(),
    saveSettings: vi.fn(),
    // Applying clears the unapplied-draft flag the scope switch warns on.
    setHasUnappliedDraft: vi.fn(),
  });
  const readerState = () => ({
    bookKeys: ['book-1'],
    getView: () => null,
    getViewState: () => ({ isPrimary: true }),
    getViewSettings: () => state.bookViewSettings,
    setViewSettings: vi.fn(),
  });
  const bookDataState = () => ({
    getConfig: () => ({ viewSettings: state.bookViewSettings }),
    saveConfig: state.saveConfig,
  });
  return {
    settings: Object.assign(() => settingsState(), { getState: settingsState }),
    reader: Object.assign(() => readerState(), { getState: readerState }),
    bookData: Object.assign(() => bookDataState(), { getState: bookDataState }),
  };
});
vi.mock('@/store/settingsStore', () => ({ useSettingsStore: stores.settings }));
vi.mock('@/store/readerStore', () => ({ useReaderStore: stores.reader }));
vi.mock('@/store/bookDataStore', () => ({ useBookDataStore: stores.bookData }));

describe('applying custom CSS to a single book', () => {
  beforeEach(() => {
    state.saveConfig.mockReset();
    // `isGlobal: false` — the book carries its own settings, so this write must
    // reach the book's config file and nothing else.
    state.bookViewSettings = {
      isGlobal: false,
      userStylesheet: '',
      userUIStylesheet: '',
    } as unknown as ViewSettings;
  });
  afterEach(cleanup);

  it('writes the book config', async () => {
    render(<MiscPanel bookKey='book-1' onRegisterReset={vi.fn()} />);

    const textarea = screen.getByPlaceholderText('Enter CSS for book content styling...');
    fireEvent.change(textarea, { target: { value: 'p { color: red; }' } });
    fireEvent.click(screen.getAllByText('Apply')[0]!);
    await vi.waitFor(() => expect(state.saveConfig).toHaveBeenCalledTimes(1));

    // saveViewSettings, not the panel, is what put the value on the live
    // object — and it is the same call that wrote the config.
    expect(state.bookViewSettings.userStylesheet).toContain('color: red');
  });
});
