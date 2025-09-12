import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const PlayerPage = ({ players = [], playerStatus = {}, onPlayerStatusChange }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Find the player by ID
  const player = useMemo(() => {
    return players.find(p => p.player_id === parseInt(id));
  }, [players, id]);

  // Get player status
  const status = playerStatus[player?.player_id] || { status: 'available' };

  // Helper function to get role color
  const getRoleColor = (role) => {
    const roleColorMap = {
      'G': '#f97316',    // Orange
      'CB': '#22c55e',   // Green
      'LA': '#22c55e',   // Green
      'RB': '#22c55e',   // Green
      'LB': '#22c55e',   // Green
      'E': '#3b82f6',    // Blue
      'DM': '#3b82f6',   // Blue
      'M': '#3b82f6',    // Blue
      'W': '#a855f7',    // Purple
      'OM': '#a855f7',   // Purple
      'F': '#ef4444',    // Red
      'CF': '#ef4444'    // Red
    };
    return roleColorMap[role] || '#6b7280';
  };

  // Helper function to get role info
  const getRoleInfo = (role) => {
    const roleInfoMap = {
      'G': { italian: 'P', color: 'Orange' },
      'CB': { italian: 'Dc', color: 'Green' },
      'LA': { italian: 'B', color: 'Green' },
      'RB': { italian: 'Dd', color: 'Green' },
      'LB': { italian: 'Ds', color: 'Green' },
      'E': { italian: 'E', color: 'Blue' },
      'DM': { italian: 'M', color: 'Blue' },
      'M': { italian: 'C', color: 'Blue' },
      'W': { italian: 'W', color: 'Purple' },
      'OM': { italian: 'T', color: 'Purple' },
      'F': { italian: 'A', color: 'Red' },
      'CF': { italian: 'Pc', color: 'Red' }
    };
    return roleInfoMap[role] || { italian: role, color: 'Gray' };
  };

  // Helper function to get trend emoji
  const getTrendEmoji = (trend) => {
    switch (trend) {
      case 'UP': return '📈';
      case 'DOWN': return '📉';
      default: return '=';
    }
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
              {getTrendEmoji(player.Trend)} {player.Nome}
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
        {/* Key Statistics */}
        <div style={statsSectionStyle}>
          <h3 style={sectionTitleStyle}>Key Statistics</h3>
          <div style={statsListStyle}>
            <div style={statItemStyle}>
              <span style={statLabelStyle}>Fantaindex 2025-2026</span>
              <span style={statValueStyle}>{formatValue(player['Fantaindex  2025-2026'])}</span>
            </div>
            <div style={statItemStyle}>
              <span style={statLabelStyle}>Punteggio FPEDIA</span>
              <span style={statValueStyle}>{formatValue(player['Punteggio FPEDIA'])}</span>
            </div>
            <div style={statItemStyle}>
              <span style={statLabelStyle}>Convenienza Potenziale FSTATS 2025-2026</span>
              <span style={statValueStyle}>{formatValue(player['Convenienza Potenziale FSTATS 2025-2026'])}</span>
            </div>
            <div style={statItemStyle}>
              <span style={statLabelStyle}>Convenienza FSTATS 2025-2026</span>
              <span style={statValueStyle}>{formatValue(player['Convenienza FSTATS 2025-2026'])}</span>
            </div>
            <div style={statItemStyle}>
              <span style={statLabelStyle}>Convenienza Potenziale FPEDIA</span>
              <span style={statValueStyle}>{formatValue(player['Convenienza Potenziale FPEDIA'])}</span>
            </div>
            <div style={statItemStyle}>
              <span style={statLabelStyle}>Convenienza FPEDIA</span>
              <span style={statValueStyle}>{formatValue(player['Convenienza FPEDIA'])}</span>
            </div>
            <div style={statItemStyle}>
              <span style={statLabelStyle}>Buon Investimento</span>
              <span style={statValueStyle}>{formatValue(player['Buon Investimento'])}</span>
            </div>
          </div>
        </div>

        {/* Performance 2025-2026 */}
        <div style={statsSectionStyle}>
          <h3 style={sectionTitleStyle}>Performance 2025-2026</h3>
          <div style={statsListStyle}>
            <div style={statItemStyle}>
              <span style={statLabelStyle}>Fantamedia 2025-2026</span>
              <span style={statValueStyle}>{formatValue(player['Fantamedia 2025-2026'])}</span>
            </div>
            <div style={statItemStyle}>
              <span style={statLabelStyle}>Media 2025-2026</span>
              <span style={statValueStyle}>{formatValue(player['Media 2025-2026'])}</span>
            </div>
            <div style={statItemStyle}>
              <span style={statLabelStyle}>Presenze 2025-2026</span>
              <span style={statValueStyle}>{formatValue(player['Presenze 2025-2026'])}</span>
            </div>
            <div style={statItemStyle}>
              <span style={statLabelStyle}>Minuti Giocati 2025-2026</span>
              <span style={statValueStyle}>{formatValue(player['Minuti Giocati 2025-2026'])}</span>
            </div>
            <div style={statItemStyle}>
              <span style={statLabelStyle}>Matches With Grade 2025-2026</span>
              <span style={statValueStyle}>{formatValue(player['Matches With Grade 2025-2026'])}</span>
            </div>
          </div>
        </div>

        {/* Goals & Assists 2025-2026 */}
        {!roles.includes('G') && (
          <div style={statsSectionStyle}>
            <h3 style={sectionTitleStyle}>Goals & Assists 2025-2026</h3>
            <div style={statsListStyle}>
              <div style={statItemStyle}>
                <span style={statLabelStyle}>Gol 2025-2026</span>
                <span style={statValueStyle}>{formatValue(player['Gol 2025-2026'])}</span>
              </div>
              <div style={statItemStyle}>
                <span style={statLabelStyle}>Assist 2025-2026</span>
                <span style={statValueStyle}>{formatValue(player['Assist 2025-2026'])}</span>
              </div>
              <div style={statItemStyle}>
                <span style={statLabelStyle}>Goals90min 2025-2026</span>
                <span style={statValueStyle}>{formatValue(player['Goals90min 2025-2026'])}</span>
              </div>
              <div style={statItemStyle}>
                <span style={statLabelStyle}>Goals From Open Plays 2025-2026</span>
                <span style={statValueStyle}>{formatValue(player['Goals From Open Plays 2025-2026'])}</span>
              </div>
              <div style={statItemStyle}>
                <span style={statLabelStyle}>Rigori 2025-2026</span>
                <span style={statValueStyle}>{formatValue(player['Rigori 2025-2026'])}</span>
              </div>
            </div>
          </div>
        )}

        {/* Expected Goals & Assists 2025-2026 */}
        {!roles.includes('G') && (
          <div style={statsSectionStyle}>
            <h3 style={sectionTitleStyle}>Expected Goals & Assists 2025-2026</h3>
            <div style={statsListStyle}>
              <div style={statItemStyle}>
                <span style={statLabelStyle}>xA 2025-2026</span>
                <span style={statValueStyle}>{formatValue(player['xA 2025-2026'])}</span>
              </div>
              <div style={statItemStyle}>
                <span style={statLabelStyle}>xG From Open Plays 2025-2026</span>
                <span style={statValueStyle}>{formatValue(player['xG From Open Plays 2025-2026'])}</span>
              </div>
              <div style={statItemStyle}>
                <span style={statLabelStyle}>xG From Open Plays/90min 2025-2026</span>
                <span style={statValueStyle}>{formatValue(player['xG From Open Plays/90min 2025-2026'])}</span>
              </div>
              <div style={statItemStyle}>
                <span style={statLabelStyle}>xA90min 2025-2026</span>
                <span style={statValueStyle}>{formatValue(player['xA90min 2025-2026'])}</span>
              </div>
            </div>
          </div>
        )}

        {/* Goalkeeper Stats 2025-2026 */}
        {roles.includes('G') && (
          <div style={statsSectionStyle}>
            <h3 style={sectionTitleStyle}>Goalkeeper Stats 2025-2026</h3>
            <div style={statsListStyle}>
              <div style={statItemStyle}>
                <span style={statLabelStyle}>GK Penalties Saved 2025-2026</span>
                <span style={statValueStyle}>{formatValue(player['GK Penalties Saved 2025-2026'])}</span>
              </div>
              <div style={statItemStyle}>
                <span style={statLabelStyle}>GK Clean Sheets 2025-2026</span>
                <span style={statValueStyle}>{formatValue(player['GK Clean Sheets 2025-2026'])}</span>
              </div>
              <div style={statItemStyle}>
                <span style={statLabelStyle}>GK Conceded Goals 2025-2026</span>
                <span style={statValueStyle}>{formatValue(player['GK Conceded Goals 2025-2026'])}</span>
              </div>
            </div>
          </div>
        )}

        {/* Disciplinary 2025-2026 */}
        <div style={statsSectionStyle}>
          <h3 style={sectionTitleStyle}>Disciplinary 2025-2026</h3>
          <div style={statsListStyle}>
            <div style={statItemStyle}>
              <span style={statLabelStyle}>Ammonizioni 2025-2026</span>
              <span style={statValueStyle}>{formatValue(player['Ammonizioni 2025-2026'])}</span>
            </div>
            <div style={statItemStyle}>
              <span style={statLabelStyle}>Espulsioni 2025-2026</span>
              <span style={statValueStyle}>{formatValue(player['Espulsioni 2025-2026'])}</span>
            </div>
          </div>
        </div>

        {/* Prediction */}
        <div style={statsSectionStyle}>
          <h3 style={sectionTitleStyle}>Prediction</h3>
          <div style={statsListStyle}>
            <div style={statItemStyle}>
              <span style={statLabelStyle}>Presenze Previste</span>
              <span style={statValueStyle}>{formatValue(player['Presenze Previste'])}</span>
            </div>
            <div style={statItemStyle}>
              <span style={statLabelStyle}>Gol Previsti</span>
              <span style={statValueStyle}>{formatValue(player['Gol Previsti'])}</span>
            </div>
            <div style={statItemStyle}>
              <span style={statLabelStyle}>Assist Previsti</span>
              <span style={statValueStyle}>{formatValue(player['Assist Previsti'])}</span>
            </div>
            <div style={statItemStyle}>
              <span style={statLabelStyle}>Resistenza Infortuni</span>
              <span style={statValueStyle}>{formatValue(player['Resistenza Infortuni'])}</span>
            </div>
            <div style={statItemStyle}>
              <span style={statLabelStyle}>Infortunato</span>
              <span style={statValueStyle}>{formatValue(player['Infortunato'])}</span>
            </div>
            <div style={statItemStyle}>
              <span style={statLabelStyle}>Nuovo Acquisto</span>
              <span style={statValueStyle}>{formatValue(player['Nuovo Acquisto'])}</span>
            </div>
          </div>
        </div>

        {/* Performance 2024-2025 */}
        <div style={statsSectionStyle}>
          <h3 style={sectionTitleStyle}>Performance 2024-2025</h3>
          <div style={statsListStyle}>
            <div style={statItemStyle}>
              <span style={statLabelStyle}>Fantamedia 2024-2025</span>
              <span style={statValueStyle}>{formatValue(player['Fantamedia 2024-2025'])}</span>
            </div>
            <div style={statItemStyle}>
              <span style={statLabelStyle}>Media 2024-2025</span>
              <span style={statValueStyle}>{formatValue(player['Media 2024-2025'])}</span>
            </div>
            <div style={statItemStyle}>
              <span style={statLabelStyle}>Presenze 2024-2025</span>
              <span style={statValueStyle}>{formatValue(player['Presenze 2024-2025'])}</span>
            </div>
            <div style={statItemStyle}>
              <span style={statLabelStyle}>Minuti Giocati 2024-2025</span>
              <span style={statValueStyle}>{formatValue(player['Minuti Giocati 2024-2025'])}</span>
            </div>
            <div style={statItemStyle}>
              <span style={statLabelStyle}>Matches With Grade 2024-2025</span>
              <span style={statValueStyle}>{formatValue(player['Matches With Grade 2024-2025'])}</span>
            </div>
          </div>
        </div>

        {/* Goals & Assists 2024-2025 */}
        {!roles.includes('G') && (
          <div style={statsSectionStyle}>
            <h3 style={sectionTitleStyle}>Goals & Assists 2024-2025</h3>
            <div style={statsListStyle}>
              <div style={statItemStyle}>
                <span style={statLabelStyle}>Gol 2024</span>
                <span style={statValueStyle}>{formatValue(player['Gol 2024'])}</span>
              </div>
              <div style={statItemStyle}>
                <span style={statLabelStyle}>Assist 2024-2025</span>
                <span style={statValueStyle}>{formatValue(player['Assist 2024-2025'])}</span>
              </div>
              <div style={statItemStyle}>
                <span style={statLabelStyle}>Goals90min 2024-2025</span>
                <span style={statValueStyle}>{formatValue(player['Goals90min 2024-2025'])}</span>
              </div>
              <div style={statItemStyle}>
                <span style={statLabelStyle}>Goals From Open Plays 2024-2025</span>
                <span style={statValueStyle}>{formatValue(player['Goals From Open Plays 2024-2025'])}</span>
              </div>
              <div style={statItemStyle}>
                <span style={statLabelStyle}>Rigori 2024-2025</span>
                <span style={statValueStyle}>{formatValue(player['Rigori 2024-2025'])}</span>
              </div>
            </div>
          </div>
        )}

        {/* Expected Goals & Assists 2024-2025 */}
        {!roles.includes('G') && (
          <div style={statsSectionStyle}>
            <h3 style={sectionTitleStyle}>Expected Goals & Assists 2024-2025</h3>
            <div style={statsListStyle}>
              <div style={statItemStyle}>
                <span style={statLabelStyle}>xA 2024-2025</span>
                <span style={statValueStyle}>{formatValue(player['xA 2024-2025'])}</span>
              </div>
              <div style={statItemStyle}>
                <span style={statLabelStyle}>xG From Open Plays 2024-2025</span>
                <span style={statValueStyle}>{formatValue(player['xG From Open Plays 2024-2025'])}</span>
              </div>
              <div style={statItemStyle}>
                <span style={statLabelStyle}>xG From Open Plays/90min 2024-2025</span>
                <span style={statValueStyle}>{formatValue(player['xG From Open Plays/90min 2024-2025'])}</span>
              </div>
              <div style={statItemStyle}>
                <span style={statLabelStyle}>xA90min 2024-2025</span>
                <span style={statValueStyle}>{formatValue(player['xA90min 2024-2025'])}</span>
              </div>
            </div>
          </div>
        )}

        {/* Goalkeeper Stats 2024-2025 */}
        {roles.includes('G') && (
          <div style={statsSectionStyle}>
            <h3 style={sectionTitleStyle}>Goalkeeper Stats 2024-2025</h3>
            <div style={statsListStyle}>
              <div style={statItemStyle}>
                <span style={statLabelStyle}>GK Penalties Saved 2024-2025</span>
                <span style={statValueStyle}>{formatValue(player['GK Penalties Saved 2024-2025'])}</span>
              </div>
              <div style={statItemStyle}>
                <span style={statLabelStyle}>GK Clean Sheets 2024-2025</span>
                <span style={statValueStyle}>{formatValue(player['GK Clean Sheets 2024-2025'])}</span>
              </div>
              <div style={statItemStyle}>
                <span style={statLabelStyle}>GK Conceded Goals 2024-2025</span>
                <span style={statValueStyle}>{formatValue(player['GK Conceded Goals 2024-2025'])}</span>
              </div>
            </div>
          </div>
        )}

        {/* Disciplinary 2024-2025 */}
        <div style={statsSectionStyle}>
          <h3 style={sectionTitleStyle}>Disciplinary 2024-2025</h3>
          <div style={statsListStyle}>
            <div style={statItemStyle}>
              <span style={statLabelStyle}>Ammonizioni 2024-2025</span>
              <span style={statValueStyle}>{formatValue(player['Ammonizioni 2024-2025'])}</span>
            </div>
            <div style={statItemStyle}>
              <span style={statLabelStyle}>Espulsioni 2024-2025</span>
              <span style={statValueStyle}>{formatValue(player['Espulsioni 2024-2025'])}</span>
            </div>
          </div>
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
  backgroundColor: '#3b82f6',
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
  color: '#1f2937',
  margin: 0
};

const statusStyle = {
  fontSize: '1rem',
  fontWeight: '600'
};

const acquiredStyle = {
  color: '#059669',
  backgroundColor: '#d1fae5',
  padding: '0.25rem 0.75rem',
  borderRadius: '0.375rem'
};

const availableStyle = {
  color: '#6b7280',
  backgroundColor: '#f3f4f6',
  padding: '0.25rem 0.75rem',
  borderRadius: '0.375rem'
};

const infoCardStyle = {
  backgroundColor: '#f8fafc',
  borderRadius: '0.75rem',
  padding: '2rem',
  marginBottom: '2rem',
  border: '1px solid #e2e8f0'
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
  color: '#1f2937',
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
  color: '#6b7280',
  fontWeight: '500'
};

const skillsSectionStyle = {
  minWidth: '200px'
};

const skillsTitleStyle = {
  fontSize: '1.125rem',
  fontWeight: '600',
  color: '#374151',
  margin: '0 0 0.75rem 0'
};

const skillsListStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem'
};

const skillBadgeStyle = {
  padding: '0.25rem 0.5rem',
  backgroundColor: '#e0e7ff',
  color: '#3730a3',
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
  backgroundColor: 'white',
  borderRadius: '0.5rem',
  padding: '1.5rem',
  border: '1px solid #e5e7eb',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
};

const sectionTitleStyle = {
  fontSize: '1.25rem',
  fontWeight: '600',
  color: '#1f2937',
  margin: '0 0 1rem 0',
  paddingBottom: '0.5rem',
  borderBottom: '2px solid #e5e7eb'
};

const statsListStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem'
};

const statItemStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.5rem 0',
  borderBottom: '1px solid #f3f4f6'
};

const statLabelStyle = {
  fontSize: '0.875rem',
  color: '#6b7280',
  fontWeight: '500',
  flex: 1
};

const statValueStyle = {
  fontSize: '1rem',
  color: '#1f2937',
  fontWeight: '600',
  textAlign: 'right',
  minWidth: '80px'
};

const errorStyle = {
  textAlign: 'center',
  padding: '4rem 2rem'
};

export default PlayerPage;
