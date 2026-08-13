import clsx from 'clsx';
import React from 'react';
import { MdOutlineMenuBook, MdOutlinePublic } from 'react-icons/md';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettingsScope } from './SettingsScopeContext';

/**
 * States which of the two settings scopes the open panel writes to, and
 * switches it in place (#5632).
 *
 * It lives in the dialog header rather than the scrolling body so the answer to
 * "am I changing this book or every book?" is on screen while the reader is
 * changing things — the failure this replaces was a font silently landing on
 * one book only.
 */
const SettingsScopeBanner: React.FC = () => {
  const _ = useTranslation();
  const scope = useSettingsScope();
  if (!scope) return null;

  const { canScopeToBook, isGlobal, bookTitle, setGlobal } = scope;
  const ScopeIcon = isGlobal ? MdOutlinePublic : MdOutlineMenuBook;

  const scopeButtonClass = (active: boolean) =>
    clsx(
      'rounded-full px-2 py-0.5 text-[0.75em] transition-colors duration-150',
      active ? 'bg-base-100 text-base-content' : 'text-base-content/60 hover:text-base-content',
    );

  return (
    <div
      className={clsx(
        'eink-bordered mb-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-1',
        // The book scope is the surprising one, so it is the one that gets a
        // tint. Global stays a plain View-tier surface (DESIGN.md §3).
        isGlobal ? 'bg-base-200/40' : 'bg-warning/10',
      )}
    >
      <ScopeIcon className='text-base-content/70 h-4 w-4 shrink-0' aria-hidden='true' />
      <span className='text-base-content/70 min-w-0 flex-1 truncate text-[0.8em]'>
        {isGlobal
          ? _('Global defaults — applies to all books')
          : _('This book: {{title}} — overrides only', { title: bookTitle })}
      </span>
      {canScopeToBook && (
        <div
          role='group'
          aria-label={_('Settings Scope')}
          className='bg-base-200/60 eink-bordered flex shrink-0 rounded-full p-0.5'
        >
          <button
            type='button'
            aria-pressed={isGlobal}
            onClick={() => setGlobal(true)}
            className={scopeButtonClass(isGlobal)}
          >
            {_('All Books')}
          </button>
          <button
            type='button'
            aria-pressed={!isGlobal}
            onClick={() => setGlobal(false)}
            className={scopeButtonClass(!isGlobal)}
          >
            {_('This Book')}
          </button>
        </div>
      )}
    </div>
  );
};

export default SettingsScopeBanner;
