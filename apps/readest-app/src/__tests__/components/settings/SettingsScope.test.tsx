import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

/**
 * Settings panels write either the global defaults or the open book's own
 * values. `viewSettings.isGlobal` decides which, but it lived behind one
 * checkmark in the overflow menu, so a font picked while a book was open
 * silently became that book's own value with nothing on screen to say so.
 *
 * Two affordances close that: the scope banner in the dialog header, and a
 * badge on every row whose value belongs to the book.
 *
 * The badge is deliberately NOT gated on `isGlobal`. The View menu and Book
 * menu write per-book unconditionally (15 keys pass `skipGlobal`), so a book
 * can hold its own value while the banner reads "Global" — the case that
 * misleads readers most.
 *
 * The stores below are real zustand stores that reproduce readerStore's exact
 * write shape: `applyViewSettings` MUTATES the viewSettings object in place and
 * hands the same reference back to `setViewSettings`, which rebuilds only the
 * wrapper (readerStore.ts:381). So the object keeps its identity for the life
 * of the view. A mock that replaced the object instead would let a component
 * that selects the object pass this file while being dead in the app.
 */

const h = await vi.hoisted(async () => {
  const { create: createStore } = await import('zustand');
  return {
    saveViewSettings: vi.fn(),
    readerMock: createStore(() => ({
      viewStates: {} as Record<string, { viewSettings: Record<string, unknown> } | undefined>,
    })),
    settingsMock: createStore(() => ({
      settings: { globalViewSettings: {} as Record<string, unknown> },
    })),
  };
});

const FACTORY = {
  serifFont: 'Bookerly',
  progressStyle: 'percentage',
  annotationToolbarItems: ['copy'],
};

vi.mock('@/context/EnvContext', () => ({
  useEnv: () => ({ envConfig: {}, appService: { getDefaultViewSettings: () => FACTORY } }),
}));

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => (s: string, options?: Record<string, string>) =>
    options ? s.replace(/\{\{(\w+)\}\}/g, (_m, k) => options[k] ?? '') : s,
}));

vi.mock('@/store/readerStore', () => ({
  useReaderStore: () => {
    const viewStates = h.readerMock((s: { viewStates: Record<string, unknown> }) => s.viewStates);
    return {
      getViewSettings: (key: string) =>
        (viewStates as Record<string, { viewSettings: unknown } | undefined>)[key]?.viewSettings ??
        null,
    };
  },
}));

vi.mock('@/store/settingsStore', () => ({
  useSettingsStore: () => ({ settings: h.settingsMock((s: { settings: unknown }) => s.settings) }),
}));

vi.mock('@/store/bookDataStore', () => ({
  useBookDataStore: () => ({
    getBookData: (bookKey: string) => (bookKey ? { book: { title: 'Dune' } } : null),
  }),
}));

vi.mock('@/helpers/settings', () => ({ saveViewSettings: h.saveViewSettings }));

const { SettingsScopeProvider, useScopedLabel } = await import(
  '@/components/settings/SettingsScopeContext'
);
const SettingsScopeBanner = (await import('@/components/settings/SettingsScopeBanner')).default;
const { useScopeTags } = await import('@/components/settings/ScopeTag');

const RESET = 'This book has its own value — reset it to your global setting';
const RESET_GLOBAL = 'Changed from the default — reset it';
const MASKED = 'This book overrides it';
const BOOK = 'book-1';

/** Seed the book's effective settings and the global defaults. */
const seed = (book: Record<string, unknown> | null, global: Record<string, unknown>) => {
  h.readerMock.setState({ viewStates: book ? { [BOOK]: { viewSettings: { ...book } } } : {} });
  h.settingsMock.setState({ settings: { globalViewSettings: { ...global } } });
};

/**
 * Write one per-book setting the way `applyViewSettings` does: mutate in place,
 * then rebuild the wrapper around the SAME object reference.
 */
const writeBookSetting = (key: string, value: unknown) =>
  act(() => {
    h.readerMock.setState(
      (state: { viewStates: Record<string, { viewSettings: Record<string, unknown> }> }) => {
        const entry = state.viewStates[BOOK]!;
        entry.viewSettings[key] = value;
        return { viewStates: { ...state.viewStates, [BOOK]: { ...entry } } };
      },
    );
  });

const SerifRow: React.FC<{ onReset?: (value: string) => void }> = ({ onReset = vi.fn() }) => {
  const scopedLabel = useScopedLabel();
  return <div>{scopedLabel('Serif Font', 'serifFont', onReset)}</div>;
};

