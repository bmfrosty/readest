import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from '@/store/settingsStore';

/**
 * Switching scope remounts every settings panel, so its controls re-seed from
 * the other store. Local component state does not survive that, and "which
 * sub-page am I on" is not a scoped value — nothing about changing scope means
 * the reader wanted to leave the page they were on.
 *
 * FontPanel already got this right by accident of keeping `fontPanelView` in
 * the store. These four did not, so a scope flip closed the custom-theme editor
 * (losing colours in progress), and kicked the reader out of Custom
 * Dictionaries, Word Lens and the annotation-toolbar customizer.
 *
 * Word Lens and the toolbar customizer edit real scoped view settings, so
 * staying put is not merely damage control: it turns a scope flip into a
 * side-by-side comparison of the book's arrangement against the global one.
 */
describe('settings sub-page position', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      fontPanelView: 'main-fonts',
      settingsSubPage: null,
      editThemeName: null,
    });
  });

  it('lives in the store, so a panel remount cannot lose it', () => {
    const { setSettingsSubPage } = useSettingsStore.getState();

    setSettingsSubPage('theme-editor');

    // A remount reads the store afresh; the position is still there.
    expect(useSettingsStore.getState().settingsSubPage).toBe('theme-editor');
  });

  it('holds the theme being edited by name, not by copying the theme', () => {
    // A copy would go stale the moment the theme is saved, and would put a
    // whole data object into what is navigation state.
    const { setEditThemeName } = useSettingsStore.getState();

    setEditThemeName('Solarized Mine');

    expect(useSettingsStore.getState().editThemeName).toBe('Solarized Mine');
  });

  it('starts closed, so a fresh dialog opens on the main page', () => {
    expect(useSettingsStore.getState().settingsSubPage).toBeNull();
    expect(useSettingsStore.getState().editThemeName).toBeNull();
  });

  it('closes cleanly, clearing the page and its subject together', () => {
    const { setSettingsSubPage, setEditThemeName } = useSettingsStore.getState();
    setSettingsSubPage('theme-editor');
    setEditThemeName('Solarized Mine');

    setSettingsSubPage(null);
    setEditThemeName(null);

    expect(useSettingsStore.getState().settingsSubPage).toBeNull();
    expect(useSettingsStore.getState().editThemeName).toBeNull();
  });
});
