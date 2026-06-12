// Safe to edit by hand
// PrimeReact Tailwind passthrough baseline.
//
// PURPOSE: a minimal starting-point passthrough config for 3 common widgets,
// styled entirely with the repo's semantic token Tailwind classes so they
// participate in the one-pass apply-brand reskin. Copy and extend this
// pattern for any additional PrimeReact component you add.
//
// For a fuller community baseline covering 80+ components, see:
//   https://github.com/primefaces/primereact-tailwind
//
// USAGE:
//   import { pt } from '@/components/primereact/passthrough';
//   // Pass individual component passthrough directly:
//   <InputText pt={pt.inputtext} ... />
//   // Or spread the whole object via PrimeReactProvider:
//   <PrimeReactProvider value={{ unstyled: true, pt }}>
//
// TOKEN reference — all classes use the repo's :root semantic tokens so
// apply-brand.mjs rewrites propagate automatically:
//   bg-primary     = --primary (brand action color)
//   text-primary-foreground = --primary-foreground (text on primary bg)
//   bg-background  = --background (page surface)
//   text-foreground = --foreground (body text)
//   border-border  = --border (divider/input border)
//   ring-ring      = --ring (focus ring)
//   bg-muted       = --muted (quiet surface)
//   text-muted-foreground = --muted-foreground (secondary text)

export const pt = {

  // ------------------------------------------------------------------
  // InputText — single-line text input
  // ------------------------------------------------------------------
  inputtext: {
    root: {
      className: [
        'w-full px-3 py-2 rounded-md text-sm',
        'bg-background text-foreground',
        'border border-border',
        'placeholder:text-muted-foreground',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
      ].join(' '),
    },
  },

  // ------------------------------------------------------------------
  // Button — primary and secondary variants as a starting point
  // ------------------------------------------------------------------
  button: {
    root: ({ props }: { props: { severity?: string } }) => ({
      className: [
        'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md',
        'text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        // Map severity to semantic classes
        props.severity === 'secondary'
          ? 'bg-muted text-foreground hover:bg-accent'
          : 'bg-primary text-primary-foreground hover:bg-primary/90',
      ].join(' '),
    }),
    label: { className: 'font-medium' },
    icon: { className: 'shrink-0' },
    loadingIcon: { className: 'animate-spin' },
  },

  // ------------------------------------------------------------------
  // Dialog — modal dialog with overlay
  // ------------------------------------------------------------------
  dialog: {
    mask: {
      className: 'fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm',
    },
    root: {
      className: [
        'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
        'w-full max-w-lg',
        'bg-card text-card-foreground rounded-xl border border-border shadow-lg',
        'grid gap-0',
      ].join(' '),
    },
    header: {
      className: 'flex items-center justify-between p-6 pb-0',
    },
    title: {
      className: 'text-lg font-semibold text-foreground',
    },
    headerActions: {
      className: 'flex items-center gap-2',
    },
    closeButton: {
      className: [
        'rounded-md p-1 text-muted-foreground',
        'hover:text-foreground hover:bg-accent',
        'focus:outline-none focus:ring-2 focus:ring-ring',
      ].join(' '),
    },
    content: {
      className: 'p-6',
    },
    footer: {
      className: 'flex justify-end gap-2 p-6 pt-0',
    },
  },

} as const;
