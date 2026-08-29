// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// usePopover - Escape closes, Tab stays inside (2026-08-28)
// =============================================================================
// The two floating cards in this layer (the word picker and the text editor) owe
// the editor the same two keyboard promises any dialog does: Escape gets me out
// without saving, and Tab does not wander off into the page behind the card while
// it is open. Both are small, both are easy to get subtly wrong, so they live in
// one place and each card calls it once.
//
// The listener is on the CARD, not the document, so it cannot swallow an Escape
// meant for Presentation's own chrome when no card is open. The card gets focus
// on open (that is what makes Escape reach it at all) and hands focus back to the
// control that opened it on close, so the keyboard is never left nowhere.
// =============================================================================
import { useCallback, useEffect, type KeyboardEvent, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

export interface PopoverKeys {
  /** Spread onto the card element. */
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}

/**
 * Wire a card's keyboard behaviour. `onClose` is called for Escape, and for the
 * card losing focus is the caller's business (the text editor saves on blur, the
 * word picker just closes).
 */
export function usePopover(
  open: boolean,
  cardRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  autoFocus?: RefObject<HTMLElement | null>,
): PopoverKeys {
  // Focus the card, or the field inside it, as soon as it opens.
  useEffect(() => {
    if (!open) return;
    const target = autoFocus?.current ?? cardRef.current;
    target?.focus({ preventScroll: true });
  }, [open, cardRef, autoFocus]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const card = cardRef.current;
      if (!card) return;
      const focusable = [...card.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === card)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [cardRef, onClose],
  );

  return { onKeyDown };
}
