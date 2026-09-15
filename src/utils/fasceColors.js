import { parseMantraRoles } from './dataUtils';

// Shared 10-step color scale for Fantamedia "fasce" (deciles) - Fascia 1 (best, top 10%) is
// green, Fascia 10 (worst, bottom 10%) is red, with a smooth hue sweep through
// yellow/olive/orange in between (a standard red-yellow-green "heat map" scale), rather than
// three flat traffic-light bands. Fixed hex values (not theme tokens) since these need to read
// as a consistent temperature scale in both light and dark mode, same reasoning as
// theme.roleCategory/status colors in theme.js.
export const FASCIA_COLORS = [
  '#2dbe2d', // Fascia 1 (best)
  '#4dbe2d',
  '#6dbe2d',
  '#8ebe2d',
  '#aebe2d',
  '#beae2d',
  '#be8e2d',
  '#be6d2d',
  '#be4d2d',
  '#be2d2d'  // Fascia 10 (worst)
];

export function fasciaColor(fasciaIndex) {
  return FASCIA_COLORS[Math.max(0, Math.min(FASCIA_COLORS.length - 1, fasciaIndex))];
}

// Picks black or white text for legibility on a given fascia background color, using the
// standard relative-luminance heuristic (WCAG-ish) rather than a single fixed choice - useful
// since these fill colors range from a fairly light green to a fairly dark red.
export function fasciaTextColor(hexColor) {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 0.55 ? '#0b1220' : '#ffffff';
}

// Turns the raw fantamedia_percentiles.json shape ({season: {role: [[players]x10 fasce]}}) into
// a player_id -> { [season]: { [role]: fasciaIndex } } lookup. Built once (e.g. via useMemo in
// App.js, keyed only on the fetched JSON) rather than per row/render - after that, finding one
// player's fascia is a couple of object lookups instead of scanning every fascia's player list.
export function buildFasciaLookup(percentilesData) {
  const lookup = new Map();
  if (!percentilesData) return lookup;
  for (const [season, roleFasce] of Object.entries(percentilesData)) {
    for (const [role, fasce] of Object.entries(roleFasce)) {
      fasce.forEach((group, fasciaIndex) => {
        group.forEach(p => {
          let bySeason = lookup.get(p.player_id);
          if (!bySeason) {
            bySeason = {};
            lookup.set(p.player_id, bySeason);
          }
          if (!bySeason[season]) bySeason[season] = {};
          bySeason[season][role] = fasciaIndex;
        });
      });
    }
  }
  return lookup;
}

// For one player and season, the fascia index per Mantra role they hold that has data for that
// season - a role/season combo is simply omitted when the player wasn't eligible (not enough
// Presenze that season, or no data at all), rather than shown as some placeholder fascia.
export function getFasciaEntries(fasciaLookup, player, season) {
  const bySeasonRole = fasciaLookup?.get(player?.player_id)?.[season];
  if (!bySeasonRole) return [];
  return parseMantraRoles(player)
    .filter(role => bySeasonRole[role] !== undefined)
    .map(role => ({ role, fasciaIndex: bySeasonRole[role] }));
}

// The most favorable fascia among a player's roles (lowest index = best) - used to pick a single
// representative color when several roles' fasce need to collapse into one dot/badge.
export function bestFasciaIndex(entries) {
  return entries.length ? Math.min(...entries.map(e => e.fasciaIndex)) : null;
}

export function fasciaTooltipText(entries) {
  return entries.map(e => `${e.role}: Fascia ${e.fasciaIndex + 1}`).join(' · ');
}
