// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// Safe rename - file a redirect automatically when a web address changes
// =============================================================================
// THE PROBLEM this closes: an editor changes a page's web address and every
// bookmark, Google result, and link from another site quietly starts 404ing.
// The Redirects manager has always been there to fix that by hand, but it
// depends on someone remembering at exactly the wrong moment.
//
// THE FIX: wrap the stock Publish action. When the document being published
// already has a published version whose public path differs from the one about
// to go live, we create a `redirect` document (old path -> new path, permanent)
// FIRST, then hand off to the real Publish. Everything else about Publish is
// untouched - same label, same shortcut, same disabled/ready states - so this is
// purely additive.
//
// NO TYPE LIST. Which documents have a slug-derived address is already encoded
// in `pathForDoc()` (src/sanity/urls.ts): a type with a fixed path returns the
// same string before and after, so the comparison below is a no-op for it, and
// a type with no public page returns null. That keeps this file identical across
// every repo in the family while each repo keeps its own routes.
//
// WHEN IT FIRES: only on Publish, only when (a) a published version exists (a
// first publish has no old address to preserve), (b) both the old and the new
// document resolve to a public path, and (c) the two paths differ. Renaming a
// draft that was never published, or publishing an unrelated edit, does nothing.
//
// IT NEVER BLOCKS PUBLISH. If the redirect write fails for any reason (offline,
// permissions, a Sanity hiccup), we show a warning toast and publish anyway. The
// editor's change is the important part, and the redirect can be added by hand.
//
// The redirect it writes is published immediately (a plain `create`, not a
// draft), because the build-time reader in astro.config.mjs only sees published
// documents - a draft redirect would look filed and never fire.
// =============================================================================
import { useClient, type DocumentActionComponent, type DocumentActionProps } from 'sanity';
import { useToast } from '@sanity/ui';
import { pathForDoc } from '../urls';

const API = { apiVersion: '2026-05-01' } as const;

interface Client {
  fetch: <T>(query: string, params?: Record<string, unknown>) => Promise<T>;
  create: (doc: Record<string, unknown>) => Promise<unknown>;
  patch: (id: string) => {
    set: (v: Record<string, unknown>) => { commit: () => Promise<unknown> };
  };
}

/**
 * Create the old-path -> new-path redirect, unless one already covers that old
 * path. Also repoints any existing redirect that pointed AT the old path, so a
 * second rename leaves a clean one-hop map instead of a chain.
 *
 * Returns the old path when something was written, null when there was nothing
 * to do. Throws only on a genuine write failure (the caller catches).
 */
async function fileRedirect(
  client: Client,
  from: string,
  to: string,
  title: string | undefined,
): Promise<string | null> {
  // Never file a second redirect for the same old address - the existing one
  // (possibly hand-corrected by the editor) wins.
  const existing = await client.fetch<string | null>(
    '*[_type == "redirect" && from == $from][0]._id',
    { from },
  );

  if (!existing) {
    await client.create({
      _type: 'redirect',
      from,
      to,
      permanent: true,
      note: `Added automatically when "${title || 'a page'}" moved from ${from} to ${to}.`,
    });
  }

  // A -> B, then B -> C: repoint the older A -> B entry straight at C so
  // visitors take one hop, not two. Exact, published matches only.
  const stale = await client.fetch<string[]>(
    '*[_type == "redirect" && to == $from && from != $to]._id',
    { from, to },
  );
  await Promise.all((stale ?? []).map((id) => client.patch(id).set({ to }).commit()));

  return from;
}

// A wrapper component must keep a STABLE identity across renders, or React
// unmounts and remounts the action on every pass, losing the stock Publish
// action's own state (its "publishing..." spinner and disabled logic). The
// resolver in sanity.config.ts runs on every render, so memoize by the wrapped
// component itself.
const wrapped = new WeakMap<DocumentActionComponent, DocumentActionComponent>();

/**
 * Wrap the stock Publish action so a web-address change files a redirect first.
 * Identical to the original in every other respect.
 */
export function withSlugRedirect(publishAction: DocumentActionComponent): DocumentActionComponent {
  const cached = wrapped.get(publishAction);
  if (cached) return cached;

  const Wrapped: DocumentActionComponent = (props: DocumentActionProps) => {
    // Hooks first and unconditionally - the early return below must not change
    // how many hooks this component calls.
    const client = useClient(API) as unknown as Client;
    const toast = useToast();
    const original = publishAction(props);
    if (!original) return original;

    const next = props.draft ?? props.published;
    const from = props.published ? pathForDoc(props.type, props.published) : null;
    const to = pathForDoc(props.type, next);
    const title = (next as { title?: string } | null)?.title;

    return {
      ...original,
      onHandle: async () => {
        // Only a real rename of an already-published document is interesting.
        if (from && to && from !== to) {
          try {
            const filed = await fileRedirect(client, from, to, title);
            if (filed) {
              toast.push({
                status: 'success',
                title: 'Old link kept working',
                description: `Anyone using ${filed} will now be sent to the new address. You can see it under Redirects.`,
                duration: 8000,
              });
            }
          } catch (err) {
            console.error('[slug-redirect] could not file the redirect', err);
            toast.push({
              status: 'warning',
              title: 'Published, but the old link was not forwarded',
              description:
                'The page is live at its new address. Add a redirect by hand under Redirects so the old link keeps working.',
              duration: 12000,
            });
          }
        }
        // Publish exactly as it would have, whatever happened above.
        original.onHandle?.();
      },
    };
  };

  // Sanity keys actions by `action`; keeping it makes the wrapper a drop-in (it
  // stays the primary button and keeps the publish keyboard shortcut).
  Wrapped.action = publishAction.action;
  Wrapped.displayName = 'WithSlugRedirect(Publish)';

  wrapped.set(publishAction, Wrapped);
  return Wrapped;
}
