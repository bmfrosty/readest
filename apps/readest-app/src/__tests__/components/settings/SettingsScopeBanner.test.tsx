/**
 * The scope banner.
 *
 * Settings panels write either the global defaults or the open book's own
 * values. `viewSettings.isGlobal` has always decided which, but it lived behind
 * one checkmark in the overflow menu — so a font picked while a book was open
 * silently became that book's own value, with nothing on screen to say so.
 *
 * A note on the mock, so nobody trusts it further than it goes. `setBookScope`
 * REPLACES the view-settings object. `applyViewSettings` passes the same
 * reference through, which is the case a selector would miss. The mock also ignores
 * any selector argument. So this file cannot prove that the hook's
 * whole-store subscription is necessary — it only proves what the banner
 * renders for a given scope. The subscription is deliberate and documented in
 * `hooks/useSettingsScope.ts`; it is not tested here.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, act } from '@testing-library/react';

const h = await vi.hoisted(async () => {
  const { create: createStore } = await import('zustand');
  return {
    readerMock: createStore(() => ({
      viewStates: {} as Record<string, { viewSettings: Record<string, unknown> } | undefined>,
    })),
    settingsMock: createStore(() => ({
      settings: {} as { openSettingsInBookScope?: boolean },
    })),
  };
});

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => (s: string, options?: Record<string, string>) =>
    options ? s.replace(/\{\{(\w+)\}\}/g, (_m, k) => options[k] ?? '') : s,
}));
vi.mock('@/store/settingsStore', () => ({
  useSettingsStore: () => ({ settings: h.settingsMock((s) => s.settings) }),
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

const setBookScope = (isGlobal: boolean) =>
  h.readerMock.setState({ viewStates: { 'book-1': { viewSettings: { isGlobal } } } });

const show = (bookKey: string, alwaysGlobal = false) =>
  render(<SettingsScopeBanner bookKey={bookKey} alwaysGlobal={alwaysGlobal} />);

describe('SettingsScopeBanner', () => {
  beforeEach(() => {
    h.readerMock.setState({ viewStates: {} });
    h.settingsMock.setState({ settings: {} });
  });
  afterEach(cleanup);

  it('says the change reaches every book, in global scope', () => {
    setBookScope(true);
    show('book-1');

    expect(screen.getByText('Global Settings')).toBeTruthy();
  });

  it('says it overrides the global, in book scope', () => {
    setBookScope(false);
    show('book-1');

    expect(screen.getByText('This Book — Overrides Global Settings')).toBeTruthy();
  });

  it('follows a scope change made elsewhere', () => {
    setBookScope(true);
    show('book-1');

    act(() => setBookScope(false));

    expect(screen.getByText('This Book — Overrides Global Settings')).toBeTruthy();
  });

  it('defaults to global for a book that has never been scoped', () => {
    // No `isGlobal` on the book's view settings. The factory default is global,
    // so an unscoped book must not be announced as carrying its own values.
    h.readerMock.setState({ viewStates: { 'book-1': { viewSettings: {} } } });
    show('book-1');

    expect(screen.getByText('Global Settings')).toBeTruthy();
  });

  it('follows the preference when the book has never been scoped', () => {
    // The flag is absent, so the resolver must fall through to the preference.
    // Without this, a context that bypassed `isSettingsScopeGlobal` and read
    // `getViewSettings(bookKey)?.isGlobal ?? true` would pass every other case.
    h.settingsMock.setState({ settings: { openSettingsInBookScope: true } });
    h.readerMock.setState({ viewStates: { 'book-1': { viewSettings: {} } } });
    show('book-1');

    expect(screen.getByText('This Book — Overrides Global Settings')).toBeTruthy();
  });

  it('reads global in the library, where there is no book', () => {
    show('');

    expect(screen.getByText('Global Settings')).toBeTruthy();
  });

  /**
   * Integrations and AI have no per-book form, so the flag does not govern
   * them. The banner states that rather than reporting the flag — and says
   * "Always", so a ⋮ toggle that leaves this banner unchanged reads as expected
   * rather than broken. An absent banner would be ambiguous: it could equally
   * mean the banner failed to render.
   */
  it('reads "Always Global Settings" on a panel with no per-book form', () => {
    setBookScope(false);
    show('book-1', true);

    expect(screen.getByText('Always Global Settings')).toBeTruthy();
    // Even though the book itself is scoped to itself.
    expect(screen.queryByText('This Book — Overrides Global Settings')).toBeNull();
  });

  it('still reports the flag on a panel that has a per-book form', () => {
    setBookScope(false);
    show('book-1', false);

    expect(screen.getByText('This Book — Overrides Global Settings')).toBeTruthy();
  });
});
