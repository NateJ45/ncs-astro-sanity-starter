# PrimeReact unstyled escape hatch

## When to reach for PrimeReact

PrimeReact is the sanctioned escape hatch for complex behavior-heavy widgets that have no Radix UI / shadcn equivalent and where building from scratch would cost significant time.

Good candidates:
- Rich data table with sorting, filtering, and pagination (`DataTable`)
- Tree select / cascading select (`TreeSelect`, `CascadeSelect`)
- File upload with progress and drag-drop zone (`FileUpload`)
- Complex date/time range picker (`Calendar` with range mode)
- Complex multi-step wizard / stepper (`Steps`)

Do NOT use PrimeReact for:
- Accordions, dialogs, dropdowns, tabs, tooltips -- Radix + shadcn or Starwind cover these at near-zero JS cost
- Marketing layout blocks -- copy from shadcnblocks, Tailark, or HyperUI
- Anything a static Astro component can render without JS

## Integration pattern

1. Wrap each island root in `PrimeIsland` from `./PrimeIsland.tsx` (this enables unstyled mode).
2. Style via the Tailwind passthrough config in `./passthrough.ts` -- all classes reference semantic tokens so the apply-brand reskin propagates automatically.
3. Import `PrimeIsland` only in the specific island that needs it. No page-level imports; zero bundle impact on pages that do not use PrimeReact.

```tsx
// Example: ComplexTable.tsx
import PrimeIsland from '@/components/primereact/PrimeIsland';
import { pt } from '@/components/primereact/passthrough';
import { DataTable } from 'primereact/datatable';

export default function ComplexTable({ data }: Props) {
  return (
    <PrimeIsland>
      <DataTable value={data} pt={pt.datatable} ... />
    </PrimeIsland>
  );
}
```

```astro
<!-- In .astro page -->
<ComplexTable data={rows} client:visible />
```

## Community passthrough baseline

The `passthrough.ts` in this folder covers Button, InputText, and Dialog as a minimal copyable pattern. For a fuller baseline covering 80+ components, see:

https://github.com/primefaces/primereact-tailwind

Copy individual component passthrough objects from that repo, then replace any hardcoded Tailwind palette classes (like `bg-blue-500`) with the repo's semantic token classes (`bg-primary`, `text-foreground`, `border-border`, `ring-ring`) so they recolor correctly when apply-brand runs.

## Installed version

`primereact` v10.9.8 -- stable, React 19 compatible peer dep. PrimeReact v11 is in alpha as of June 2026; upgrade when it reaches stable. The install is `primereact` on npm; the provider is imported from `primereact/api`.
