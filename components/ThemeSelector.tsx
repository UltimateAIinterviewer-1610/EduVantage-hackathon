import React, { useEffect, useState } from 'react';

type ThemeChoice = 'device' | 'light' | 'dark';
const storageKey = 'eduvantage-theme';
const readChoice = (): ThemeChoice => {
  try {
    const saved = localStorage.getItem(storageKey);
    return saved === 'light' || saved === 'dark' ? saved : 'device';
  } catch { return 'device'; }
};

export default function ThemeSelector({ className = '' }: { className?: string }) {
  const [choice, setChoice] = useState<ThemeChoice>(readChoice);
  useEffect(() => {
    const media = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    const apply = () => { document.documentElement.dataset.theme = choice === 'device' ? (media?.matches ? 'dark' : 'light') : choice; };
    apply();
    media?.addEventListener('change', apply);
    return () => media?.removeEventListener('change', apply);
  }, [choice]);
  const change = (value: ThemeChoice) => {
    setChoice(value);
    try { localStorage.setItem(storageKey, value); } catch { /* The current session can still use the selected theme. */ }
  };
  return <label className={`theme-selector ${className}`}><span>Appearance</span><select aria-label="Appearance" value={choice} onChange={event => change(event.target.value as ThemeChoice)}><option value="device">Device</option><option value="light">Light</option><option value="dark">Dark</option></select></label>;
}