const renderScoped = (bookKey: string, children: React.ReactNode) =>
  render(<SettingsScopeProvider bookKey={bookKey}>{children}</SettingsScopeProvider>);

const badge = () => screen.queryByRole('button', { name: RESET });
const globalBadge = () => screen.queryByRole('button', { name: RESET_GLOBAL });

beforeEach(() => {
  h.saveViewSettings.mockClear();
  seed({ isGlobal: false, serifFont: 'Literata' }, { serifFont: 'Bookerly' });
});

afterEach(cleanup);

describe('SettingsScopeBanner', () => {
  it('names the book and offers both scopes when editing the book', () => {
    renderScoped(BOOK, <SettingsScopeBanner />);

    expect(screen.getByText('This book: Dune — overrides only')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'This Book' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(screen.getByRole('button', { name: 'All Books' }).getAttribute('aria-pressed')).toBe(
      'false',
    );
  });

  it('switches scope by writing isGlobal to the book with skipGlobal', () => {
    renderScoped(BOOK, <SettingsScopeBanner />);

    fireEvent.click(screen.getByRole('button', { name: 'All Books' }));

    expect(h.saveViewSettings).toHaveBeenCalledWith({}, BOOK, 'isGlobal', true, true, false);
  });

  it('locks to global with no scope switch in the library, where there is no book', () => {
    seed(null, { serifFont: 'Bookerly' });
    renderScoped('', <SettingsScopeBanner />);

    expect(screen.getByText('Global defaults — applies to all books')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'This Book' })).toBeNull();
  });

  it('repaints the banner when the scope flag changes underneath it', () => {
    renderScoped(BOOK, <SettingsScopeBanner />);
    expect(screen.getByText('This book: Dune — overrides only')).toBeTruthy();

    writeBookSetting('isGlobal', true);

    expect(screen.getByText('Global defaults — applies to all books')).toBeTruthy();
  });
});

describe('useScopedLabel', () => {
  it('badges a value that belongs to the book while editing the book', () => {
    renderScoped(BOOK, <SerifRow />);
    expect(badge()).toBeTruthy();
  });

  it('badges a global value the reader has moved off the factory default', () => {
    // What you see in global scope IS the global value, so the useful question
    // is whether you have changed it from the shipped default.
    seed({ isGlobal: true, serifFont: 'Literata' }, { serifFont: 'Literata' });
    renderScoped(BOOK, <SerifRow />);

    expect(globalBadge()).toBeTruthy();
  });

  it('says nothing about a global value still at the factory default', () => {
    seed({ isGlobal: true, serifFont: 'Bookerly' }, { serifFont: 'Bookerly' });
    renderScoped(BOOK, <SerifRow />);

    expect(globalBadge()).toBeNull();
    expect(screen.queryByText(MASKED)).toBeNull();
  });

  it('still warns, separately, when a book masks the global value on show', () => {
    // The View menu writes per-book whatever the banner says. The global value
    // shown here is the factory one, so there is no badge — but the book will
    // not use it, and that has to be visible.
    seed({ isGlobal: true, serifFont: 'Literata' }, { serifFont: 'Bookerly' });
    renderScoped(BOOK, <SerifRow />);

    expect(globalBadge()).toBeNull();
    expect(screen.getByText(MASKED)).toBeTruthy();
  });

  it('leaves the label bare when the book matches global', () => {
    seed({ isGlobal: false, serifFont: 'Bookerly' }, { serifFont: 'Bookerly' });
    renderScoped(BOOK, <SerifRow />);

    expect(screen.getByText('Serif Font')).toBeTruthy();
    expect(badge()).toBeNull();
  });

  it('never badges in the library, where no book can own a value', () => {
    seed(null, { serifFont: 'Bookerly' });
    renderScoped('', <SerifRow />);

    expect(screen.getByText('Serif Font')).toBeTruthy();
    expect(badge()).toBeNull();
  });

  it('resets to the global value through the panel state setter', () => {
    const onReset = vi.fn();
    renderScoped(BOOK, <SerifRow onReset={onReset} />);

    fireEvent.click(screen.getByRole('button', { name: RESET }));

    expect(onReset).toHaveBeenCalledWith('Bookerly');
  });

  it('appears and clears live, without a remount, as the store is written', () => {
    // Guards the reactivity trap: readerStore keeps the viewSettings object's
    // identity across writes, so anything selecting that object never fires.
    seed({ isGlobal: false, serifFont: 'Bookerly' }, { serifFont: 'Bookerly' });
    renderScoped(BOOK, <SerifRow />);
    expect(badge()).toBeNull();

    writeBookSetting('serifFont', 'Literata');
    expect(badge()).toBeTruthy();

    writeBookSetting('serifFont', 'Bookerly');
    expect(badge()).toBeNull();
  });

  it('compares by value, so an equal array setting is not the book’s own', () => {
    // serializeConfig deep-clones the config, so array settings are always a
    // fresh reference; a reference check would badge every one of them.
    seed(
      { isGlobal: false, annotationToolbarItems: ['copy'] },
      { annotationToolbarItems: ['copy'] },
    );
    const ArrayRow = () => {
      const scopedLabel = useScopedLabel();
      return <div>{scopedLabel('Toolbar', 'annotationToolbarItems', vi.fn())}</div>;
    };
    renderScoped(BOOK, <ArrayRow />);

    expect(badge()).toBeNull();
  });

  it('does not badge anything without a scope provider', () => {
    render(<SerifRow />);

    expect(screen.getByText('Serif Font')).toBeTruthy();
    expect(badge()).toBeNull();
  });
});

