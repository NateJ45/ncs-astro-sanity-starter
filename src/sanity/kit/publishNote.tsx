// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// publishNote: "Published. The website updates in a few minutes."
// =============================================================================
// Ported from mas-monograms (2026-10-05) for the kit. The site is statically
// built (CLAUDE.md rule 6), so a Publish shows on the website only after the
// rebuild it triggers. Without a word from the Studio, "I pressed Publish and
// nothing changed" is the obvious conclusion. This wraps the stock Publish
// action and, once the publish has actually landed, says so, and points at
// Home's "Is it live?" card.
//
// NO BEHAVIOUR CHANGE: label, shortcut, disabled state and onHandle pass
// through untouched; the only addition is the toast. "Landed" means the draft
// has gone and the published copy carries a new revision, so a failed publish
// (which leaves the draft) never shows the note.
// =============================================================================

import { useEffect, useRef } from 'react';
import type { DocumentActionComponent, DocumentActionProps } from 'sanity';
import { useToast } from '@sanity/ui/toast';
import { PUBLISHED_EVENT } from './shared';
import { KitToastBody } from './ui';
import { liveSteps } from '../../lib/studio-look';

export const PUBLISHED_NOTE =
  'The website updates itself in a few minutes. Home shows "Up to date" once your change is live.';

const wrapped = new WeakMap<DocumentActionComponent, DocumentActionComponent>();

export function withPublishNote(publishAction: DocumentActionComponent): DocumentActionComponent {
  const cached = wrapped.get(publishAction);
  if (cached) return cached;

  const Wrapped: DocumentActionComponent = (props: DocumentActionProps) => {
    // Hooks first and unconditionally.
    const toast = useToast();
    const armed = useRef<string | null>(null);
    const original = publishAction(props);
    const draftRev = props.draft?._rev ?? null;
    const publishedRev = props.published?._rev ?? null;

    useEffect(() => {
      if (armed.current === null) return;
      if (!draftRev && publishedRev && publishedRev !== armed.current) {
        armed.current = null;
        // The navbar line and Home re-check soon after (PORTS.md card 110).
        window.dispatchEvent(new Event(PUBLISHED_EVENT));
        toast.push({
          status: 'success',
          title: 'Published',
          description: (
            <KitToastBody steps={liveSteps('on-its-way')}>{PUBLISHED_NOTE}</KitToastBody>
          ),
          duration: 12000,
          closable: true,
        });
      }
    }, [draftRev, publishedRev, toast]);

    if (!original) return original;
    return {
      ...original,
      onHandle: () => {
        armed.current = publishedRev ?? '';
        original.onHandle?.();
      },
    };
  };
  // Keep the stock identity, so anything filtering on `action === 'publish'`
  // (the singleton rules and the slug redirect in sanity.config.ts) still
  // sees a publish action.
  Wrapped.action = publishAction.action;
  Wrapped.displayName = 'PublishWithNote';
  wrapped.set(publishAction, Wrapped);
  return Wrapped;
}
