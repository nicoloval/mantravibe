import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSeasonLabels, seasonStatBasesForPlayer } from '../utils/dataUtils';
import { theme } from '../theme';
import { getFasciaEntries, fasciaColor, fasciaTextColor } from '../utils/fasceColors';
import StatTrendTable from './StatTrendTable';

const PlayerPage = ({ players = [], playerStatus = {}, onPlayerStatusChange, fasciaLookup = null }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Derived from the data itself (see data-pipeline/config.py) - never hardcode season strings below.
  const { current: CUR_SEASON, previous: PREV_SEASON } = useMemo(() => getSeasonLabels(players), [players]);

  // Find the player by ID
  const player = useMemo(() => {
    return players.find(p => p.player_id === parseInt(id));
  }, [players, id]);

  // Get player status
  const status = playerStatus[player?.player_id] || { status: 'available' };

  const seasonStatBases = useMemo(() => seasonStatBasesForPlayer(player), [player]);

  // Helper function to get role color. `role` is already a Mantra code (P, Dc, Dd, Ds, B, E,
  // M, C, W, T, A, Pc), as found directly in player['Ruolo Mantra'] - no translation needed.
  const getRoleColor = (role) => {
    const roleColorMap = {
      'P': theme.roleCategory.goalkeepers,
      'Dc': theme.roleCategory.defenders,
      'B': theme.roleCategory.defenders,
      'Dd': theme.roleCategory.defenders,
      'Ds': theme.roleCategory.defenders,
      'E': theme.roleCategory.midfielders,
      'M': theme.roleCategory.midfielders,
      'C': theme.roleCategory.midfielders,
      'W': theme.roleCategory.wingers,
      'T': theme.roleCategory.wingers,
      'A': theme.roleCategory.attackers,
      'Pc': theme.roleCategory.attackers
    };
    return roleColorMap[role] || theme.textMuted;
  };

  // Helper function to get role info
  const getRoleInfo = (role) => {
    return { italian: role, color: getRoleColor(role) };
  };

  // Helper function to format value
  const formatValue = (value) => {
    if (value === null || value === undefined || value === '') return 'N/A';
    if (typeof value === 'number') {
      // Show negative values as N/A
      if (value < 0) return 'N/A';
      return Number.isInteger(value) ? value.toString() : value.toFixed(2);
    }
    return value.toString();
  };

  // Diff (week-over-week quotazione change) is signed - unlike everything else here, a
  // negative value is a real reading (price dropped), not formatValue's "negative means N/A".
  const formatDiff = (value) => {
    if (typeof value !== 'number') return 'N/A';
    return value > 0 ? `+${value}` : String(value);
  };

  const getDiffColor = (value) => {
    if (typeof value !== 'number') return theme.textMuted;
    if (value > 0) return theme.success;
    if (value < 0) return theme.danger;
    return theme.textMuted;
  };

  // "2025-2026" -> "25/26" - compact column header for the Statistiche table below.
  const shortSeason = (season) => `${season.slice(2, 4)}/${season.slice(7, 9)}`;

  // Parse skills
  const skills = useMemo(() => {
    if (!player?.Skills) return [];
    try {
      return JSON.parse(player.Skills.replace(/'/g, '"'));
    } catch {
      return [];
    }
  }, [player]);

  // Parse roles
  const roles = useMemo(() => {
    if (!player?.['Ruolo Mantra']) return [];
    try {
      return JSON.parse(player['Ruolo Mantra'].replace(/'/g, '"'));
    } catch {
      return [];
    }
  }, [player]);

  // Precomputed Fantamedia fasce (see data-pipeline/fantamedia_percentiles.py), fetched once in
  // App.js and turned into a fast player_id -> fascia lookup (fasceColors.js) shared with the
  // Giocatori tab and the Percentili tab, so this always matches what those show.
  // For each season, which fascia this player falls into per Mantra role they hold - a
  // multi-role player (e.g. ["Dc", "B"]) can land in a different fascia per role since each
  // role's fasce are computed independently. A season/role combo is omitted entirely when the
  // player wasn't eligible that season (not enough Presenze, or no data at all).
  const percentiliBySeason = useMemo(() => {
    if (!fasciaLookup || !player) return null;
    const result = {};
    for (const season of [CUR_SEASON, PREV_SEASON]) {
      const perRole = getFasciaEntries(fasciaLookup, player, season);
      if (perRole.length > 0) result[season] = perRole;
    }
    return result;
  }, [fasciaLookup, player, CUR_SEASON, PREV_SEASON]);

  if (!player) {
    return (
      <div style={containerStyle}>
        <div style={errorStyle}>
          <h1>Player not found</h1>
          <p>The player you're looking for doesn't exist.</p>
          <button style={backButtonStyle} onClick={() => navigate('/')}>
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <button style={backButtonStyle} onClick={() => navigate('/')}>
          ← Back to Giocatori
        </button>
        <h1 style={titleStyle}>{player.Nome}</h1>
        <div style={statusStyle}>
          {status.status === 'acquired' ? (
            <span style={acquiredStyle}>✓ Acquired ({status.fantamilioni} FM)</span>
          ) : (
            <span style={availableStyle}>Available</span>
          )}
        </div>
      </div>

      {/* Player Info Card */}
      <div style={infoCardStyle}>
        <div style={infoHeaderStyle}>
          <div style={nameSectionStyle}>
            <h2 style={playerNameStyle}>
              {player.Nome}
            </h2>
            <div style={roleSectionStyle}>
              {roles.map((role, index) => (
                <span
                  key={index}
                  style={{
                    ...roleBadgeStyle,
                    backgroundColor: getRoleColor(role),
                    color: 'white'
                  }}
                >
                  {getRoleInfo(role).italian}
                </span>
              ))}
            </div>
            <div style={teamStyle}>{player.Squadra}</div>
          </div>
          
          {skills.length > 0 && (
            <div style={skillsSectionStyle}>
              <h3 style={skillsTitleStyle}>Skills</h3>
              <div style={skillsListStyle}>
                {skills.map((skill, index) => (
                  <span key={index} style={skillBadgeStyle}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Statistics Grid */}
      <div style={statsGridStyle}>
        {/* Quotazioni */}
        <div style={statsSectionStyle}>
          <h3 style={sectionTitleStyle}>Quotazioni</h3>
          <div style={compactStatsListStyle}>
            <div style={compactStatItemStyle}>
              <span style={compactStatLabelStyle}>QtI</span>
              <span style={compactStatValueStyle}>{formatValue(player['QtI'])}</span>
            </div>
            <div style={compactStatItemStyle}>
              <span style={compactStatLabelStyle}>QtA</span>
              <span style={compactStatValueStyle}>{formatValue(player['QtA'])}</span>
            </div>
            <div style={compactStatItemStyle}>
              <span style={compactStatLabelStyle}>FVM</span>
              <span style={compactStatValueStyle}>{formatValue(player['FVM'])}</span>
            </div>
            <div style={compactStatItemStyle}>
              <span style={compactStatLabelStyle}>Diff</span>
              <span style={{ ...compactStatValueStyle, color: getDiffColor(player['Diff']) }}>{formatDiff(player['Diff'])}</span>
            </div>
          </div>
        </div>

        {/* Fascia (decile) di merito per Fantamedia, per stagione e ruolo - see PercentiliTab
            for the full ranking; this just surfaces where this one player lands in it. */}
        {percentiliBySeason && Object.keys(percentiliBySeason).length > 0 && (
          <div style={statsSectionStyle}>
            <h3 style={sectionTitleStyle}>Percentili Fantamedia</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {[CUR_SEASON, PREV_SEASON].map(season => {
                const rows = percentiliBySeason[season];
                if (!rows || rows.length === 0) return null;
                return (
                  <div key={season}>
                    <div style={compactStatHeaderStyle}>{shortSeason(season)}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.35rem' }}>
                      {rows.map(({ role, fasciaIndex }) => {
                        const bg = fasciaColor(fasciaIndex);
                        return (
                          <div key={role} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={compactStatLabelStyle}>{role}</span>
                            <span style={{
                              backgroundColor: bg,
                              color: fasciaTextColor(bg),
                              padding: '0.15rem 0.6rem',
                              borderRadius: '0.375rem',
                              fontSize: '0.75rem',
                              fontWeight: '700'
                            }}>
                              Fascia {fasciaIndex + 1}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Absolute (raw season total) values, both seasons side by side per stat - compact
            counterpart to Andamento below, which shows the same stats as per-match rates with
            a trend diagram instead. */}
        <div style={statsSectionStyle}>
          <h3 style={sectionTitleStyle}>Statistiche</h3>
          <div style={compactStatRowStyle}>
            <span />
            <span style={compactStatHeaderStyle}>{shortSeason(PREV_SEASON)}</span>
            <span style={compactStatHeaderStyle}>{shortSeason(CUR_SEASON)}</span>
          </div>
          {seasonStatBases.map(base => (
            <div key={base} style={compactStatRowStyle}>
              <span style={compactStatLabelStyle}>{base}</span>
              <span style={compactStatValueStyle}>{formatValue(player[`${base} ${PREV_SEASON}`])}</span>
              <span style={compactStatValueStyle}>{formatValue(player[`${base} ${CUR_SEASON}`])}</span>
            </div>
          ))}
        </div>

        {/* Performance trend - per-match rates (fairer than raw totals for a current season
            that's only a few games old) with a prev->cur sparkline per stat, same treatment
            the Giocatori cards use, so a player's trend reads identically in both places. */}
        <div style={{ ...statsSectionStyle, gridColumn: '1 / -1' }}>
          <h3 style={sectionTitleStyle}>Andamento</h3>
          <StatTrendTable player={player} curSeason={CUR_SEASON} prevSeason={PREV_SEASON} />
        </div>
      </div>
    </div>
  );
};

// Styles
const containerStyle = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '2rem',
  minHeight: '100vh',
  backgroundColor: theme.bg,
  color: theme.text,
  fontFamily: 'system-ui, -apple-system, sans-serif'
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '2rem',
  flexWrap: 'wrap',
  gap: '1rem'
};

const backButtonStyle = {
  padding: '0.5rem 1rem',
  backgroundColor: theme.pink,
  color: 'white',
  border: 'none',
  borderRadius: '0.375rem',
  cursor: 'pointer',
  fontSize: '0.875rem',
  fontWeight: '500',
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem'
};

const titleStyle = {
  fontSize: '2rem',
  fontWeight: '700',
  color: theme.text,
  margin: 0
};

const statusStyle = {
  fontSize: '1rem',
  fontWeight: '600'
};

const acquiredStyle = {
  color: theme.success,
  backgroundColor: 'rgba(52, 211, 153, 0.16)',
  padding: '0.25rem 0.75rem',
  borderRadius: '0.375rem'
};

const availableStyle = {
  color: theme.textMuted,
  backgroundColor: theme.surfaceAlt,
  padding: '0.25rem 0.75rem',
  borderRadius: '0.375rem'
};

const infoCardStyle = {
  backgroundColor: theme.surface,
  borderRadius: '0.75rem',
  padding: '2rem',
  marginBottom: '2rem',
  border: `1px solid ${theme.border}`
};

const infoHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  flexWrap: 'wrap',
  gap: '2rem'
};

const nameSectionStyle = {
  flex: 1
};

const playerNameStyle = {
  fontSize: '2.5rem',
  fontWeight: '700',
  color: theme.text,
  margin: '0 0 1rem 0'
};

const roleSectionStyle = {
  display: 'flex',
  gap: '0.5rem',
  marginBottom: '0.5rem',
  flexWrap: 'wrap'
};

const roleBadgeStyle = {
  padding: '0.25rem 0.75rem',
  borderRadius: '0.375rem',
  fontSize: '0.875rem',
  fontWeight: '600'
};

const teamStyle = {
  fontSize: '1.25rem',
  color: theme.textMuted,
  fontWeight: '500'
};

const skillsSectionStyle = {
  minWidth: '200px'
};

const skillsTitleStyle = {
  fontSize: '1.125rem',
  fontWeight: '600',
  color: theme.text,
  margin: '0 0 0.75rem 0'
};

const skillsListStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem'
};

const skillBadgeStyle = {
  padding: '0.25rem 0.5rem',
  backgroundColor: theme.blueSoft,
  color: theme.blue,
  borderRadius: '0.25rem',
  fontSize: '0.875rem',
  fontWeight: '500'
};

const statsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '1.5rem'
};

const statsSectionStyle = {
  backgroundColor: theme.surface,
  borderRadius: '0.5rem',
  padding: '1.5rem',
  border: `1px solid ${theme.border}`,
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
};

const sectionTitleStyle = {
  fontSize: '1.25rem',
  fontWeight: '600',
  color: theme.text,
  margin: '0 0 1rem 0',
  paddingBottom: '0.5rem',
  borderBottom: `2px solid ${theme.border}`
};

// Compact single-value row (Quotazioni).
const compactStatsListStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.125rem'
};

const compactStatItemStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.25rem 0',
  borderBottom: `1px solid ${theme.borderSoft}`
};

const compactStatLabelStyle = {
  fontSize: '0.8rem',
  color: theme.textMuted,
  fontWeight: '500'
};

const compactStatValueStyle = {
  fontSize: '0.875rem',
  color: theme.text,
  fontWeight: '600',
  textAlign: 'right'
};

// Compact two-value row (Statistiche: prev season, cur season side by side per stat).
const compactStatRowStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) 3.25rem 3.25rem',
  alignItems: 'center',
  columnGap: '0.5rem',
  padding: '0.25rem 0',
  borderBottom: `1px solid ${theme.borderSoft}`
};

const compactStatHeaderStyle = {
  fontSize: '0.7rem',
  color: theme.textFaint,
  fontWeight: '600',
  textAlign: 'right',
  textTransform: 'uppercase',
  letterSpacing: '0.03em'
};

const errorStyle = {
  textAlign: 'center',
  padding: '4rem 2rem'
};

export default PlayerPage;
