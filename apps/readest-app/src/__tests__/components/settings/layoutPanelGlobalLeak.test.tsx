import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

/**
 * Opening Settings while the scope is "Global" must not promote the open
 * book's own values into the global defaults.
 *
 * LayoutPanel seeds every control from `getViewSettings(bookKey)` — the book's
 * effective values — and 19 of its save effects run on mount with no equality
 * guard. `saveViewSettings` does not guard the global path either: it assigns
 * `globalViewSettings[key] = value` unconditionally, then replays the result
 * onto every open book.
 *
 * So a book holding lineHeight 2.4 while global holds 1.6 used to rewrite the
 * global to 2.4 the moment the Layout tab was opened in global scope, and that
 * value then reached every other book. That is the mechanism behind "per book
 * settings are carrying between individual books".
 */

const saveViewSettings = vi.fn();

const GLOBAL = {
  paragraphMargin: 1,
  lineHeight: 1.6,
  wordSpacing: 0,
  letterSpacing: 0,
  textIndent: 0,
  fullJustification: true,
  hyphenation: true,
  marginTopPx: 44,
  marginBottomPx: 44,
  marginLeftPx: 16,
  marginRightPx: 16,
  compactMarginTopPx: 16,
  compactMarginBottomPx: 16,
  compactMarginLeftPx: 16,
  compactMarginRightPx: 16,
  gapPercent: 5,
  maxColumnCount: 2,
  maxInlineSize: 720,
  maxBlockSize: 1440,
  writingMode: 'auto',
  overrideLayout: false,
  useBookLayout: false,
  doubleBorder: false,
  borderColor: 'red',
  showHeader: true,
  showFooter: true,
  showRemainingTime: false,
  showRemainingPages: false,
  showProgressInfo: true,
  showStickyProgressBar: false,
  showCurrentTime: false,
  use24HourClock: false,
  showCurrentBatteryStatus: false,
  showBatteryPercentage: false,
  progressStyle: 'percentage',
  referencePageCount: 0,
  screenOrientation: 'auto',
  vertical: false,
  scrolled: false,
};

// Scope is global, and the book overrides exactly one setting.
const BOOK = { ...GLOBAL, lineHeight: 2.4, isGlobal: true };

vi.mock('@/context/EnvContext', () => ({
  useEnv: () => ({ envConfig: {}, appService: { hasOrientationLock: false, isMobileApp: false } }),
}));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => (s: string) => s }));
vi.mock('@/hooks/useResetSettings', () => ({ useResetViewSettings: () => vi.fn() }));
vi.mock('@/store/readerStore', () => ({
  useReaderStore: () => ({
    getView: () => null,
    getViewSettings: () => BOOK,
    getGridInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    setViewSettings: vi.fn(),
    recreateViewer: vi.fn(),
  }),
}));
vi.mock('@/store/bookDataStore', () => ({ useBookDataStore: () => ({ getBookData: () => null }) }));
vi.mock('@/store/settingsStore', () => ({
  useSettingsStore: () => ({ settings: { globalViewSettings: GLOBAL } }),
}));
vi.mock('@/helpers/settings', () => ({ saveViewSettings }));
vi.mock('@/utils/bridge', () => ({ lockScreenOrientation: vi.fn() }));

const LayoutPanel = (await import('@/components/settings/LayoutPanel')).default;

beforeEach(() => saveViewSettings.mockClear());
afterEach(cleanup);

const writtenValueFor = (key: string) =>
  saveViewSettings.mock.calls.filter((c) => c[2] === key).map((c) => c[3]);

describe('opening the Layout panel in global scope', () => {
  it('never writes the book’s own value into the global defaults', () => {
    render(<LayoutPanel bookKey='book-1' onRegisterReset={vi.fn()} />);

    // Mount-time writes are unavoidable here (19 unguarded effects), but every
    // one must carry the GLOBAL value, never the book's override.
    expect(writtenValueFor('lineHeight')).not.toContain(BOOK.lineHeight);
  });

  it('leaves inherited settings agreeing with global', () => {
    render(<LayoutPanel bookKey='book-1' onRegisterReset={vi.fn()} />);

    for (const v of writtenValueFor('paragraphMargin')) {
      expect(v).toBe(GLOBAL.paragraphMargin);
    }
  });
});
