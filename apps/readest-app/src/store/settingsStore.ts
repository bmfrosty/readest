import i18n from '@/i18n/i18n';
import { create } from 'zustand';
import { SystemSettings } from '@/types/settings';
import { EnvConfigType } from '@/services/environment';
import { initDayjs } from '@/utils/time';
import { broadcastGlobalSettings } from '@/utils/settingsSync';

export type FontPanelView = 'main-fonts' | 'custom-fonts';

/**
 * Which full-page sub-view the active settings panel is showing, if any. Only
 * one panel renders at a time, so one field serves them all.
 *
 * This lives in the store, not in the panel, for the same reason
 * `fontPanelView` does: switching scope remounts the panels so their controls
 * re-seed from the other store, and local state does not survive that. Where
 * you are is not a scoped value, so a scope switch must not move you. Font
 * already behaved this way; these four did not.
 */
export type SettingsSubPage = 'theme-editor' | 'dictionaries' | 'word-lens' | 'toolbar';

interface SettingsState {
  settings: SystemSettings;
  settingsDialogBookKey: string;
  isSettingsDialogOpen: boolean;
  fontPanelView: FontPanelView;
  settingsSubPage: SettingsSubPage | null;
  /** The custom theme the editor is open on, by name. Null means a new one. */
  editThemeName: string | null;
  /**
   * True while a settings panel holds text the reader typed but has not
   * applied. Only the custom-CSS editors do this today: their Apply button is
   * an explicit act, and it is disabled while the CSS is invalid, so a
   * half-typed stylesheet can never be auto-saved on the reader's behalf.
   *
   * The scope switch reads this to warn before it discards the text, because
   * flipping scope remounts the panel to re-seed its controls.
   */
  hasUnappliedDraft: boolean;
  activeSettingsItemId: string | null;
  /**
   * Deep-link target — when set before opening the Settings dialog, the dialog
   * mounts with this panel pre-selected (instead of the lastConfigPanel from
   * localStorage). Cleared by the dialog after consumption.
   */
  requestedPanel: string | null;
  /**
   * Optional sub-page hint paired with `requestedPanel`. When the requested
   * panel renders nested sub-pages (e.g. Integrations → KOSync / Readwise /
   * Hardcover / OPDS), this string tells the panel which one to drill into.
   * Cleared by the panel after consumption. Format is panel-specific —
   * Integrations recognises 'kosync' | 'readwise' | 'hardcover' | 'opds'.
   */
  requestedSubPage: string | null;
  setSettings: (settings: SystemSettings) => void;
  saveSettings: (envConfig: EnvConfigType, settings: SystemSettings) => Promise<void>;
  setSettingsDialogBookKey: (bookKey: string) => void;
  setSettingsDialogOpen: (open: boolean) => void;
  setFontPanelView: (view: FontPanelView) => void;
  setSettingsSubPage: (page: SettingsSubPage | null) => void;
  setEditThemeName: (name: string | null) => void;
  setHasUnappliedDraft: (dirty: boolean) => void;
  setActiveSettingsItemId: (id: string | null) => void;
  setRequestedPanel: (panel: string | null) => void;
  setRequestedSubPage: (subPage: string | null) => void;

  applyUILanguage: (uiLanguage?: string) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: {} as SystemSettings,
  settingsDialogBookKey: '',
  isSettingsDialogOpen: false,
  fontPanelView: 'main-fonts',
  settingsSubPage: null,
  editThemeName: null,
  hasUnappliedDraft: false,
  activeSettingsItemId: null,
  requestedPanel: null,
  requestedSubPage: null,
  setSettings: (settings) => set({ settings }),
  saveSettings: async (envConfig: EnvConfigType, settings: SystemSettings) => {
    const appService = await envConfig.getAppService();
    await appService.saveSettings(settings);
    // Keep other open windows' in-memory global settings in sync so a stale
    // window doesn't clobber this write on its next save (issue #4580).
    void broadcastGlobalSettings(settings);
  },
  setSettingsDialogBookKey: (bookKey) => set({ settingsDialogBookKey: bookKey }),
  setSettingsDialogOpen: (open) => set({ isSettingsDialogOpen: open }),
  setFontPanelView: (view) => set({ fontPanelView: view }),
  setSettingsSubPage: (page) => set({ settingsSubPage: page }),
  setEditThemeName: (name) => set({ editThemeName: name }),
  setHasUnappliedDraft: (dirty) => set({ hasUnappliedDraft: dirty }),
  setActiveSettingsItemId: (id) => set({ activeSettingsItemId: id }),
  setRequestedPanel: (panel) => set({ requestedPanel: panel }),
  setRequestedSubPage: (subPage) => set({ requestedSubPage: subPage }),

  applyUILanguage: (uiLanguage?: string) => {
    const locale = uiLanguage ? uiLanguage : navigator.language;
    i18n.changeLanguage(locale);
    initDayjs(locale);
  },
}));
