// Safe to edit by hand
// PrimeReact unstyled island wrapper.
//
// PURPOSE: provides the PrimeReactProvider context required by PrimeReact
// components, with unstyled mode enabled. Compose this around any PrimeReact
// widget island so its behavioral logic works while all visual styling comes
// from the Tailwind passthrough config in passthrough.ts (which references the
// repo's semantic tokens).
//
// USAGE in an .astro page:
//   import PrimeIsland from '@/components/primereact/PrimeIsland';
//   import { DataTable } from 'primereact/datatable'; // example
//   <PrimeIsland client:visible>
//     <DataTable ... />
//   </PrimeIsland>
//
// NOTE: this file is intentionally NOT imported by any page by default.
// PrimeReact carries a non-trivial JS payload; only add it when you need a
// behavior-heavy widget (rich table, tree select, file upload) that has no
// Radix/shadcn equivalent. See src/components/primereact/README.md.

import { PrimeReactProvider } from 'primereact/api';
import type { ReactNode } from 'react';

interface PrimeIslandProps {
  children: ReactNode;
}

/**
 * Thin provider wrapper that enables PrimeReact unstyled mode.
 * In unstyled mode, PrimeReact components receive no built-in CSS.
 * All styling is applied via the passthrough config.
 */
export default function PrimeIsland({ children }: PrimeIslandProps) {
  return (
    <PrimeReactProvider value={{ unstyled: true }}>
      {children}
    </PrimeReactProvider>
  );
}
