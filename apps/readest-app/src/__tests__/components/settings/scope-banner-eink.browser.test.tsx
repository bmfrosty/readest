/**
 * The scope banner's whole design rests on one claim: colour is never the
 * signal, so the banner still reads on an e-ink screen where every tint
 * flattens. Nothing in the unit suite can check that — vitest does not evaluate
 * CSS — so every e-ink statement in this change was reasoned from `globals.css`
 * rather than observed. This observes it.
 *
 * Two facts are asserted, and they pull in opposite directions:
 *
 *   - The banner carries `eink-bordered`, so on e-ink its blue/amber wash and
 *     its 4px inline-start edge are BOTH replaced by a uniform 1px base-content
 *     border on base-100. That is intended: it is what forces the icon and the
 *     sentence to carry the scope.
 *   - The row marker's `text-error` has NO e-ink rule, so the red survives in
 *     the DOM. On real e-ink hardware it renders as grey, which is why the
 *     marker cannot distinguish "contradicts the banner" from "does not" there.
 *     That gap is recorded in the PR; this pins the mechanism so it is not
 *     mistaken for a fix later.
 */

import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { page } from 'vitest/browser';

await import('@/styles/globals.css');

beforeAll(async () => {
  await page.viewport(800, 600);
});
afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute('data-eink');
  document.documentElement.removeAttribute('data-theme');
});

const measure = (eink: boolean) => {
  document.documentElement.setAttribute('data-theme', 'default-light');
  if (eink) document.documentElement.setAttribute('data-eink', 'true');
  const { container } = render(
    <>
      {/* The banner, in each scope, with the classes it really carries. */}
      <div
        data-testid='global'
        className='eink-bordered border-info bg-info/15 mb-1 flex w-full rounded-lg border-s-4 px-2.5 py-1'
      />
      <div
        data-testid='book'
        className='eink-bordered border-warning bg-warning/10 mb-1 flex w-full rounded-lg border-s-4 px-2.5 py-1'
      />
      {/* The row marker, in the scope where it reddens. */}
      <div data-testid='marker' className='text-error' />
    </>,
  );
  const el = (id: string) => container.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;
  const read = (id: string) => {
    const s = getComputedStyle(el(id));
    return {
      bg: s.backgroundColor,
      border: s.borderInlineStartColor,
      width: s.borderInlineStartWidth,
    };
  };
  return {
    global: read('global'),
    book: read('book'),
    marker: getComputedStyle(el('marker')).color,
  };
};

describe('the scope banner on e-ink', () => {
  it('shows two different tints on a normal screen', () => {
    const { global, book } = measure(false);

    expect(global.bg).not.toBe(book.bg);
    expect(global.border).not.toBe(book.border);
    // The saturated inline-start bar the design relies on.
    expect(global.width).toBe('4px');
  });

  it('flattens both scopes to the same surface on e-ink', () => {
    const { global, book } = measure(true);

    // This is the point: with the tint gone, only the icon and the sentence
    // remain to tell the two apart.
    expect(global.bg).toBe(book.bg);
    expect(global.border).toBe(book.border);
    expect(global.width).toBe('1px');
  });

  it('leaves the row marker coloured, which is why it cannot carry the contradiction', () => {
    const normal = measure(false).marker;
    cleanup();
    document.documentElement.removeAttribute('data-eink');
    const eink = measure(true).marker;

    // No e-ink rule matches `text-error`, so the value is unchanged. On real
    // e-ink hardware it renders grey, and the marker reads the same in both
    // scopes. Recorded as a known gap.
    expect(eink).toBe(normal);
  });
});
