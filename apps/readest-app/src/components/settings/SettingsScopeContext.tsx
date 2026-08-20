import React, { createContext, useContext } from 'react';
import { ViewSettings } from '@/types/book';
import { useEnv } from '@/context/EnvContext';
import { useSettingsStore } from '@/store/settingsStore';
import { useBookDataStore } from '@/store/bookDataStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useEditedViewSettings } from '@/hooks/useEditedViewSettings';
import { saveViewSettings } from '@/helpers/settings';
import { isSameViewSettingValue } from '@/utils/serializer';
import OverrideBadge from './OverrideBadge';

/**
 * Which of the two stores a settings panel writes to, and how far each row has
 * been moved from what it inherits.
 *
 * `viewSettings.isGlobal` has always decided the scope, but it lived behind one
 * checkmark in the overflow menu, so a font picked while a book was open
 * silently became a per-book value the reader could neither see nor find.
 *
 * Every row is measured against the baseline its own scope inherits, so the
 * badge always answers the same question — "have I moved this?" — and its ↺
 * always restores the thing directly beneath:
 *
 *   book scope    edited = the book's values     baseline = the resolved global
 *   global scope  edited = the global defaults   baseline = the factory defaults
 *
 * In global scope a second, separate signal is still needed: a book can hold
 * its own value for a row, which masks the global value on display. That is not
 * "you moved this", so it gets a quiet chip rather than the badge.
 */
export interface SettingsScope {
  /** False in the library context: with no book there is nothing to scope to. */
  canScopeToBook: boolean;
  /** True when the panels show and write the global defaults. */
  isGlobal: boolean;
  /** Title of the scoped book, for the banner. Empty in the library context. */
  bookTitle: string;
  /** Switch the scope. No-op in the library context. */
  setGlobal: (global: boolean) => void;
  /** True when the displayed value differs from what this scope inherits. */
  isChanged: <K extends keyof ViewSettings>(key: K) => boolean;
  /** The value this scope inherits — the global value, or the factory default. */
  getBaselineValue: <K extends keyof ViewSettings>(key: K) => ViewSettings[K];
  /** Global scope only: the open book holds its own value, masking the global one. */
  isMaskedByBook: <K extends keyof ViewSettings>(key: K) => boolean;
}

const SettingsScopeContext = createContext<SettingsScope | null>(null);

export const SettingsScopeProvider: React.FC<{ bookKey: string; children: React.ReactNode }> = ({
  bookKey,
  children,
}) => {
  const { envConfig, appService } = useEnv();
  const { settings } = useSettingsStore();
  const { getBookData } = useBookDataStore();
  const { edited, book, isGlobal } = useEditedViewSettings(bookKey);

  const globalViewSettings = settings?.globalViewSettings;
  // appService is null on the first renders; without it the factory defaults
  // are unknown, so global scope simply reports nothing rather than guessing.
  const baseline = isGlobal ? appService?.getDefaultViewSettings() : globalViewSettings;
  const canScopeToBook = !!bookKey;

  // Compare by value, exactly like serializeConfig does — an array or object
  // setting is a fresh reference on every read and would otherwise always
  // report as changed. `key in` guards a baseline that never held the key.
  const differs = (
    a: ViewSettings | undefined,
    b: ViewSettings | undefined,
    key: keyof ViewSettings,
  ) => !!a && !!b && key in b && !isSameViewSettingValue(a[key], b[key]);

  const scope: SettingsScope = {
    canScopeToBook,
    isGlobal,
    bookTitle: getBookData(bookKey)?.book?.title ?? '',
    setGlobal: (global) => {
      if (!canScopeToBook || global === isGlobal) return;
      // skipGlobal, so the flag itself is always stored on the book.
      saveViewSettings(envConfig, bookKey, 'isGlobal', global, true, false);
    },
    isChanged: (key) => differs(edited, baseline, key),
    getBaselineValue: (key) => baseline?.[key] as ViewSettings[typeof key],
    isMaskedByBook: (key) => isGlobal && canScopeToBook && differs(book, globalViewSettings, key),
  };

  return <SettingsScopeContext.Provider value={scope}>{children}</SettingsScopeContext.Provider>;
};

export const useSettingsScope = () => useContext(SettingsScopeContext);

/**
 * Decorates a settings-row label with whatever that row needs to disclose:
 *
 * ```tsx
 * <SettingsRow label={scopedLabel(_('Serif Font'), 'serifFont', setSerifFont)}>
 * ```
 *
 * `onReset` is the same state setter the control itself uses, so resetting
 * flows through the panel's existing save effect — nothing new to keep in sync.
 * Labels pass through untouched when there is nothing to say, so callers can
 * decorate unconditionally.
 *
 * Do NOT decorate a setting the panel can only ever write per-book — the
 * `isGlobal` flag itself, and anything saved with `skipGlobal` (`writingMode`,
 * `referencePageCount`, `allowScript`, `translationEnabled`). Their scope is
 * fixed, so use `useScopeTags().alwaysBook` from `./ScopeTag` instead.
 */
export const useScopedLabel = () => {
  const _ = useTranslation();
  const scope = useSettingsScope();

  return <K extends keyof ViewSettings>(
    label: React.ReactNode,
    key: K,
    onReset: (value: ViewSettings[K]) => void,
  ): React.ReactNode => {
    if (!scope) return label;
    const changed = scope.isChanged(key);
    const masked = scope.isMaskedByBook(key);
    if (!changed && !masked) return label;

    // Fragments, not a wrapper element: labels render inside `<SettingLabel>`,
    // whose `line-clamp-2` makes a `-webkit-box`. Keeping these inline-level
    // lets them share the label's anonymous block instead of stacking under it.
    return (
      <>
        {label}
        {changed && (
          <OverrideBadge
            title={
              scope.isGlobal
                ? _('Changed from the default — reset it')
                : _('This book has its own value — reset it to your global setting')
            }
            onReset={() => onReset(scope.getBaselineValue(key))}
          />
        )}
        {masked && (
          // A line of its own under the setting, not a chip beside the title:
          // it is a sentence about the value below, not a label for the row.
          // `block` inside SettingLabel's line-clamp box puts it on the next
          // line; the clamp then holds title + note at two lines.
          <span className='text-base-content/65 block text-[0.8em] font-normal leading-snug'>
            {_('This book overrides it')}
          </span>
        )}
      </>
    );
  };
};
