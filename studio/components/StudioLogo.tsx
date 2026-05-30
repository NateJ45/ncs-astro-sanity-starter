// StudioLogo.tsx — Brand logo for the Sanity Studio header.
// Rendered as a small image in the top-left of the Studio UI.
// Sanity Studio uses Vite, which handles PNG imports as URL strings.
// Safe to edit by hand.

import React from 'react';
// Vite resolves this PNG import to a URL string at build time; the *.png
// ambient declaration in studio/global.d.ts types it, so no @ts-ignore needed.
import logoUrl from '../reid-logo.png';

export default function StudioLogo() {
  return (
    <img
      src={logoUrl as string}
      alt="Reid Design"
      style={{
        height: '1.25rem',
        width: 'auto',
        display: 'block',
      }}
    />
  );
}
