// Foundation, edit with care
// Three-state theme toggle: light → dark → system. Persists to
// localStorage (key from site.themeStorageKey). Anti-FOUC script in BaseLayout
// applies the resolved class on initial paint; this component only
// handles cycling and runtime re-application.

import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { site } from '@/data/site';

type Theme = 'light' | 'dark' | 'system';
const KEY = site.themeStorageKey;
const ORDER: Theme[] = ['light', 'dark', 'system'];

function applyTheme(theme: Theme) {
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  // Keep theme-aware images (header logo) in sync. The light/dark srcs are
  // pre-rendered by Astro at build time and stored on each img as data
  // attributes; we swap them here so toggling the theme doesn't leave a
  // light logo on a dark background (or vice versa).
  const imgs = document.querySelectorAll<HTMLImageElement>('img[data-theme-logo]');
  imgs.forEach((img) => {
    const nextSrc = dark ? img.dataset.logoDarkSrc : img.dataset.logoLightSrc;
    const nextSrcset = dark ? img.dataset.logoDarkSrcset : img.dataset.logoLightSrcset;
    if (nextSrc && img.src !== nextSrc) img.src = nextSrc;
    if (nextSrcset && img.srcset !== nextSrcset) img.srcset = nextSrcset;
  });
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    const stored = (localStorage.getItem(KEY) as Theme | null) ?? 'system';
    setTheme(stored);

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if ((localStorage.getItem(KEY) ?? 'system') === 'system') applyTheme('system');
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const cycle = () => {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    setTheme(next);
    localStorage.setItem(KEY, next);
    applyTheme(next);
  };

  const label =
    theme === 'light' ? 'Switch to dark mode'
    : theme === 'dark' ? 'Switch to system theme'
    : 'Switch to light mode';

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={label}
      title={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent transition-colors text-foreground"
    >
      {theme === 'light' && <Sun size={18} />}
      {theme === 'dark' && <Moon size={18} />}
      {theme === 'system' && <Monitor size={18} />}
    </button>
  );
}
