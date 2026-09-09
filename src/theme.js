// Shared visual theme for mantravibe.
// Dark grey base, pink primary accent, dark-blue secondary accent - now with a light mode.
// Centralizes the colors that used to be duplicated as inline hex literals
// across App.js, Header.js, FantamilioniBar.js, MantraGiocatoriTab.js,
// RosaAcquistata.js, SquadreTab.js, PlayerPage.js and Settings.js.
//
// The "surface" tokens below (bg/surface/.../textFaint) resolve to CSS custom properties
// instead of fixed hex values, so a single class="light"/no-class swap on <html> (see
// applyThemeMode() and the :root rules in index.css) re-colors every component that reads
// them - no per-component light/dark branching needed. Accent/status/role colors are shared
// by both modes (already legible on either background) and stay as plain hex so call sites
// that do color-string concatenation (e.g. `color + '26'` for a translucent badge) keep working.

export const THEME_STORAGE_KEY = 'mantravibe_theme_mode';

// Applies the persisted (or given) theme mode to <html> and localStorage. Safe to call before
// React mounts (see index.html) to avoid a flash of the wrong theme on load.
export function applyThemeMode(mode) {
  const resolved = mode === 'light' ? 'light' : 'dark';
  try {
    document.documentElement.setAttribute('data-theme', resolved);
    localStorage.setItem(THEME_STORAGE_KEY, resolved);
  } catch (e) {
    // localStorage unavailable (private mode, etc.) - theme still applies for this load
  }
  return resolved;
}

export function getStoredThemeMode() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch (e) {
    return 'dark';
  }
}

export const theme = {
  // Backgrounds / surfaces, darkest to lightest - see :root / :root[data-theme="light"] in
  // index.css for the actual values in each mode.
  bg: 'var(--mv-bg)',
  surface: 'var(--mv-surface)',
  surfaceAlt: 'var(--mv-surface-alt)',
  surfaceHover: 'var(--mv-surface-hover)',
  border: 'var(--mv-border)',
  borderSoft: 'var(--mv-border-soft)',

  // Text
  text: 'var(--mv-text)',
  textMuted: 'var(--mv-text-muted)',
  textFaint: 'var(--mv-text-faint)',

  // Accents
  pink: '#ec4899',
  pinkHover: '#db2777',
  pinkSoft: 'rgba(236, 72, 153, 0.16)',
  blue: '#3b6ea5',         // dark-blue accent (panels, secondary buttons)
  blueHover: '#2f5a87',
  blueSoft: 'rgba(59, 110, 165, 0.18)',

  // Status
  success: '#34d399',
  danger: '#f87171',
  warning: '#fbbf24',

  // Role / spending categories (kept vivid for legibility on dark surfaces)
  roleCategory: {
    goalkeepers: '#fb923c', // P — orange
    defenders: '#34d399',   // Dc, B, Dd, Ds — green
    midfielders: '#60a5fa', // E, M, C — blue
    wingers: '#a78bfa',     // W, T — purple
    attackers: '#f87171'    // A, Pc — red
  }
};

export default theme;
