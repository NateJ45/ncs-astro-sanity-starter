// Safe to edit by hand
// Email widget. The primary click target is a mailto: link that opens the
// visitor's mail client with a draft to the studio. A small adjacent icon button
// copies the address to the clipboard for visitors who'd rather paste.
//
// Component name kept as CopyEmailButton for now so all import sites stay
// stable — the behavior shifted, not the API. Used in Footer + Contact page.
// Requires sonner <Toaster /> in BaseLayout for the copy confirmation toast.

import { useState } from 'react';
import type { MouseEvent } from 'react';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  email: string;
  /** Visible label override. Defaults to the email address itself. */
  label?: string;
  /** Style variant. "link" is an inline mailto link with a small copy icon; "button" is a bordered button that opens the mail draft on click. */
  variant?: 'link' | 'button';
}

export default function CopyEmailButton({ email, label, variant = 'link' }: Props) {
  const [copied, setCopied] = useState(false);

  async function copyToClipboard(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      toast.success('Email copied to clipboard', { duration: 2000 });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Clipboard API requires HTTPS or localhost; on failure, fall back to
      // launching the mail client with the address pre-filled.
      window.location.href = `mailto:${email}`;
    }
  }

  if (variant === 'button') {
    // Full bordered button. Click opens the mail draft. No copy affordance
    // here — the button itself is the call to action.
    return (
      <a
        href={`mailto:${email}`}
        className="inline-flex items-center gap-2 px-m py-s border border-primary text-link hover:bg-muted transition-colors"
      >
        <span>{label ?? email}</span>
      </a>
    );
  }

  // Link variant: the email text is a mailto link, with a small copy icon
  // button beside it for clipboard fallback.
  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      <a
        href={`mailto:${email}`}
        className="text-link hover:text-primary-dark underline underline-offset-2 transition-colors"
      >
        {label ?? email}
      </a>
      <button
        type="button"
        onClick={copyToClipboard}
        aria-label={`Copy ${email} to clipboard`}
        title="Copy email address"
        className="inline-flex h-7 w-7 items-center justify-center rounded text-foreground/55 hover:text-link hover:bg-accent transition-colors"
      >
        {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      </button>
    </span>
  );
}
