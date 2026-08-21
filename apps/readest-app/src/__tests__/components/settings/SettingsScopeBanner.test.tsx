/**
 * The scope banner.
 *
 * Settings panels write either the global defaults or the open book's own
 * values. `viewSettings.isGlobal` has always decided which, but it lived behind
 * one checkmark in the overflow menu — so a font picked while a book was open
 * silently became that book's own value, with nothing on screen to say so.
 *
 * The stores below are real zustand stores that reproduce readerStore's write
 * shape: `applyViewSettings` MUTATES the view-settings object in place and hands
 * the same reference back to `setViewSettings`, which rebuilds only the wrapper.
 * The object keeps its identity for the life of the view. A mock that REPLACED
 * the object would let a component that selects on it pass here while being
 * dead in the app.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent, act } from '@testing-library/react';

const h = await vi.hoisted(async () => {
  const { create: createStore } = await import('zustand');
  return {
    saveViewSettings: vi.fn(),
    readerMock: createStore(() => ({
      viewStates: {} as Record<string, { viewSettings: Record<string, unknown> } | undefined>,
    })),
  };
});

vi.mock('@/context/EnvContext', () => ({ useEnv: () => ({ envConfig: {} }) }));
vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => (s: string, options?: Record<string, string>) =>
    options ? s.replace(/\{\{(\w+)\}\}/g, (_m, k) => options[k] ?? '') : s,
}));
vi.mock('@/helpers/settings', () => ({ saveViewSettings: h.saveViewSettings }));
vi.mock('@/store/bookDataStore', () => ({
  useBookDataStore: () => ({ getBookData: () => ({ book: { title: 'Selfcare' } }) }),
}));
vi.mock('@/store/readerStore', () => ({
  useReaderStore: () => {
    const viewStates = h.readerMock((s) => s.viewStates);
    return {
      getViewSettings: (key: string) => viewStates[key]?.viewSettings,
    };
  },
}));

import SettingsScopeBanner from '@/components/settings/SettingsScopeBanner';
import { SettingsScopeProvider } from '@/components/settings/SettingsScopeContext';

const setBookScope = (isGlobal: boolean) =>
  h.readerMock.setState({ viewStates: { 'book-1': { viewSettings: { isGlobal } } } });

const show = (bookKey: string) =>
  render(
    <SettingsScopeProvider bookKey={bookKey}>
      <SettingsScopeBanner />
    </SettingsScopeProvider>,
  );

describe('SettingsScopeBanner', () => {
  beforeEach(() => {
    h.saveViewSettings.mockReset();
    h.readerMock.setState({ viewStates: {} });
  });
  afterEach(cleanup);

  it('says the change reaches every book, in global scope', () => {
    setBookScope(true);
    show('book-1');

    expect(screen.getByText('Global defaults — applies to all books')).toBeTruthy();
    expect(screen.getByText('All Books').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('This Book').getAttribute('aria-pressed')).toBe('false');
  });

  it('names the book, in book scope', () => {
    setBookScope(false);
    show('book-1');

    expect(screen.getByText('This book: Selfcare — overrides only')).toBeTruthy();
    expect(screen.getByText('This Book').getAttribute('aria-pressed')).toBe('true');
  });

  it('switches the scope, and stores the flag on the book', () => {
    setBookScope(true);
    show('book-1');

    fireEvent.click(screen.getByText('This Book'));

    // skipGlobal is true: the flag itself must always land on the book, or
    // scoping one book would scope every book.
    expect(h.saveViewSettings).toHaveBeenCalledWith({}, 'book-1', 'isGlobal', false, true, false);
  });

  it('follows a scope change made elsewhere', () => {
    setBookScope(true);
    show('book-1');

    act(() => setBookScope(false));

    expect(screen.getByText('This book: Selfcare — overrides only')).toBeTruthy();
  });

  it('defaults to global for a book that has never been scoped', () => {
    // No `isGlobal` on the book's view settings. The factory default is global,
    // so an unscoped book must not be announced as carrying its own values.
    h.readerMock.setState({ viewStates: { 'book-1': { viewSettings: {} } } });
    show('book-1');

    expect(screen.getByText('Global defaults — applies to all books')).toBeTruthy();
  });

  it('offers no switch in the library, where there is no book', () => {
    show('');

    expect(screen.getByText('Global defaults — applies to all books')).toBeTruthy();
    expect(screen.queryByText('This Book')).toBeNull();
  });
});
