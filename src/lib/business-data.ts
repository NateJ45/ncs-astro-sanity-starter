// Safe to edit by hand
// The one way a component reads the business facts (PORTS.md card 196): the
// site settings query (one memoized Sanity read per build, which folds in
// Business info) through resolveBusinessFacts(). With Sanity empty every fact
// is absent and nothing new renders. A church site would add its own layer on
// top (first-baptist-auburn's church-data.ts is the model).
import { getSiteSettings } from '@/lib/queries';
import {
  resolveBusinessFacts,
  type BusinessFacts,
  type RawBusinessFacts,
} from '@/lib/business-facts';

let _facts: Promise<BusinessFacts> | null = null;

/** The site's facts, resolved once per build. */
export function getBusinessFacts(): Promise<BusinessFacts> {
  _facts ??= getSiteSettings().then((s: RawBusinessFacts | null) => resolveBusinessFacts(s));
  return _facts;
}

/**
 * The facts a block draws: its own fixture facts when the styleguide wall
 * passes some (so the thumbnail and the tests have hours to show), else the
 * site's. A block in a real page never carries facts.
 */
export async function factsFor(fixture?: RawBusinessFacts | null): Promise<BusinessFacts> {
  return fixture ? resolveBusinessFacts(fixture) : getBusinessFacts();
}
