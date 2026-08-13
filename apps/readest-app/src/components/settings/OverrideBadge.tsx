import React from 'react';
import { MdOutlineRestartAlt } from 'react-icons/md';

interface OverrideBadgeProps {
  /** Tooltip / accessible name. Supplied by `useScopedLabel` so the string
   *  stays in one place for extraction. */
  title: string;
  onReset: () => void;
}

/**
 * Marks a settings row whose value this book overrides, and resets it.
 *
 * Rendered inside the row label, which for switch rows is inside a `<label>` —
 * hence the preventDefault/stopPropagation, without which a click would also
 * flip the toggle the badge sits next to.
 *
 * The dot is the at-a-glance signal on color themes; the restart glyph carries
 * the same meaning on e-ink, where `warning` flattens to a pale grey.
 */
const OverrideBadge: React.FC<OverrideBadgeProps> = ({ title, onReset }) => {
  const handleClick = (e: React.MouseEvent) => {
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

export default OverrideBadge;
