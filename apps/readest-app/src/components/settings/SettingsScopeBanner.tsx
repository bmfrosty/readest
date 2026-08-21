import clsx from 'clsx';
import React from 'react';
import { MdOutlineMenuBook, MdOutlinePublic } from 'react-icons/md';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettingsScope } from '@/hooks/useSettingsScope';

/**
 * States which of the two settings stores the open panel writes to.
 *
 * Read-only on purpose. Changing the scope from here needs the panels to
 * re-seed from the other store and needs unapplied editor drafts protected;
 * until both exist, a one-click switch would silently write the values on
 * screen into a store they did not come from. The Settings Menu checkmark
 * remains the way to change it.
 *
 * It lives in the dialog header rather than the scrolling body, so the answer
 * to "am I changing this book or every book?" is on screen while the reader is
 * changing things. The failure this replaces was a font silently landing on one
 * book only, with nothing to show it had.
 */
interface SettingsScopeBannerProps {
  bookKey: string;
  /**
   * True on panels with no per-book form (Integrations, AI). Their settings are
   * app-wide whatever the flag says, so the banner states that instead of
   * reporting the flag — and says "Always", so a ⋮ toggle that leaves this
   * banner unchanged reads as expected rather than broken.
   */
  alwaysGlobal?: boolean;
}

const SettingsScopeBanner: React.FC<SettingsScopeBannerProps> = ({
  bookKey,
  alwaysGlobal = false,
}) => {
  const _ = useTranslation();
  const scopeIsGlobal = useSettingsScope(bookKey);
  const isGlobal = alwaysGlobal || scopeIsGlobal;

  const ScopeIcon = isGlobal ? MdOutlinePublic : MdOutlineMenuBook;

  return (
    <div
      // The scope can change from the ⋮ menu, which announces nothing on close.
      // Without this the banner answers "which scope am I in" only on a fresh
      // read of the header.
      role='status'
      aria-live='polite'
      className={clsx(
        'eink-bordered mb-1 flex w-full items-center gap-2 rounded-lg border-s-4 px-2.5 py-1',
        // Tinted by reach: blue for the global defaults, amber for a change
        // confined to one book.
        //
        // Blue rather than red for global, because global is the ORDINARY
        // state — it is what nearly every reader sees on every open. A standing
        // red bar for the normal case reads as a warning that never goes away,
        // and DESIGN.md asks for colour discipline: "Brand color is rare.
        // Neutral palette carries the weight."
        //
        // Blue against amber also separates far better than red against amber,
        // which is the worst possible pair for deutan and protan vision (~8% of
        // men). `themeVariables` sets --color-info and --color-warning from one
        // STATE_COLORS table for every theme, built-in or custom, so both tints
        // are identical everywhere and no palette can override them.
        isGlobal ? 'border-info bg-info/15' : 'border-warning bg-warning/10',
      )}
    >
      <ScopeIcon className='text-base-content h-4 w-4 shrink-0' aria-hidden='true' />
      <span className='text-base-content min-w-0 flex-1 truncate text-[0.8em]'>
        {/* Both states name a scope, and the book state names what it
            overrides. "Global Settings" is the same wording as the Settings
            Menu item that carries this flag, so the two never read as
            different things — and it needs no new translation.

            The book's title is deliberately absent. The row truncates to one
            line, and a title pushed the clause off the end on a narrow dialog,
            losing the part that carries the meaning. The reader opened the
            book, so its name is reassurance rather than information. */}
        {alwaysGlobal
          ? _('Always Global Settings')
          : isGlobal
            ? _('Global Settings')
            : _('This Book — Overrides Global Settings')}
      </span>
    </div>
  );
};

export default SettingsScopeBanner;
