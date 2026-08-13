import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';

interface ScopeTagProps {
  /** Where the write actually goes. Supplied by `useScopedLabel` so the
   *  strings stay in one place for extraction. */
  text: string;
}

/**
 * Quiet chip on a settings row that the scope banner does NOT govern.
 *
 * Most rows obey the banner, so silence means "the banner is telling the truth
 * here". A tag appears only on the exceptions: rows saved with `skipGlobal`
 * (always this book) and rows saved through `saveSysSettings` (always app-wide,
 * never per-book). Without it the banner makes a blanket claim that is false
 * for those rows — the worst case being a reader who sets the banner to this
 * book and then toggles an app-wide row.
 *
 * Outline rather than fill: it is a label, not a state, and an outline reads
 * on e-ink where a tint flattens to grey.
 */
const ScopeTag: React.FC<ScopeTagProps> = ({ text }) => (
  <span className='border-base-content/25 text-base-content/55 ms-1.5 whitespace-nowrap rounded-full border px-1.5 align-middle text-[0.7em] leading-[1.5]'>
    {text}
  </span>
);

export default ScopeTag;

/**
 * Tags for the rows the scope banner does not govern.
 *
 * Deliberately independent of `useScopedLabel` and of every store: which store
 * a row writes to is fixed at its call site, not derived from state. Keeping
 * these here lets a leaf component tag a row without pulling in the settings
 * and reader stores.
 *
 * ```tsx
 * const tag = useScopeTags();
 * label={tag.alwaysBook(_('Allow Scripts'))}   // saved with skipGlobal
 * label={tag.appWide(_('Telemetry'))}          // saved via saveSysSettings
 * ```
 */
export const useScopeTags = () => {
  const _ = useTranslation();
  return {
    alwaysBook: (label: React.ReactNode): React.ReactNode => (
      <>
        {label}
        <ScopeTag text={_('This book only')} />
      </>
    ),
    appWide: (label: React.ReactNode): React.ReactNode => (
      <>
        {label}
        <ScopeTag text={_('Whole app')} />
      </>
    ),
  };
};
