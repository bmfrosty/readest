import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';

/**
 * Scrolled mode is supported for fixed-layout books: the view menu's Zoom Mode
 * row turns it on (vertical / horizontal scrolling, Webtoon Mode forces it),
 * and the renderer has a whole scrolled-FXL path behind it (#4795 preload
 * scheduler, #4817 pinch-zoom). Settings > Behavior > Scroll kept the original
 * `disabled={bookData?.isFixedLayout}` from before that support landed, so the
 * one place a reader looks for the toggle was the one place it was dead.
 */

let currentIsFixedLayout = false;
let currentScopeIsGlobal = true;

vi.mock('@/context/EnvContext', () => ({
  useEnv: () => ({ envConfig: {}, appService: { isMobileApp: false } }),
}));

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => (s: string) => s,
}));

const stubView = {
  renderer: {
    setAttribute: vi.fn(),
    removeAttribute: vi.fn(),
    hasAttribute: () => false,
    setStyles: vi.fn(),
  },
};

vi.mock('@/store/readerStore', () => ({
  useReaderStore: () => ({
    getView: () => stubView,
    getViews: () => [],
    getViewSettings: () => ({ scrolled: false, noContinuousScroll: false }),
    recreateViewer: vi.fn(),
  }),
}));

vi.mock('@/store/bookDataStore', () => ({
  useBookDataStore: () => ({
    getBookData: () => ({ isFixedLayout: currentIsFixedLayout, book: { format: 'PDF' } }),
  }),
}));

vi.mock('@/store/settingsStore', () => ({
  useSettingsStore: () => ({ settings: { globalViewSettings: {} } }),
}));

vi.mock('@/hooks/useResetSettings', () => ({
  useResetViewSettings: () => vi.fn(),
}));

vi.mock('@/hooks/useEinkMode', () => ({
  useEinkMode: () => ({ applyEinkMode: vi.fn() }),
}));

vi.mock('@/helpers/settings', () => ({
  saveViewSettings: vi.fn(),
  saveSysSettings: vi.fn(),
  // ControlPanel reads the settings scope to mark its one app-wide row.
  isSettingsScopeGlobal: () => currentScopeIsGlobal,
}));

vi.mock('@/services/environment', () => ({
  isTauriAppPlatform: () => false,
}));

vi.mock('@/utils/share', () => ({
  canShareText: () => true,
}));

vi.mock('@/utils/telemetry', () => ({
  optInTelemetry: vi.fn(),
  optOutTelemetry: vi.fn(),
}));

// Unrelated to the Scroll section and pulls in the device-control store.
vi.mock('@/components/settings/PageTurnerSettings', () => ({
  default: () => null,
}));

vi.mock('@/utils/style', () => ({ getStyles: () => '' }));
vi.mock('@/utils/config', () => ({ getMaxInlineSize: () => 720 }));

const applyPageTurnAttributes = vi.fn();
vi.mock('@/app/reader/hooks/useCapturedTurn', () => ({
  applyPageTurnAttributes: (...args: unknown[]) => applyPageTurnAttributes(...args),
}));

import ControlPanel from '@/components/settings/ControlPanel';

const scrolledModeSwitch = () =>
  screen.getByText('Scrolled Mode').closest('label')?.querySelector('input') ??
  (screen.getByText('Scrolled Mode').closest('div')?.querySelector('input') as HTMLInputElement);

afterEach(() => {
  cleanup();
  currentIsFixedLayout = false;
  applyPageTurnAttributes.mockClear();
});

