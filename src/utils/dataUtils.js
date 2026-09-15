// src/utils/dataUtils.js - Versione aggiornata con original ranking
import { theme } from '../theme';

/**
 * Canonical set of per-season stat fields (final.json's "{base} {season}" fields), in display
 * order - the single source of truth for what the table's column picker, player cards, and the
 * player detail page all show, so the three stay consistent with each other. Update this list
 * (not each component separately) to add/remove/reorder a stat everywhere at once.
 *
 * `SEASON_STAT_ROLE_RESTRICTIONS` scopes a stat to players with a matching classic `Ruolo` -
 * Gol Subiti (goals conceded) only means something for goalkeepers. Every other stat applies to
 * every role.
 */
export const SEASON_STAT_BASES = ['Presenze', 'Minuti Giocati', 'Media Voto', 'Fantamedia', 'Gol', 'Assist', 'Gol Subiti', 'xG', 'xA', 'Ammonizioni', 'Espulsioni'];
export const SEASON_STAT_ROLE_RESTRICTIONS = { 'Gol Subiti': 'POR' };

/** SEASON_STAT_BASES filtered down to the ones that apply to this player's role. */
export const seasonStatBasesForPlayer = (player) =>
  SEASON_STAT_BASES.filter(base => {
    const requiredRole = SEASON_STAT_ROLE_RESTRICTIONS[base];
    return !requiredRole || player?.Ruolo === requiredRole;
  });

/**
 * Parses player['Ruolo Mantra'] into a plain role-code array (e.g. ["Dc", "B"]). The field is
 * stored as a Python-repr string ("['Dc', 'B']"), not JSON, so it needs the quote swap below
 * before parsing - occasionally it's already an array (or missing) instead, handled as well.
 */
export const parseMantraRoles = (player) => {
  const raw = player?.['Ruolo Mantra'];
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string') return [raw];
  try {
    return JSON.parse(raw.replace(/'/g, '"'));
  } catch {
    return [raw];
  }
};

const SEASON_FIELD_REGEX = new RegExp(`^(?:${SEASON_STAT_BASES.join('|')}) (\\d{4}-\\d{4})$`);

/**
 * Derives the current/previous season labels (e.g. "2026-2027") straight from the field
 * names present in final.json, instead of hardcoding them - so changing
 * data-pipeline/config.py's CURRENT_SEASON/PREVIOUS_SEASONS is enough to update the UI too,
 * no code changes needed. Falls back to sensible defaults if no player has season data yet.
 */
export const getSeasonLabels = (players) => {
  const seasons = new Set();
  const sampleSize = Math.min(players.length, 100);

  for (let i = 0; i < sampleSize; i++) {
    Object.keys(players[i]).forEach(key => {
      const match = key.match(SEASON_FIELD_REGEX);
      if (match) seasons.add(match[1]);
    });
  }

  const sorted = Array.from(seasons).sort((a, b) => b.localeCompare(a));
  return {
    current: sorted[0] || '2026-2027',
    previous: sorted[1] || '2025-2026'
  };
};

/**
 * Centralized team color coding system
 * Returns consistent colors for teams across all tabs
 */
export const getTeamColorCoding = (team, teams, minPlayers = 21, maxPlayers = 30) => {
  if (!team) return { status: 'default', colors: {} };
  
  const currentPlayerCount = (team.players || []).length;
  const teamBudget = team.budget - (team.players || []).reduce((sum, player) => sum + (player.price || 0), 0);
  
  // Get first team's budget for comparison
  const firstTeam = teams.length > 0 ? teams[0] : null;
  const firstTeamBudget = firstTeam ? firstTeam.budget - (firstTeam.players || []).reduce((sum, player) => sum + (player.price || 0), 0) : 0;
  
  // Determine team status
  let status = 'default';
  if (currentPlayerCount >= maxPlayers || teamBudget <= 0) {
    status = 'red'; // Max players or zero budget
  } else if (currentPlayerCount >= minPlayers) {
    status = 'green'; // At minimum or more players
  }
  
  // Define color schemes
  const colorSchemes = {
    green: {
      border: theme.success,
      background: 'rgba(52, 211, 153, 0.12)',
      text: theme.success,
      budget: theme.success
    },
    red: {
      border: theme.danger,
      background: 'rgba(248, 113, 113, 0.12)',
      text: theme.danger,
      budget: theme.danger
    },
    default: {
      border: theme.border,
      background: theme.surfaceAlt,
      text: theme.text,
      budget: theme.success
    }
  };
  
  // Check if team has less budget than first team
  const hasLessBudget = team.id !== firstTeam?.id && teamBudget < firstTeamBudget && firstTeamBudget > 0;
  
  return {
    status,
    colors: colorSchemes[status],
    hasLessBudget,
    budgetHighlight: hasLessBudget ? {
      backgroundColor: 'rgba(251, 191, 36, 0.16)',
      border: `2px solid ${theme.warning}`,
      borderRadius: '4px',
      padding: '2px 6px'
    } : {}
  };
};
