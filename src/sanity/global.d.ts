// Ambient module declarations for the Studio's Vite-bundled static imports.
// Vite resolves image imports to URL strings at build time; declaring the
// module here lets TypeScript type them as strings, so import sites don't
// need a per-line @ts-ignore. Picked up via the tsconfig "**/*.ts" include.

declare module '*.png' {
  const url: string;
  export default url;
}

declare module '*.jpg' {
  const url: string;
  export default url;
}

declare module '*.svg' {
  const url: string;
  export default url;
}
