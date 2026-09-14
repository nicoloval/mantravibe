import React, { useEffect, useState, useCallback } from 'react';
import { getTeamColorCoding } from '../utils/dataUtils';
import { getCachedData, setCachedData, CACHE_CONFIG } from '../utils/cache';
import { computeFormationStats, computeFormationScore } from '../utils/formationScoring';
import { theme } from '../theme';

const FantamilioniBar = ({ 
  player, 
  onConfirm, 
  onCancel,
  maxFantamilioni = null,
  teams = [],
  maxPlayers = 30,
  minPlayers = 21,
  formations = {},
  players = [],
  appetibilitaData = {},
  currentTeamFormationRankings = {} // Pass current team's formation rankings from RosaAcquistata
}) => {
  const [fantamilioni, setFantamilioni] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [error, setError] = useState('');
  const [teamBudget, setTeamBudget] = useState(0);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  // const [formationRankings, setFormationRankings] = useState({}); // Removed unused state

  // Helper function to get player role (same as RosaAcquistata)
  const getPlayerRole = useCallback((player) => {
    if (!player) return 'UNKNOWN';
    
    // Try to get role from 'Ruolo' field first
    if (player.Ruolo) {
      return player.Ruolo;
    }
    
    // Fallback to 'Ruolo Mantra' if available
    if (player['Ruolo Mantra']) {
      try {
        const roles = JSON.parse(player['Ruolo Mantra'].replace(/'/g, '"'));
        return roles[0] || 'UNKNOWN';
      } catch (error) {
        console.warn('Error parsing Ruolo Mantra:', error);
        return 'UNKNOWN';
      }
    }
    
    return 'UNKNOWN';
  }, []);

  // Player roles (player['Ruolo Mantra']) are already Mantra codes (P, Dc, Dd, Ds, B, E, M,
  // C, W, T, A, Pc) - the exact vocabulary formation slots use, so no translation is needed.
  // This used to look roles up in roles.csv's Role->Ruolo column, but that map's Role column
  // happens to also contain "M" (mapping it to "C"), which silently corrupted every player's
  // real "M" role into "C" for formation-matching purposes. Keep this as an identity function.
  const translateRoleToItalian = useCallback((role) => role, []);

  // Function to calculate available budget for a specific team
  const calculateTeamBudget = useCallback((teamId) => {
    if (!teams || !Array.isArray(teams)) return 0;
    
    const teamIdStr = String(teamId);
    const team = teams.find(t => String(t.id) === teamIdStr);
    if (!team) {
      return 0;
    }
    
    const totalSpent = (team.players || []).reduce((sum, player) => sum + (parseFloat(player.price) || 0), 0);
    const availableBudget = team.budget - totalSpent;
    return availableBudget;
  }, [teams]);

  // Function to calculate maximum amount (available budget minus reserved for remaining players)
  const calculateMaxAmount = useCallback((teamId) => {
    if (!teams || !Array.isArray(teams)) return 0;
    
    const availableBudget = calculateTeamBudget(teamId);
    const team = teams.find(t => String(t.id) === String(teamId));
    if (!team) return 0;
    
    const currentPlayers = (team.players || []).length;
    const playersNeeded = Math.max(0, minPlayers - currentPlayers);
    const reservedForRemaining = playersNeeded * 1; // Reserve 1 FM per player still needed
    const maxBid = Math.max(0, availableBudget - reservedForRemaining);
    
    
    return maxBid;
  }, [teams, minPlayers, calculateTeamBudget]);

  // Get team color by name helper - REMOVED (unused)
  // const getTeamColorByName = useCallback((teamName) => {
  //   if (!teams || !Array.isArray(teams)) return { colors: { border: '#d1d5db', background: '#f9fafb', text: '#374151', budget: '#059669' } };
  //   
  //   const team = teams.find(t => t.name === teamName);
  //   if (!team) return { colors: { border: '#d1d5db', background: '#f9fafb', text: '#374151', budget: '#059669' } };
  //   
  //   return getTeamColorCoding(team, teams, minPlayers, maxPlayers);
  // }, [teams, minPlayers, maxPlayers]);

  // Role color mapping. `role` is already a Mantra code (P, Dc, Dd, Ds, B, E, M, C, W, T, A,
  // Pc), as found directly in player['Ruolo Mantra'] - no translation needed.
  const getRoleColor = useCallback((role) => {
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
  }, []);


  // Window resize listener for responsive design
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Update team budget when selected team changes
  useEffect(() => {
    if (selectedTeamId) {
      const budget = calculateTeamBudget(selectedTeamId);
      setTeamBudget(budget);
    }
  }, [selectedTeamId, calculateTeamBudget]);

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!selectedTeamId) {
      setError('Seleziona una squadra');
      return;
    }
    
    const amount = parseInt(fantamilioni);
    if (!amount || amount <= 0) {
      setError('Inserisci un prezzo valido');
      return;
    }
    
    if (amount > teamBudget) {
      setError('Prezzo superiore al budget disponibile');
      return;
    }
    
    setError('');
    onConfirm(selectedTeamId, amount);
  };

  // Handle cancel
  const handleCancel = () => {
    setFantamilioni('');
    setSelectedTeamId('');
    setError('');
    onCancel();
  };

  // Get formation stats for a specific team and formation - delegates to the shared scoring
  // util (src/utils/formationScoring.js) so this stays in sync with RosaAcquistata's copy.
  const getFormationStatsForTeam = useCallback((teamToUse, formationName) => {
    return computeFormationStats(teamToUse, formationName, formations, players, appetibilitaData, getPlayerRole, translateRoleToItalian);
  }, [formations, players, appetibilitaData, getPlayerRole, translateRoleToItalian]);

  const handleTeamSelection = useCallback((teamId) => {
    setSelectedTeamId(String(teamId));
  }, []);

  return (
    <div style={{
      minHeight: player ? '100px' : 'auto',
      padding: player ? '20px' : '10px 20px',
      backgroundColor: theme.surface,
      borderBottom: `1px solid ${theme.border}`,
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.3)'
    }}>
      {player ? (
        <>
          {/* Two Main Boxes Layout - Responsive */}
          <div style={{ 
            display: 'flex', 
            gap: '20px', 
            alignItems: 'flex-start',
            flexDirection: windowWidth <= 768 ? 'column' : 'row'
          }}>
            
            {/* LEFT BOX: Player Info, Buttons, Price */}
            <div style={{ 
              flex: windowWidth <= 768 ? 'none' : '0 0 400px', 
              width: windowWidth <= 768 ? '100%' : 'auto',
              padding: '12px',
              backgroundColor: theme.surfaceAlt,
              borderRadius: '8px',
              border: `1px solid ${theme.border}`,
              color: theme.text,
              fontSize: '16px', // Reduced font size for more compact layout
              height: windowWidth <= 768 ? 'auto' : '280px', // Auto height on mobile
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              {/* Player Name and Roles */}
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '20px', marginBottom: '3px' }}>{player.Nome}</div>
                <div style={{ fontSize: '16px', color: theme.textMuted, marginBottom: '6px' }}>{player.Squadra}</div>
                {/* Player Roles */}
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {(() => {
                    // Parse the Ruolo Mantra field
                    let playerRoles = [];
                    if (player['Ruolo Mantra']) {
                      try {
                        const roles = JSON.parse(player['Ruolo Mantra'].replace(/'/g, '"'));
                        playerRoles = roles;
                      } catch (error) {
                        console.warn('Error parsing Ruolo Mantra:', error);
                        playerRoles = [player.Ruolo || 'UNKNOWN'];
                      }
                    } else if (player.Ruolo) {
                      playerRoles = [player.Ruolo];
                    }
                    
                    return playerRoles.map((role, idx) => {
                      const italianRole = translateRoleToItalian(role);
                      return (
                        <span key={idx} style={{
                          padding: '2px 6px',
                          backgroundColor: getRoleColor(role), // Use original English role for color
                          borderRadius: '4px',
                          fontSize: '14px',
                          color: 'white',
                          fontWeight: '600'
                        }}>
                          {italianRole}
                        </span>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <button
                  onClick={handleCancel}
                  style={{
                    padding: '6px 12px',
                    border: `1px solid ${theme.border}`,
                    borderRadius: '6px',
                    fontSize: '16px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    backgroundColor: theme.surfaceHover,
                    color: theme.text
                  }}
                >
                  Annulla
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!fantamilioni || parseInt(fantamilioni) <= 0 || parseInt(fantamilioni) > teamBudget || teamBudget <= 0 || !selectedTeamId}
                  style={{
                    padding: '6px 12px',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: '500',
                    cursor: (!fantamilioni || parseInt(fantamilioni) <= 0 || parseInt(fantamilioni) > teamBudget || teamBudget <= 0 || !selectedTeamId) ? 'not-allowed' : 'pointer',
                    backgroundColor: (!fantamilioni || parseInt(fantamilioni) <= 0 || parseInt(fantamilioni) > teamBudget || teamBudget <= 0 || !selectedTeamId) ? theme.textFaint : theme.pink
                  }}
                >
                  Conferma
                </button>
              </div>

              {/* Price Input */}
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '16px', fontWeight: '500', display: 'block', marginBottom: '3px' }}>Prezzo:</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    value={fantamilioni}
                    onChange={(e) => setFantamilioni(e.target.value)}
                    placeholder="0"
                    style={{
                      padding: '8px 12px',
                      border: `1px solid ${theme.border}`,
                      borderRadius: '6px',
                      fontSize: '16px',
                      width: '80px',
                      backgroundColor: theme.surface,
                      color: theme.text
                    }}
                  />
                  <span style={{ fontSize: '16px', color: theme.textMuted }}>FM</span>
                </div>
              </div>

              {/* Quick Price Suggestions */}
              {selectedTeamId && (
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '3px', color: theme.textMuted }}>Suggerimenti:</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {[1, 5, 10, 20, 50].filter(amount => amount <= teamBudget).map(amount => (
                      <button
                        key={amount}
                        onClick={() => setFantamilioni(amount.toString())}
                        style={{
                          padding: '4px 8px',
                          border: `1px solid ${theme.border}`,
                          borderRadius: '4px',
                          fontSize: '14px',
                          backgroundColor: fantamilioni === amount.toString() ? theme.pink : theme.surfaceHover,
                          color: fantamilioni === amount.toString() ? 'white' : theme.text,
                          cursor: 'pointer'
                        }}
                      >
                        {amount}
                      </button>
                    ))}
                    {calculateMaxAmount(selectedTeamId) >= 1 && (
                      <button
                        onClick={() => setFantamilioni(calculateMaxAmount(selectedTeamId).toString())}
                        style={{
                          padding: '4px 8px',
                          border: `1px solid ${theme.border}`,
                          borderRadius: '4px',
                          fontSize: '14px',
                          backgroundColor: fantamilioni === calculateMaxAmount(selectedTeamId).toString() ? theme.pink : theme.surfaceHover,
                          color: fantamilioni === calculateMaxAmount(selectedTeamId).toString() ? 'white' : theme.text,
                          cursor: 'pointer'
                        }}
                      >
                        Max
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Budget Display */}
              {selectedTeamId && (
                <div style={{ marginTop: '8px', padding: '8px', backgroundColor: theme.blueSoft, borderRadius: '6px', border: `1px solid ${theme.blue}` }}>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: theme.text }}>
                    Budget: {teamBudget} FM
                  </div>
                  {teamBudget > 0 && (
                    <div style={{ fontSize: '12px', color: theme.textMuted, marginTop: '1px' }}>
                      Max: {calculateMaxAmount(selectedTeamId)} FM
                    </div>
                  )}
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div style={{ color: theme.danger, fontSize: '14px', fontWeight: '500', marginTop: '5px' }}>
                  {error}
                </div>
              )}
            </div>

            {/* RIGHT BOX: Team Buttons with Formation Rankings */}
            <div style={{ 
              flex: 1, 
              display: 'grid', 
              gridTemplateColumns: windowWidth <= 768 ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', 
              gap: '8px',
              width: windowWidth <= 768 ? '100%' : 'auto'
            }}>
              {teams && Array.isArray(teams) ? teams.map(team => {
                const isSelected = selectedTeamId === String(team.id);
                const playerCount = (team.players || []).length;
                const teamRemainingBudget = calculateTeamBudget(team.id);
                
                // Get centralized color coding
                const colorCoding = getTeamColorCoding(team, teams, 21, 30);
                const isDisabled = colorCoding.status === 'red';
                
                // Get formation rankings for this team (simplified approach)
                const getTeamFormationRankings = () => {
                  try {
                    if (!formations || Object.keys(formations).length === 0) return [];
                    
                    // Try to get cached current rankings first (without player)
                    const cacheKey = `team_${team.id}_players_${team.players?.length || 0}`;
                    const cachedCurrentRankings = getCachedData(CACHE_CONFIG.FORMATION_RANKINGS, cacheKey);
                    
                    // Use cached current rankings if available, otherwise calculate fresh
                    let currentRankings;
                    if (cachedCurrentRankings && Array.isArray(cachedCurrentRankings)) {
                      currentRankings = cachedCurrentRankings;
                    } else {
                      // Calculate current rankings for all formations (shared scoring util)
                      currentRankings = Object.keys(formations).map(formationCode => {
                        const stats = getFormationStatsForTeam(team, formationCode);
                        const { score } = computeFormationScore(stats);
                        return { code: formationCode, score };
                      });
                      
                      // Sort by score descending
                      currentRankings.sort((a, b) => b.score - a.score);
                      
                      // Cache the current rankings (all formations, not just top 3)
                      setCachedData(CACHE_CONFIG.FORMATION_RANKINGS, currentRankings, cacheKey);
                    }
                    
                    // Get top 3 formations
                    const top3Formations = currentRankings.slice(0, 3);
                    
                    // Calculate new scores with the player added
                    const newPlayer = { ...player, price: parseInt(fantamilioni) || 0 };
                    const teamWithNewPlayer = {
                      ...team,
                      players: [...(team.players || []), newPlayer]
                    };
                    
                    return top3Formations.map(currentFormation => {
                      const stats = getFormationStatsForTeam(teamWithNewPlayer, currentFormation.code);
                      const { score: newScore } = computeFormationScore(stats);

                      return {
                        code: currentFormation.code,
                        currentScore: Math.round(currentFormation.score),
                        newScore: Math.round(newScore)
                      };
                    });
                  } catch (error) {
                    console.error('🔍 DEBUG: Error calculating team rankings:', error);
                    return [];
                  }
                };

                const formationRankings = getTeamFormationRankings();
                
                // Determine button style using centralized color coding
                let buttonStyle = {
                  padding: '6px',
                  border: `2px solid ${isSelected ? theme.pink : colorCoding.colors.border}`,
                  borderRadius: '8px',
                  backgroundColor: isSelected ? theme.pinkSoft : colorCoding.colors.background,
                  color: isSelected ? theme.pink : colorCoding.colors.text,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  fontSize: windowWidth <= 768 ? '16px' : '20px', // Smaller font on mobile
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  height: windowWidth <= 768 ? '140px' : '160px', // Shorter on mobile
                  justifyContent: 'flex-start',
                  opacity: isDisabled ? 0.6 : 1,
                  minWidth: windowWidth <= 768 ? '140px' : '180px', // Smaller on mobile
                  maxWidth: windowWidth <= 768 ? '160px' : '200px', // Smaller on mobile
                  flexShrink: 0,
                  width: '100%'
                };
                
                // Use centralized budget color with yellow highlighting for teams with less budget than first team
                let budgetColor = colorCoding.colors.budget;
                let budgetStyle = { fontSize: '18px', color: budgetColor, textAlign: 'center', lineHeight: '1.0' };
                
                if (isSelected) {
                  budgetColor = theme.pink;
                  budgetStyle.color = budgetColor;
                } else if (colorCoding.hasLessBudget) {
                  // Apply yellow highlighting for teams with less budget than first team
                  budgetStyle = {
                    ...budgetStyle,
                    ...colorCoding.budgetHighlight
                  };
                }
                
                return (
                  <button
                    key={team.id}
                    onClick={() => !isDisabled && handleTeamSelection(team.id)}
                    style={buttonStyle}
                  >
                    {/* Team Name */}
                    <div style={{ 
                      fontWeight: 'bold', 
                      fontSize: windowWidth <= 768 ? '16px' : '20px', 
                      textAlign: 'center', 
                      lineHeight: '1.0' 
                    }}>
                      {team.name}
                    </div>
                    
                    {/* Budget and Player Count */}
                    <div style={{
                      ...budgetStyle,
                      fontSize: windowWidth <= 768 ? '14px' : '18px'
                    }}>
                      {teamRemainingBudget} FM
                    </div>
                    <div style={{
                      fontSize: windowWidth <= 768 ? '13px' : '17px',
                      color: theme.textMuted,
                      textAlign: 'center',
                      lineHeight: '1.0'
                    }}>
                      {playerCount}/30
                    </div>

                    {/* Formation Rankings - properly aligned */}
                    {formationRankings.length > 0 && (
                      <div style={{
                        marginTop: '2px',
                        borderTop: '1px solid rgba(255,255,255,0.12)',
                        paddingTop: '2px',
                        fontSize: windowWidth <= 768 ? '14px' : '18px',
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}>
                        {formationRankings.map((formation, idx) => (
                          <div key={idx} style={{ 
                            marginBottom: '0px', 
                            lineHeight: '1.0',
                            display: 'flex',
                            alignItems: 'center',
                            whiteSpace: 'nowrap' // Prevent wrapping
                          }}>
                            <span style={{
                              fontWeight: '500',
                              color: theme.text,
                              textAlign: 'right',
                              display: 'inline-block',
                              width: windowWidth <= 768 ? '50px' : '70px' // Smaller on mobile
                            }}>
                              {formation.code}:
                            </span>
                            <span style={{
                              color: theme.danger,
                              fontWeight: '500',
                              textAlign: 'right',
                              display: 'inline-block',
                              width: windowWidth <= 768 ? '20px' : '25px' // Smaller on mobile
                            }}>
                              {formation.currentScore}
                            </span>
                            <span style={{
                              color: theme.textMuted,
                              fontSize: windowWidth <= 768 ? '12px' : '16px',
                              textAlign: 'center',
                              display: 'inline-block',
                              width: windowWidth <= 768 ? '12px' : '15px' // Smaller on mobile
                            }}>
                              →
                            </span>
                            <span style={{
                              color: theme.success,
                              fontWeight: '500',
                              textAlign: 'right',
                              display: 'inline-block',
                              width: windowWidth <= 768 ? '20px' : '25px' // Smaller on mobile
                            }}>
                              {formation.newScore}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </button>
                );
              }) : (
                <div style={{ color: theme.textMuted, fontSize: '20px', padding: '20px' }}>Nessuna squadra disponibile</div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Empty state - slim hint bar instead of a tall centered placeholder */
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          color: theme.textFaint,
          fontSize: '13px',
          fontWeight: '500'
        }}>
          🛒 Clicca su "Compra" per iniziare l'acquisto di un giocatore
        </div>
      )}
    </div>
  );
};

export default React.memo(FantamilioniBar);
