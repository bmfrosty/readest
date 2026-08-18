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
 * Pass the panel's `bookKey` so `alwaysBook` can tell the library apart, where
 * those settings have nothing to write to. Leaf components that only need
 * `appWide` can omit it.
 *
 * ```tsx
 * const tag = useScopeTags(bookKey);
 * label={tag.alwaysBook(_('Allow Scripts'))}   // saved with skipGlobal
 * label={tag.appWide(_('Telemetry'))}          // saved via saveSysSettings
 * ```
 */
export const useScopeTags = (bookKey?: string) => {
  const _ = useTranslation();
  // A `skipGlobal` write matches neither branch of saveViewSettings when there
  // is no bookKey, so in the library these controls save nothing at all. Say
  // so, and let the caller disable them, rather than claim "this book only"
  // when there is no book.
  const hasBook = bookKey === undefined || !!bookKey;
  return {
    alwaysBook: (label: React.ReactNode): React.ReactNode => (
      <>
        {label}
        <ScopeTag text={hasBook ? _('This book only') : _('Open a book to change this')} />
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
