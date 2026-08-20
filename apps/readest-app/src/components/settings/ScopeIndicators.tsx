import React from 'react';
import { MdOutlineRestartAlt } from 'react-icons/md';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * The complete vocabulary of scope marks a settings row can carry. Three
 * shapes, each answering a different question, and nothing else may be
 * hand-rolled at a call site — if a row needs to say something new, it belongs
 * here.
 *
 * | Shape | Question it answers | Actionable |
 * | ----- | ------------------- | ---------- |
 * | dot + ↺  | have I moved this from what this scope inherits? | yes, resets |
 * | chip     | which store does this row write, if not the banner's? | no |
 * | note     | is the value on screen being overridden elsewhere? | no |
 *
 * Kept in one module deliberately. Readest has three levels — factory default,
 * global, per book — and today each scope only ever compares against the one
 * directly above it. If a third-context mark is ever wanted (say, "your global
 * also differs from the factory default" while editing a book), it is added
 * here, beside the others, and every row gains it at once.
 *
 * Two constraints any new shape must meet, both learned the hard way:
 *
 *  - Never distinguish by colour alone. Red against amber is the worst pair for
 *    deutan and protan vision, and e-ink flattens every tint to the same grey.
 *    Shape and position have to carry it.
 *  - Store-free. Only i18n is imported here, so a leaf component can mark a row
 *    without pulling in the settings and reader stores.
 */

/** The dot and its reset. The only mark that does something when pressed. */
export const ScopeDot: React.FC<{ title: string; onReset: () => void }> = ({ title, onReset }) => {
  const handleClick = (e: React.MouseEvent) => {
    // Switch rows wrap their label in a <label>, so without this a press here
    // would also flip the toggle the mark sits beside.
    e.preventDefault();
    e.stopPropagation();
    onReset();
  };
  return (
    <button
      type='button'
      title={title}
      aria-label={title}
      onClick={handleClick}
      className='btn btn-ghost focus-visible:ring-base-content/15 text-base-content/70 hover:text-base-content -my-1 ms-1.5 h-5 min-h-5 shrink-0 gap-1 rounded-full px-1.5 align-middle transition-colors duration-150 focus-visible:ring-2'
    >
      <span aria-hidden='true' className='bg-warning h-1.5 w-1.5 rounded-full' />
      <MdOutlineRestartAlt className='h-3.5 w-3.5' aria-hidden='true' />
    </button>
  );
};

/**
 * An outlined chip beside the title, naming the store a row writes when that is
 * not the one the banner names. Outline rather than fill: it is a label, not a
 * state, and an outline survives e-ink where a tint does not.
 */
export const ScopeTag: React.FC<{ text: string }> = ({ text }) => (
  <span className='border-base-content/25 text-base-content/55 ms-1.5 whitespace-nowrap rounded-full border px-1.5 align-middle text-[0.7em] leading-[1.5]'>
    {text}
  </span>
);

/**
 * A sentence on its own line under the setting. Used when the mark is about the
 * VALUE rather than the row — "the number you are looking at is not the one
 * this book will use". `block` inside SettingLabel's line-clamp box puts it on
 * the next line, and the clamp then holds title plus note at two lines.
 */
export const ScopeNote: React.FC<{ text: string }> = ({ text }) => (
  <span className='text-base-content/65 block text-[0.8em] font-normal leading-snug'>{text}</span>
);

/**
 * Tags for rows whose scope is fixed regardless of the banner.
 *
 * Pass the panel's `bookKey` so `alwaysBook` can tell the library apart, where
 * a `skipGlobal` write matches neither branch of `saveViewSettings` and the
 * control saves nothing at all. Leaf components that only need `appWide` can
 * omit it.
 */
export const useScopeTags = (bookKey?: string) => {
  const _ = useTranslation();
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
