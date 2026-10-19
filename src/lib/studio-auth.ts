// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// Is this request from someone signed in to the Studio? (PORTS.md card 111)
// =============================================================================
// The first /api/studio/* route (deploy-status) needs to know that a POST came
// from the embedded Studio, from a person who is a member of this Sanity
// project. Two checks, both required:
//
//   1. Same origin. The Studio is embedded at /studio on the site itself, so a
//      genuine request carries the site's own Origin (or Sec-Fetch-Site:
//      same-origin). Anything else is refused before a token is even read.
//   2. A Sanity session. The signed-in Studio keeps its token in localStorage
//      (Sanity's default login; the spike in docs/agent/studio-kit.md) and the
//      kit sends it as `Authorization: Bearer`. The Worker asks Sanity who that
//      is (`/users/me` on THIS project's API host); a member comes back with
//      at least one project role. The token is never stored or logged.
//
// Pure apart from the one fetch, which is injectable for the tests in
// src/lib/studio-auth.test.ts.
// =============================================================================

/** Does the request come from the site's own pages (the embedded Studio)? */
export function isSameOrigin(request: Request): boolean {
  const own = new URL(request.url).origin;
  const origin = request.headers.get('Origin');
  if (origin) return origin === own;
  return request.headers.get('Sec-Fetch-Site') === 'same-origin';
}

/** The bearer token, or null. */
export function bearerToken(request: Request): string | null {
  const m = /^Bearer\s+(\S+)$/i.exec(request.headers.get('Authorization') ?? '');
  return m ? m[1] : null;
}

export interface StudioUser {
  id: string;
  name?: string;
  /** The member's role names on this project ("administrator", "editor", "viewer"...). Card 125. */
  roles: string[];
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * Ask Sanity whose token this is. A project member has an id and at least one
 * role on the project; anything else (no token, a stranger, Sanity down) is
 * null, which the route turns into a 401.
 */
export async function verifyStudioUser(
  token: string | null,
  projectId: string | undefined,
  fetchImpl: FetchLike = fetch,
): Promise<StudioUser | null> {
  if (!token || !projectId || !/^[a-z0-9]+$/i.test(projectId)) return null;
  try {
    const res = await fetchImpl(`https://${projectId}.api.sanity.io/v2025-02-19/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const me = (await res.json()) as {
      id?: string;
      name?: string;
      role?: string;
      roles?: Array<{ name?: string }>;
    };
    const roles = [
      ...(Array.isArray(me.roles) ? me.roles.map((r) => r?.name ?? '').filter(Boolean) : []),
      ...(me.role ? [me.role] : []),
    ];
    const hasRole = (Array.isArray(me.roles) && me.roles.length > 0) || Boolean(me.role);
    return me.id && hasRole ? { id: me.id, name: me.name, roles } : null;
  } catch {
    return null;
  }
}
