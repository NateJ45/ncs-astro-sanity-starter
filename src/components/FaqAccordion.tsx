// Safe to edit by hand
// React island wrapping shadcn Accordion. Renders FAQs either flat (Process page,
// where each item is scoped to alsoShowOnProcessPage) or grouped by category
// (FAQ page, where categoryOrder determines section order).
//
// `type="multiple"` lets visitors keep several questions open at once — the right
// UX for FAQ pages. The shadcn primitive handles ARIA semantics (Disclosure pattern)
// and keyboard nav for free.
//
// Hydrate with client:visible — FAQ is below-the-fold on every page that uses it.

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import PortableText from '@/components/PortableText';

interface FaqItem {
  question?: string;
  answer?: any;
  category?: string;
  displayOrder?: number;
}

interface Props {
  faqs?: FaqItem[] | null;
  /** When provided, group items by category in this order. Omit for a single flat list. */
  categoryOrder?: string[] | null;
  /** Stable id prefix so multiple FaqAccordion instances on a page don't collide. */
  idPrefix?: string;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function FaqAccordion({ faqs, categoryOrder, idPrefix = 'faq' }: Props) {
  const list = (faqs ?? []).filter((f) => f?.question);
  if (list.length === 0) return null;

  // Group by category. Falls back to a single "All" bucket when no categoryOrder is given.
  const grouped = new Map<string, FaqItem[]>();
  for (const item of list) {
    const key = item.category ?? '__all__';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(item);
  }
  // Sort within each group by displayOrder (stable, ascending).
  for (const [, items] of grouped) {
    items.sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));
  }

  // Resolve the section order. If categoryOrder is provided, use it; drop any categories
  // that have no matching items, and append any categories present in the data but missing
  // from the order list (so editors can't accidentally hide questions by forgetting to add
  // a category to the order).
  let sections: Array<{ category: string | null; items: FaqItem[] }> = [];
  if (categoryOrder && categoryOrder.length > 0) {
    const orderedKeys = new Set(categoryOrder);
    for (const key of categoryOrder) {
      const items = grouped.get(key);
      if (items && items.length > 0) sections.push({ category: key, items });
    }
    for (const [key, items] of grouped) {
      if (!orderedKeys.has(key) && items.length > 0) {
        sections.push({ category: key, items });
      }
    }
  } else {
    // Flat list — all categories merged. Use a single null-category section.
    const flat = Array.from(grouped.values()).flat();
    sections = [{ category: null, items: flat }];
  }

  return (
    <div className="space-y-section-lg">
      {sections.map((section, sectionIdx) => {
        const sectionId = section.category
          ? `${idPrefix}-${slugify(section.category)}`
          : `${idPrefix}-section-${sectionIdx}`;
        // A11y notes:
        //   1. When section.category exists we render a visible H2 (one level
        //      below the page H1 — these category labels ARE major page
        //      sections, e.g. "Pricing & Cost", "The Process"). The audit
        //      caught the previous H1→H3 jump.
        //   2. When there's no category (e.g. /process FAQ section) the
        //      heading isn't rendered, so we switch from aria-labelledby
        //      (which would point at a non-existent id) to aria-label. This
        //      fixes the dangling reference the audit flagged on /process.
        return (
          <section
            key={sectionId}
            {...(section.category
              ? { 'aria-labelledby': `${sectionId}-heading` }
              : { 'aria-label': 'Common questions' })}
          >
            {section.category && (
              <h2
                id={`${sectionId}-heading`}
                className="font-display text-h3 text-foreground mb-m"
              >
                {section.category}
              </h2>
            )}
            <Accordion
              type="multiple"
              className="border-t border-border-soft"
            >
              {section.items.map((item, i) => {
                const itemId = `${sectionId}-item-${i}`;
                return (
                  <AccordionItem key={itemId} value={itemId} className="border-b border-border-soft">
                    {/* Question text — bumped to h3 scale (Cormorant) so the
                        question reads as the structural heading it is, not as
                        a button label. Hover stays bronze for affordance. */}
                    <AccordionTrigger className="py-m text-left font-display text-h3 text-foreground hover:no-underline hover:text-link">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-foreground/85 text-base leading-relaxed">
                      <PortableText value={item.answer} />
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </section>
        );
      })}
    </div>
  );
}
