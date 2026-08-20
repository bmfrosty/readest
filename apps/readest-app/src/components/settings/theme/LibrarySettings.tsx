import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { BoxedList, SettingsSwitchRow } from '../primitives';
import { useScopeTags } from '../ScopeIndicators';

interface LibrarySettingsProps {
  skeuomorphicCovers: boolean;
  onToggle: (enabled: boolean) => void;
  'data-setting-id'?: string;
}

const LibrarySettings: React.FC<LibrarySettingsProps> = ({
  skeuomorphicCovers,
  onToggle,
  'data-setting-id': dataSettingId,
}) => {
  const _ = useTranslation();
  const scopeTag = useScopeTags();

  return (
    <BoxedList title={_('Library')} data-setting-id={dataSettingId}>
      <SettingsSwitchRow
        label={scopeTag.appWide(_('Skeuomorphic Book Covers'))}
        checked={skeuomorphicCovers}
        onChange={() => onToggle(!skeuomorphicCovers)}
      />
    </BoxedList>
  );
};

export default LibrarySettings;
