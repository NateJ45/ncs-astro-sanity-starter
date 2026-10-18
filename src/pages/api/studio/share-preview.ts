// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// /api/studio/share-preview/ - sign a private preview link (PORTS.md card 114)
// =============================================================================
// The Studio's "Share a preview" dialog writes a share record (previewShare.<nonce>,
// with the document, its preview path and the expiry the editor picked), then
// POSTs the nonce here. This route checks the caller and the record and answers
// with the signed link. It never writes anything itself.
//
// GET  -> { configured }   Public: says only whether links can be made.
// POST { nonce } -> { ok: true, url, expiresAt } | { ok: false, error }
//      Same origin only, a signed-in Studio member only (src/lib/studio-auth.ts),
//      exactly as /api/studio/deploy-status/ does it. Fails closed: 403 / 401 /
//      503 (not set up) / 400 (bad record) / 502 (Sanity unreachable).
//
// THE WORKER'S SETTINGS:
//   SHARE_PREVIEW_SECRET  secret, 32+ characters (`npx wrangler secret put
//                         SHARE_PREVIEW_SECRET`; any long random string).
//                         Rotating it stops every link at once.
//   SANITY_TOKEN          the preview stack's existing read token.
// =============================================================================
import type { APIRoute } from 'astro';
import { payloadFromRecord, shareUrl, signShareToken } from '@/lib/preview-share';
import { readShareRecord, shareConfigured, shareSecret } from '@/lib/preview-share-server';
import { bearerToken, isSameOrigin, verifyStudioUser } from '@/lib/studio-auth';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export const GET: APIRoute = async () => json({ configured: shareConfigured() });

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOrigin(request)) return json({ ok: false, error: 'Not allowed.' }, 403);
  const user = await verifyStudioUser(
    bearerToken(request),
    import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  );
  if (!user)
    return json({ ok: false, error: 'Sign in to the Studio again, then try once more.' }, 401);
  if (!shareConfigured()) {
    return json({ ok: false, error: 'Preview links are not set up on this site yet.' }, 503);
  }

  const body = (await request.json().catch(() => null)) as { nonce?: unknown } | null;
  const nonce = body?.nonce;
  let record;
  try {
    record = typeof nonce === 'string' ? await readShareRecord(nonce) : null;
  } catch {
    return json({ ok: false, error: 'Could not reach the content store. Try again.' }, 502);
  }
  const checked = payloadFromRecord(nonce, record, Date.now());
  if (!checked.ok) return json({ ok: false, error: checked.error }, 400);

  const token = await signShareToken(checked.payload, shareSecret() as string);
  const origin = new URL(request.url).origin;
  console.log(`share-preview: link for ${checked.payload.d} signed by Studio user ${user.id}`);
  return json({
    ok: true,
    url: shareUrl(origin, checked.payload, token),
    expiresAt: new Date(checked.payload.e * 1000).toISOString(),
  });
};