describe('the comparison target', () => {
  it('is the resolved global, not the factory default', () => {
    // The reader changed serifFont globally to Literata. A book also holding
    // Literata is inheriting, not overriding — even though Literata is not
    // what Readest ships with.
    seed({ isGlobal: false, serifFont: 'Literata' }, { serifFont: 'Literata' });
    renderScoped(BOOK, <SerifRow />);
    expect(badge()).toBeNull();
  });

  it('badges a book that still holds the factory value after global moved on', () => {
    // Mirror image: the book matches the factory value, the reader has since
    // changed the global. The book IS overriding the resolved global.
    seed({ isGlobal: false, serifFont: 'Bookerly' }, { serifFont: 'Literata' });
    renderScoped(BOOK, <SerifRow />);
    expect(badge()).toBeTruthy();
  });

  it('reports nothing for a key the global side has never held', () => {
    // Nothing to inherit, so nothing to override; resetting would write
    // undefined into the book.
    seed({ isGlobal: false, serifFont: 'Literata' }, {});
    renderScoped(BOOK, <SerifRow />);
    expect(badge()).toBeNull();
  });
});

describe('scope tags on rows the banner does not govern', () => {
  const Tagged: React.FC<{ kind: 'alwaysBook' | 'appWide' }> = ({ kind }) => {
    const scopeTag = useScopeTags();
    return <div>{scopeTag[kind]('Allow Scripts')}</div>;
  };

  it('marks a row that always writes the book, whatever the banner says', () => {
    renderScoped(BOOK, <Tagged kind='alwaysBook' />);
    expect(screen.getByText('This book only')).toBeTruthy();
  });

  it('marks a row that always writes app-wide, whatever the banner says', () => {
    renderScoped(BOOK, <Tagged kind='appWide' />);
    expect(screen.getByText('Whole app')).toBeTruthy();
  });

  it('keeps the app-wide tag while the banner reads "This book"', () => {
    // The dangerous direction: the banner promises the write is confined to
    // this book, and for these rows it is not.
    seed({ isGlobal: false, serifFont: 'Literata' }, { serifFont: 'Bookerly' });
    renderScoped(BOOK, <Tagged kind='appWide' />);
    expect(screen.getByText('Whole app')).toBeTruthy();
  });

  it('keeps the app-wide tag in the library, where there is no book at all', () => {
    seed(null, {});
    renderScoped('', <Tagged kind='appWide' />);
    expect(screen.getByText('Whole app')).toBeTruthy();
  });

  it('does not claim "this book only" in the library, where there is no book', () => {
    // A skipGlobal write matches neither branch of saveViewSettings without a
    // bookKey, so these controls save nothing there. Claiming "this book only"
    // pointed at a book that does not exist.
    const NoBook = () => {
      const scopeTag = useScopeTags('');
      return <div>{scopeTag.alwaysBook('Reference Page Count')}</div>;
    };
    seed(null, {});
    renderScoped('', <NoBook />);

    expect(screen.queryByText('This book only')).toBeNull();
    expect(screen.getByText('Open a book to change this')).toBeTruthy();
  });

  it('still says "this book only" when a book is open', () => {
    const WithBook = () => {
      const scopeTag = useScopeTags(BOOK);
      return <div>{scopeTag.alwaysBook('Reference Page Count')}</div>;
    };
    renderScoped(BOOK, <WithBook />);

    expect(screen.getByText('This book only')).toBeTruthy();
  });
});
