import clsx from 'clsx';
import React from 'react';
import { MdCheck } from 'react-icons/md';
import { useEnv } from '@/context/EnvContext';
import { useSettingsStore } from '@/store/settingsStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useReaderStore } from '@/store/readerStore';
import { useCustomFontStore } from '@/store/customFontStore';
import {
  isSettingsScopeGlobal,
  preferredScopeGlobal,
  saveViewSettings,
  scopeFlagToStore,
} from '@/helpers/settings';
import { SettingsPanelType } from './SettingsDialog';
import Menu from '@/components/Menu';
import MenuItem from '@/components/MenuItem';

interface DialogMenuProps {
  bookKey: string;
  activePanel: SettingsPanelType;
  setIsDropdownOpen?: (open: boolean) => void;
  onReset: () => void;
  resetLabel?: string;
}

const DialogMenu: React.FC<DialogMenuProps> = ({
  bookKey,
  activePanel,
  setIsDropdownOpen,
  onReset,
  resetLabel,
}) => {
  const _ = useTranslation();
  const { envConfig, appService } = useEnv();
  const { settings, setFontPanelView } = useSettingsStore();
  const { getViewSettings } = useReaderStore();
  const { getAllFonts, removeFont, saveCustomFonts } = useCustomFontStore();
  const viewSettings = getViewSettings(bookKey);
  const isSettingsGlobal = isSettingsScopeGlobal(bookKey, viewSettings, settings);

  const handleToggleGlobal = () => {
    // Both of these read the STORED preference, and they must. Resolving from
    // the stored value while clearing against the pending one makes the two
    // cancel exactly whenever they differ: the menu then writes `undefined` for
    // a key that is already absent, `saveViewSettings` finds nothing to do, and
    // the item becomes a control that does nothing — the very failure this
    // change exists to remove.
    //
    // The cost is that toggling scope in the same session as the preference can
    // leave a book holding a flag equal to the new default. That is a redundant
    // flag, not a wrong one, but clearing it takes two more clicks and the
    // first of them moves the scope: from flag F equal to default D, one click
    // stores !D and flips the book, and only the next one clears.
    const next = scopeFlagToStore(!isSettingsGlobal, preferredScopeGlobal(settings));
    saveViewSettings(envConfig, bookKey, 'isGlobal', next, true, false);
    setIsDropdownOpen?.(false);
  };

  const handleResetToDefaults = () => {
    onReset();
    setIsDropdownOpen?.(false);
  };

  const handleManageCustomFont = () => {
    setFontPanelView('custom-fonts');
    setIsDropdownOpen?.(false);
  };

  const handleClearCustomFont = () => {
    getAllFonts().forEach((font) => {
      if (removeFont(font.id)) {
        appService!.deleteFont(font);
      }
    });
    saveCustomFonts(envConfig);
    setIsDropdownOpen?.(false);
  };

  return (
    <Menu className={clsx('dialog-menu dropdown-content no-triangle z-20 mt-2 shadow-2xl')}>
      <MenuItem
        label={_('Global Settings')}
        tooltip={isSettingsGlobal ? _('Apply to All Books') : _('Apply to This Book')}
        disabled={!bookKey}
        buttonClass='lg:tooltip'
        Icon={isSettingsGlobal ? MdCheck : null}
        onClick={handleToggleGlobal}
      />
      <MenuItem label={resetLabel || _('Reset Settings')} onClick={handleResetToDefaults} />
      {activePanel === 'Font' && (
        <>
          <MenuItem label={_('Clear Custom Fonts')} onClick={handleClearCustomFont} />
          <MenuItem label={_('Manage Custom Fonts')} onClick={handleManageCustomFont} />
        </>
      )}
    </Menu>
  );
};

export default DialogMenu;
