// StudioLogo.tsx — Wordmark for the Sanity Studio header.
// Rendered in the top-left of the Studio UI in place of the default Sanity logo.
// Replace this with an <img> tag (and a real logo file) once you have brand assets.
// Safe to edit by hand.

import React from 'react';

export default function StudioLogo() {
  return (
    <span
      style={{
        fontFamily: 'system-ui, sans-serif',
        fontSize: '0.875rem',
        fontWeight: 600,
        letterSpacing: '0.04em',
        color: '#FBFBFA',
        whiteSpace: 'nowrap',
      }}
    >
      Studio Starter
    </span>
  );
}
