// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// studioApi - call the site's own /api/studio/* routes with the Studio session
// (PORTS.md card 114)
// =============================================================================
// Every /api/studio/* route checks the caller with Sanity (src/lib/studio-auth.ts),
// so the Studio sends its own session token as a bearer. The signed-in embedded
// Studio keeps it in localStorage under __studio_auth_token_<projectId> (the
// spike in docs/agent/studio-kit.md); the client config carries it when set.
// Same logic as "Try again" in src/sanity/kit/shared.tsx, kept separate so the
// workflow tools do not reach into the kit's internals.
// =============================================================================

export const WORKFLOW_API_VERSION = '2025-02-19';

type ClientLike = { config: () => { token?: string; projectId?: string } };

export function studioToken(client: ClientLike): string | null {
  const cfg = client.config();
  if (cfg.token) return cfg.token;
  try {
    const raw = window.localStorage.getItem(`__studio_auth_token_${cfg.projectId}`);
    const parsed = raw ? (JSON.parse(raw) as { token?: string }) : null;
    return parsed?.token ?? null;
  } catch {
    return null;
  }
}

export interface ApiAnswer<T> {
  status: number;
  body: T & { ok?: boolean; error?: string };
}

/** fetch() a same-origin /api/studio/* route with the session token. Never throws. */
export async function studioApi<T>(
  client: ClientLike,
  path: string,
  init: { method?: 'GET' | 'POST'; body?: unknown } = {},
): Promise<ApiAnswer<T>> {
  const token = studioToken(client);
  try {
    const res = await fetch(path, {
      method: init.method ?? 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: 'no-store',
    });
    const body = (await res.json().catch(() => ({}))) as ApiAnswer<T>['body'];
    return { status: res.status, body };
  } catch {
    return {
      status: 0,
      body: {
        ok: false,
        error: 'The website did not answer. Check the connection.',
      } as ApiAnswer<T>['body'],
    };
  }
}
