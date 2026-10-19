// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// /api/studio/ai/ - one writing suggestion for the Studio (PORTS.md card 123)
// =============================================================================
// GET  -> { configured }   Public: says only whether the buttons can work, so
//                          the Studio can say "Not set up yet" instead of failing.
// POST { task, title?, context?, text?, assetRef? }
//      -> { ok: true, text } | { ok: false, error }
//      Guarded exactly like /api/studio/deploy-status/ and fails closed:
//        1. Same origin (the embedded Studio's own pages), else 403.
//        2. A Sanity session that /users/me confirms is a member of this
//           project (src/lib/studio-auth.ts), else 401.
//        3. Set up (the secret below), else 503.
//        4. At most AI_HOURLY_LIMIT suggestions per person per hour, else 429.
//        5. A well-formed request, else 400.
//      Then ONE call to the Claude API; its answer goes back as a suggestion.
//      This route never writes to the dataset and never publishes anything:
//      the editor accepts, edits or ignores the words in the Studio.
//
// THE WORKER'S SETTINGS:
//   ANTHROPIC_API_KEY  secret (`npx wrangler secret put ANTHROPIC_API_KEY`). A
//                      key from console.anthropic.com for this site only. Set a
//                      monthly spend limit on that account (OPERATIONS.md,
//                      "Writing help"). Never sent to the browser, never logged.
//   AI_HOURLY_LIMIT    optional var, suggestions per person per hour (default 30).
//
// LOGGING: the task, the outcome and the status only. Never the page's words,
// the suggestion, the picture, the person or the key.
// =============================================================================

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { site } from '@/data/site';
import {
  ANTHROPIC_URL,
  anthropicHeaders,
  buildMessagesRequest,
  createRateLimiter,
  hourlyLimit,
  parseAiInput,
  readSuggestion,
  type MessagesAnswer,
} from '@/lib/studio-ai';
import { bearerToken, isSameOrigin, verifyStudioUser } from '@/lib/studio-auth';

export const prerender = false;

interface AiEnv {
  ANTHROPIC_API_KEY?: string;
  AI_HOURLY_LIMIT?: string;
}

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra },
  });

const apiKey = () => (env as unknown as AiEnv).ANTHROPIC_API_KEY?.trim() || null;

// Per Worker instance; see createRateLimiter for why that is enough.
let limiter: ReturnType<typeof createRateLimiter> | null = null;
const limiterFor = () =>
  (limiter ??= createRateLimiter(hourlyLimit((env as unknown as AiEnv).AI_HOURLY_LIMIT)));

export const GET: APIRoute = async () => json({ configured: Boolean(apiKey()) });

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOrigin(request)) return json({ ok: false, error: 'Not allowed.' }, 403);
  const user = await verifyStudioUser(
    bearerToken(request),
    import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  );
  if (!user)
    return json({ ok: false, error: 'Sign in to the Studio again, then try once more.' }, 401);

  const key = apiKey();
  if (!key) return json({ ok: false, error: 'Writing help is not set up yet.' }, 503);

  const turn = limiterFor().take(user.id);
  if (!turn.ok) {
    const minutes = Math.max(1, Math.ceil(turn.retryAfter / 60));
    return json(
      {
        ok: false,
        error: `That is a lot of suggestions for one hour. Try again in about ${minutes} minute${minutes === 1 ? '' : 's'}.`,
      },
      429,
      { 'Retry-After': String(turn.retryAfter) },
    );
  }

  const parsed = parseAiInput(await request.json().catch(() => null));
  if (!parsed.ok) return json({ ok: false, error: parsed.error }, 400);
  const built = buildMessagesRequest(parsed.input, {
    brand: site.name,
    projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
    dataset: import.meta.env.PUBLIC_SANITY_DATASET || 'production',
  });
  if (!built.ok) return json({ ok: false, error: built.error }, 400);

  const task = parsed.input.task;
  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: anthropicHeaders(key),
      body: JSON.stringify(built.body),
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) {
      console.error(`studio-ai: ${task}: Claude API answered ${res.status}`);
      const busy = res.status === 429 || res.status === 529;
      return json(
        {
          ok: false,
          error: busy
            ? 'Writing help is busy just now. Try again in a minute.'
            : 'Writing help did not answer just now. Try again later.',
        },
        502,
      );
    }
    const answer = readSuggestion((await res.json()) as MessagesAnswer);
    console.log(`studio-ai: ${task}: ${answer.ok ? 'suggested' : 'no suggestion'}`);
    return answer.ok ? json({ ok: true, text: answer.text }) : json(answer, 422);
  } catch (err) {
    console.error(`studio-ai: ${task}: ${err instanceof Error ? err.name : 'fetch failed'}`);
    return json(
      { ok: false, error: 'Writing help did not answer just now. Try again later.' },
      502,
    );
  }
};
