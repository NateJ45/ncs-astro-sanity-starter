// Foundation, edit with care
// Mobile nav drawer. Uses shadcn Sheet (Radix Dialog under the hood) so it
// must be hydrated with client:only="react" — Radix's portal hook calls during
// SSR throw "Invalid hook call" inside Astro.
//
// Layout (top to bottom inside the sheet):
//   1. Brand accent stripe (4px Warm Bronze) + "Menu" eyebrow
//   2. Primary CTA — Book a consultation
//   3. Tagline in display serif italic
//   4. Nav links — flat items are single rows; dropdown groups are a heading
//      row with indented sub-items underneath (always expanded on mobile,
//      no accordion needed — full-height drawers have plenty of room)
//   5. Spacer pushes the rest to the bottom
//   6. Email link with Mail icon
//   7. Social icons row (Instagram, Facebook) + ThemeToggle on the right
//   8. Logo centered at the bottom of the panel
//
// Data: tagline, email, social URLs all come from Sanity siteSettings via
// the Header, with sensible defaults so the menu renders cleanly before
// content is wired up.

import { useState } from 'react';
import { Menu, Mail, Phone, ChevronRight } from 'lucide-react';
import { IconBrandInstagram, IconBrandFacebook } from '@tabler/icons-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import ThemeToggle from './ThemeToggle';
import { telHref } from '@/lib/phone';

// ---- Types ------------------------------------------------------------------

interface FlatNavLink {
  kind: 'flat';
  label: string;
  href: string;
}

interface DropdownNavGroup {
  kind: 'dropdown';
  label: string;
  items: { label: string; href: string }[];
}

type NavItem = FlatNavLink | DropdownNavGroup;

interface MobileNavSiteSettings {
  tagline?: string;
  email?: string;
  phone?: string;
  socialInstagram?: string;
  socialFacebook?: string;
}

interface Props {
  links: NavItem[];
  siteSettings?: MobileNavSiteSettings | null;
  /**
   * Optimized logo URLs pre-rendered by Astro's getImage() in the parent
   * Header.astro. We can't import the asset directly in a React component
   * because client:only skips SSR entirely — so the parent does the work
   * once at build time and passes the resulting WebP URLs in as strings.
   */
  logoLightUrl?: string;
  logoDarkUrl?: string;
}

// ---- Component --------------------------------------------------------------

export default function MobileNav({ links, siteSettings, logoLightUrl, logoDarkUrl }: Props) {
  const [open, setOpen] = useState(false);

  const tagline =
    siteSettings?.tagline ??
    'Your tagline goes here.';
  const email = siteSettings?.email;
  const phone = siteSettings?.phone;
  const ig = siteSettings?.socialInstagram;
  const fb = siteSettings?.socialFacebook;

  const close = () => setOpen(false);

  return (
    <div className="lg:hidden absolute right-m top-1/2 -translate-y-1/2">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label="Open menu"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-foreground hover:bg-accent transition-colors"
          >
            <Menu size={22} />
          </button>
        </SheetTrigger>
        <SheetContent
          side="right"
          className="w-[min(380px,90vw)] sm:max-w-none bg-background border-t-4 border-t-primary p-0 gap-0 flex flex-col overflow-y-auto"
        >
          {/* Eyebrow header. */}
          <SheetHeader className="px-l pt-xl pb-m">
            <SheetTitle className="text-xs uppercase tracking-eyebrow text-foreground/80 font-body font-normal">
              Menu
            </SheetTitle>
          </SheetHeader>

          {/* Primary CTA — main conversion action surfaced before the nav list. */}
          <div className="px-l pb-l">
            <a
              href="/contact"
              onClick={close}
              className="block w-full px-m py-m text-center rounded-md bg-primary-dark text-white text-xs uppercase tracking-eyebrow font-semibold hover:bg-accent-dark transition-colors"
            >
              Book a consultation
            </a>
          </div>

          {/* Tagline in display serif for editorial feel. */}
          <p className="px-l pb-l font-display italic text-h4 text-foreground/85 leading-snug">
            {tagline}
          </p>

          {/* Primary nav — flat items + group headers with indented sub-items. */}
          <nav className="border-t border-border-soft py-s" aria-label="Primary mobile">
            {links.map((item) => {
              if (item.kind === 'flat') {
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={close}
                    className="flex items-center px-l py-s text-lg font-display text-foreground hover:bg-muted hover:text-link transition-colors"
                  >
                    {item.label}
                  </a>
                );
              }

              // Dropdown group — always expanded in the drawer (no accordion
              // needed; the drawer has scroll and the groups are small).
              return (
                <div key={item.label}>
                  {/* Group heading — visually distinct from flat items. Not
                      a link itself; the sub-items carry the real hrefs. */}
                  <p className="px-l pt-m pb-xs text-xs uppercase tracking-eyebrow text-foreground/80">
                    {item.label}
                  </p>
                  {item.items.map((sub) => (
                    <a
                      key={sub.href}
                      href={sub.href}
                      onClick={close}
                      className="flex items-center gap-xs pl-[calc(theme(spacing.l)+0.5rem)] pr-l py-xs text-base font-body text-foreground hover:bg-muted hover:text-link transition-colors"
                    >
                      <ChevronRight size={12} className="shrink-0 text-foreground/40" aria-hidden="true" />
                      {sub.label}
                    </a>
                  ))}
                </div>
              );
            })}
          </nav>

          {/* Spacer pushes the contact + logo block to the bottom. */}
          <div className="flex-1" />

          {/* Contact + socials + theme. */}
          <div className="border-t border-border-soft px-l pt-m pb-s">
            <p className="text-xs uppercase tracking-eyebrow text-foreground/80 mb-s">
              Get in touch
            </p>
            {email && (
              <a
                href={`mailto:${email}`}
                className="inline-flex items-center gap-s text-sm text-link hover:underline"
              >
                <Mail size={16} aria-hidden="true" />
                {email}
              </a>
            )}
            {phone && (
              <a
                href={telHref(phone)}
                className="mt-s flex items-center gap-s text-sm text-link hover:underline"
              >
                <Phone size={16} aria-hidden="true" />
                {phone}
              </a>
            )}

            <div className="mt-m flex items-center gap-s">
              {ig && (
                <a
                  href={ig}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-soft text-foreground hover:bg-primary-dark hover:text-white hover:border-primary-dark transition-colors"
                >
                  <IconBrandInstagram size={20} stroke={1.5} />
                </a>
              )}
              {fb && (
                <a
                  href={fb}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-soft text-foreground hover:bg-primary-dark hover:text-white hover:border-primary-dark transition-colors"
                >
                  <IconBrandFacebook size={20} stroke={1.5} />
                </a>
              )}
              <div className="ml-auto">
                <ThemeToggle />
              </div>
            </div>
          </div>

          {/* Logo at the bottom — brand-anchored close to the sheet's foot.
              URLs come from Astro's image pipeline via Header.astro's
              getImage() calls, so this is a WebP file with the same hash
              as the desktop header logo (free cache hit). */}
          {logoLightUrl && (
            <div className="border-t border-border-soft px-l py-l flex justify-center">
              <img
                src={logoLightUrl}
                alt="Studio Starter"
                width={280}
                height={60}
                className="block dark:hidden h-10 w-auto"
                loading="lazy"
                decoding="async"
              />
              {logoDarkUrl && (
                <img
                  src={logoDarkUrl}
                  alt=""
                  aria-hidden="true"
                  width={280}
                  height={60}
                  className="hidden dark:block h-10 w-auto"
                  loading="lazy"
                  decoding="async"
                />
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
