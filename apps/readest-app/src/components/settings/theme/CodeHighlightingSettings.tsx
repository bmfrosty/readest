import React from 'react';
import { CODE_LANGUAGES, CodeLanguage } from '@/utils/highlightjs';
import { useTranslation } from '@/hooks/useTranslation';
import { useScopedLabel } from '../SettingsScopeContext';
import { BoxedList, SettingsRow, SettingsSelect, SettingsSwitchRow } from '../primitives';

interface CodeHighlightingSettingsProps {
  codeHighlighting: boolean;
  codeLanguage: string;
  onToggle: (enabled: boolean) => void;
  onLanguageChange: (language: CodeLanguage) => void;
  'data-setting-id'?: string;
}

const CodeHighlightingSettings: React.FC<CodeHighlightingSettingsProps> = ({
  codeHighlighting,
  codeLanguage,
  onToggle,
  onLanguageChange,
  'data-setting-id': dataSettingId,
}) => {
  const _ = useTranslation();
  const scopedLabel = useScopedLabel();

  return (
    <BoxedList title={_('Code Highlighting')} data-setting-id={dataSettingId}>
      <SettingsSwitchRow
        label={scopedLabel(_('Enable Highlighting'), 'codeHighlighting', onToggle)}
        checked={codeHighlighting}
        onChange={() => onToggle(!codeHighlighting)}
      />
      <SettingsRow
        label={scopedLabel(_('Code Language'), 'codeLanguage', (value) =>
          // `codeLanguage` is a plain string in ViewSettings; the picker only
          // ever holds one of CODE_LANGUAGES, same cast as the select below.
          onLanguageChange(value as CodeLanguage),
        )}
      >
        <SettingsSelect
          value={codeLanguage}
          onChange={(event) => onLanguageChange(event.target.value as CodeLanguage)}
          ariaLabel={_('Code Language')}
          disabled={!codeHighlighting}
          options={CODE_LANGUAGES.map((lang) => ({
            value: lang,
            label: lang === 'auto-detect' ? _('Auto') : lang,
          }))}
        />
      </SettingsRow>
    </BoxedList>
  );
};

export default CodeHighlightingSettings;