describe('Settings > Behavior > Scroll', () => {
  it('offers Scrolled Mode for a fixed-layout book (PDF / CBZ)', () => {
    currentIsFixedLayout = true;
    render(
      <ControlPanel
        bookKey='test'
        onRegisterReset={() => {}}
        openSettingsInBookScope={false}
        onOpenSettingsInBookScopeChange={() => {}}
      />,
    );

    expect(scrolledModeSwitch()?.disabled).toBe(false);
  });

  it('offers Scrolled Mode for a reflowable book', () => {
    currentIsFixedLayout = false;
    render(
      <ControlPanel
        bookKey='test'
        onRegisterReset={() => {}}
        openSettingsInBookScope={false}
        onOpenSettingsInBookScopeChange={() => {}}
      />,
    );

    expect(scrolledModeSwitch()?.disabled).toBe(false);
  });
});

describe('Scrolled Mode and the page-turn attributes', () => {
  // `scrolled` is an input to getCapturedTurnStyle, so it decides which engine
  // owns a swipe: the app's captured turn (turn-style removed, no-swipe set,
  // captured-turn-style set) or the paginator's own View Transition
  // (turn-style set, no-swipe cleared). Every other input to that decision —
  // animated, pageTurnStyle, disableSwipe — re-applies the attributes when it
  // changes; `scrolled` did not.
  //
  // Left stale, the renderer keeps the scrolled configuration back in
  // paginated mode: the paginator animates the swipe itself AND the touch
  // interceptor, which recomputes eligibility live rather than reading the
  // attribute, runs a captured turn over the top. Device-reproduced on a
  // Xiaomi 13 — one frame held three page numbers, 59 / 59 / 60.
  it('re-applies the turn attributes when Scrolled Mode is toggled', () => {
    render(
      <ControlPanel
        bookKey='test'
        onRegisterReset={() => {}}
        openSettingsInBookScope={false}
        onOpenSettingsInBookScopeChange={() => {}}
      />,
    );
    applyPageTurnAttributes.mockClear();

    fireEvent.click(scrolledModeSwitch()!);

    expect(applyPageTurnAttributes).toHaveBeenCalled();
  });
});

describe('the app-wide row marker', () => {
  /**
   * The preference row is app-wide, but in book scope the banner above it
   * promises the opposite, so the row marks itself.
   *
   * This renders the REAL ControlPanel, with the real BoxedList and
   * SettingsRow. `scopeWiring.test.ts` also pins the marker, but by reading
   * source — it survives a rename of `contradictsBanner` and cannot see the
   * rendered output. This is the behavioural half.
   */
  const globe = () =>
    document
      .querySelector('[data-setting-id="settings.control.openSettingsInBookScope"]')
      ?.querySelector('svg');

  it('leaves the globe uncoloured in global scope, where the row agrees', () => {
    currentScopeIsGlobal = true;
    render(
      <ControlPanel
        bookKey='test'
        onRegisterReset={() => {}}
        openSettingsInBookScope={false}
        onOpenSettingsInBookScopeChange={() => {}}
      />,
    );

    expect(globe()).toBeTruthy();
    expect(globe()?.getAttribute('class') ?? '').not.toContain('text-error');
  });

  it('reddens the globe in book scope, where the banner promises otherwise', () => {
    currentScopeIsGlobal = false;
    render(
      <ControlPanel
        bookKey='test'
        onRegisterReset={() => {}}
        openSettingsInBookScope={false}
        onOpenSettingsInBookScopeChange={() => {}}
      />,
    );

    expect(globe()?.getAttribute('class') ?? '').toContain('text-error');
  });

  it('keeps the globe decorative and states the fact in text', () => {
    currentScopeIsGlobal = false;
    render(
      <ControlPanel
        bookKey='test'
        onRegisterReset={() => {}}
        openSettingsInBookScope={false}
        onOpenSettingsInBookScopeChange={() => {}}
      />,
    );

    // A named icon would join the switch's own accessible name, and the name it
    // carried was that of the ⋮ item which really changes the scope.
    expect(globe()?.getAttribute('aria-hidden')).toBe('true');
    expect(
      document
        .querySelector('[data-setting-id="settings.control.openSettingsInBookScope"] .sr-only')
        ?.textContent?.trim(),
    ).toBe('Applies to all books');
  });
});
