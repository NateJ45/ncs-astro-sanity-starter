// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// private-pages-server - the Worker half of password pages (PORTS.md card 122)
// =============================================================================
// Used only by src/pages/private/[slug].astro (server-rendered). The pure rules
// (hash, cookie, rate limit) are in src/lib/private-pages.ts. Never import this
// from a prerendered page: it reads the Worker runtime env.
//
// FAILS CLOSED. No PRIVATE_PAGE_SECRET, no SANITY_TOKEN, a read that throws, a
// page with no password set: every one of them shows the password form (or
// "not ready yet") and never the page.
// =============================================================================
import { env } from 'cloudflare:workers';
import { getPreviewClient } from '@/lib/cms-preview';
import { sectionsProjection, IMAGE_PROJECTION } from '@/lib/queries';
import {
  FailureLimiter,
  hashPassword,
  PBKDF2_ITERATIONS,
  isPasswordRecord,
  isPrivateSlug,
  isUsableSecret,
  PRIVATE_TYPE,
  type PasswordRecord,
} from '@/lib/private-pages';

interface PrivateEnv {
  PRIVATE_PAGE_SECRET?: string;
  SANITY_TOKEN?: string;
  /** LOCAL TESTS ONLY (.dev.vars): "1" serves the fixture page below. */
  PRIVATE_PAGE_TEST_FIXTURE?: string;
}

/**
 * The end-to-end test's page (tests/private-pages.spec.ts), served only when
 * PRIVATE_PAGE_TEST_FIXTURE=1 is in .dev.vars, so the gate can be tested
 * against `npm run preview` with no dataset. Never set it in production: it is
 * a page with a published password and placeholder words.
 */
export const FIXTURE_SLUG = 'test-private-page';
export const FIXTURE_PASSWORD = 'correct horse battery';
let fixtureRecord: Promise<PasswordRecord> | null = null;

function fixtureOn(): boolean {
  return (env as unknown as PrivateEnv).PRIVATE_PAGE_TEST_FIXTURE === '1';
}

async function fixturePage(): Promise<PrivatePageDoc> {
  fixtureRecord ??= hashPassword(FIXTURE_PASSWORD, { iterations: PBKDF2_ITERATIONS });
  return {
    _id: `privatePage.${FIXTURE_SLUG}`,
    title: 'Test private page',
    slug: FIXTURE_SLUG,
    password: await fixtureRecord,
    pageBuilder: [
      {
        _type: 'richTextSection',
        _key: 'fixture',
        heading: 'Private fixture content',
        body: [
          {
            _type: 'block',
            _key: 'b1',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 's1',
                text: 'Only people with the password see this.',
                marks: [],
              },
            ],
          },
        ],
      },
    ],
  };
}

export function privateSecret(): string | undefined {
  return (env as unknown as PrivateEnv).PRIVATE_PAGE_SECRET;
}

/** Both Worker secrets are in place. */
export function privatePagesConfigured(): boolean {
  const e = env as unknown as PrivateEnv;
  return isUsableSecret(e.PRIVATE_PAGE_SECRET) && (Boolean(e.SANITY_TOKEN) || fixtureOn());
}

/** One limiter per isolate (see FailureLimiter for what that does and does not give). */
export const limiter = new FailureLimiter();

export interface PrivatePageDoc {
  _id: string;
  title?: string;
  slug?: string;
  password?: PasswordRecord | null;
  pageBuilder?: unknown[];
}

/**
 * The PUBLISHED private page at this slug, read with the server token. Only
 * documents under the privatePage. id path count: a stray `privatePage` with
 * an ordinary id (made by a script, say) would be public in the dataset, so it
 * is treated as not there at all.
 */
export async function readPrivatePage(slug: string): Promise<PrivatePageDoc | null> {
  if (!isPrivateSlug(slug)) return null;
  if (fixtureOn() && slug === FIXTURE_SLUG) return fixturePage();
  const client = getPreviewClient(false).withConfig({ stega: false, perspective: 'published' });
  const doc = await client.fetch<PrivatePageDoc | null>(
    `*[_type == $type && slug.current == $slug && _id in path("privatePage.*")][0]{
      _id,
      title,
      "slug": slug.current,
      password,
      seoImage${IMAGE_PROJECTION},
      ${sectionsProjection('pageBuilder')}
    }`,
    { type: PRIVATE_TYPE, slug },
  );
  if (!doc) return null;
  return { ...doc, password: isPasswordRecord(doc.password) ? doc.password : null };
}

/**
 * Who is guessing: Cloudflare's connecting IP. (Astro.clientAddress THROWS in
 * the Cloudflare adapter, so it is not used.) No header at all, which only a
 * local run without Cloudflare sees, shares one bucket: still limited.
 */
export function visitorKey(request: Request, slug: string): string {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  return `${ip}|${slug}`;
}
