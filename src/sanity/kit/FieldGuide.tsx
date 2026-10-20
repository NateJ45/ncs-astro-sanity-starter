// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// "How to" beside a field (Studio kit, PORTS.md card 134)
// =============================================================================
// A global form.components.field wrapper. When the site's guides config names
// a Site Guide section for a field (kit.config.ts guide.forField, by field name
// or schema type; the map lives beside GUIDES_FOR_TYPE in guides/content.ts),
// a quiet "How to" chip sits after the field's description and opens that
// section in a dialog, in the guide's compact panel drawing.
//
// Cost: every field in every form passes through here, so the wrapper itself
// uses no hooks and does one cached lookup (fieldGuideLookup in
// src/lib/studio-kit.ts; the type chain is cached per schema type object). A
// field the map does not name gets props.renderDefault(props), untouched.
//
// The description slot is typed `string` in sanity 6.19 but is drawn as a
// child of a Text, so a node renders there. If an upgrade ever stops drawing
// it, the chip disappears and the field is otherwise unchanged.
// =============================================================================

import { useState, type ComponentType } from 'react';
import type { FieldProps, SchemaType } from 'sanity';
import { Dialog } from '@sanity/ui';
import { drawsOwnHeader, fieldGuideLookup, type FieldGuideLink } from '../../lib/studio-kit';
import type { GuideViewProps, KitConfig } from './types';
import { KitScope, Marker } from './ui';

/** A schema type's name and its ancestors' ('seoTitle' -> ['string']; an alias -> [alias, 'object']). */
const chains = new WeakMap<object, string[]>();
function typeChain(t: SchemaType | undefined): string[] {
  if (!t) return [];
  const hit = chains.get(t);
  if (hit) return hit;
  const names: string[] = [];
  for (let cur: SchemaType | undefined = t; cur && names.length < 8; cur = cur.type) {
    names.push(cur.name);
  }
  chains.set(t, names);
  return names;
}

/** The field wrapper for this site's config, or null when no field is mapped. */
export function makeFieldGuide(config: KitConfig): ComponentType<FieldProps> | null {
  const map = config.guide.forField;
  if (config.features.fieldHelp === false || !map) return null;
  const lookup = fieldGuideLookup(map);
  const known = new Set(config.guide.guides.map((g) => g.slug));

  // One view component per guide, made once, so reopening does not remount.
  const views = new Map<string, ComponentType<GuideViewProps>>();
  const viewFor = (slug: string) => {
    let v = views.get(slug);
    if (!v) {
      v = config.guide.view(slug);
      views.set(slug, v);
    }
    return v;
  };

  function GuideDialog({ link, onClose }: { link: FieldGuideLink; onClose: () => void }) {
    // "See also" inside the dialog opens that guide here, at its top.
    const [at, setAt] = useState<FieldGuideLink>(link);
    const guide = config.guide.guides.find((g) => g.slug === at.guide);
    const View = viewFor(at.guide);
    return (
      <Dialog
        id={`field-guide-${link.guide}`}
        header={guide ? `How to: ${guide.title}` : 'How to'}
        onClose={onClose}
        width={1}
      >
        <View
          variant="panel"
          section={at.section}
          onOpen={(slug) => known.has(slug) && setAt({ guide: slug })}
        />
      </Dialog>
    );
  }

  function HowTo({ link, field }: { link: FieldGuideLink; field: string }) {
    const [open, setOpen] = useState(false);
    return (
      <>
        <KitScope inline>
          <button
            type="button"
            className="ui-howto"
            aria-haspopup="dialog"
            aria-label={`How to: ${field}`}
            onClick={() => setOpen(true)}
          >
            <Marker scale={0.25} />
            How to
          </button>
        </KitScope>
        {open && <GuideDialog link={link} onClose={() => setOpen(false)} />}
      </>
    );
  }

  return function FieldGuideField(props: FieldProps) {
    const link = lookup(props.name, typeChain(props.schemaType));
    if (!link || !known.has(link.guide)) return props.renderDefault(props);
    // Card 142: Sanity 6's date and datetime inputs draw their OWN header (title,
    // description, time zone) from the schema type, so the description slot is never
    // shown and a chip put there never appears. Put the chip under the input instead.
    if (drawsOwnHeader(typeChain(props.schemaType))) {
      return (
        <>
          {props.renderDefault(props)}
          <div style={{ marginTop: 6 }}>
            <HowTo link={link} field={props.title || props.name} />
          </div>
        </>
      );
    }
    const description = (
      <>
        {props.description}
        <HowTo link={link} field={props.title || props.name} />
      </>
    );
    // See the header: the slot is typed string but renders a node.
    return props.renderDefault({ ...props, description: description as unknown as string });
  };
}
