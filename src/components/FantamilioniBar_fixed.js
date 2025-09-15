import React, { useEffect, useState, useCallback } from 'react';
import { getTeamColorCoding } from '../utils/dataUtils';

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
  roleMapping = {}
}) => {
  const [fantamilioni, setFantamilioni] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [error, setError] = useState('');
  const [teamBudget, setTeamBudget] = useState(0);
  const [formationRankings, setFormationRankings] = useState({});

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

  // Helper function to translate English role to Italian (same as RosaAcquistata)
  const translateRoleToItalian = useCallback((englishRole) => {
    if (!englishRole || !roleMapping) return englishRole;
    
    // Direct mapping from roleMapping
    const directMapping = roleMapping[englishRole];
    if (directMapping) return directMapping;
    
    // Fallback to common mappings
    const commonMappings = {
      'GK': 'P',
      'CB': 'D',
      'LB': 'D',
      'RB': 'D',
      'CDM': 'C',
      'CM': 'C',
      'CAM': 'C',
      'LW': 'W',
      'RW': 'W',
      'ST': 'A',
      'CF': 'A'
    };
    
    return commonMappings[englishRole] || englishRole;
  }, [roleMapping]);

  // Function to calculate available budget for a specific team
  const calculateTeamBudget = useCallback((teamId) => {
    if (!teams || !Array.isArray(teams)) return 0;
    
    const teamIdStr = String(teamId);
    const team = teams.find(t => String(t.id) === teamIdStr);
    if (!team) {
      console.log('🔍 DEBUG: Team not found for ID:', teamId, 'Available teams:', teams.map(t => ({ id: t.id, name: t.name })));
      return 0;
    }
    
    const totalSpent = (team.players || []).reduce((sum, player) => sum + (parseFloat(player.price) || 0), 0);
    const availableBudget = team.budget - totalSpent;
    console.log('🔍 DEBUG: Team', teamId, 'budget:', team.budget, 'spent:', totalSpent, 'available:', availableBudget);
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
    
    console.log('🔍 DEBUG: Max amount calculation for team', teamId, ':', {
      availableBudget,
      currentPlayers,
      playersNeeded,
      reservedForRemaining,
      maxBid
    });
    
    return maxBid;
  }, [teams, minPlayers, calculateTeamBudget]);

  // Get team color by name helper
  const getTeamColorByName = useCallback((teamName) => {
    if (!teams || !Array.isArray(teams)) return { colors: { border: '#d1d5db', background: '#f9fafb', text: '#374151', budget: '#059669' } };
    
    const team = teams.find(t => t.name === teamName);
    if (!team) return { colors: { border: '#d1d5db', background: '#f9fafb', text: '#374151', budget: '#059669' } };
    
    return getTeamColorCoding(team, teams, minPlayers, maxPlayers);
  }, [teams, minPlayers, maxPlayers]);

  // Role color mapping (same as RosaAcquistata)
  const getRoleColor = useCallback((role) => {
    const colorMap = {
      'P': '#ef4444',    // Red for goalkeeper
      'D': '#3b82f6',    // Blue for defender
      'C': '#10b981',    // Green for midfielder
      'W': '#f59e0b',    // Orange for winger
      'A': '#8b5cf6',    // Purple for attacker
      'B': '#06b6d4'     // Cyan for braccetto
    };
    return colorMap[role] || '#6b7280';
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

  // Get formation stats for a specific team and formation (exact same logic as RosaAcquistata)
  const getFormationStatsForTeam = useCallback((teamToUse, formationName) => {
    if (!teamToUse || !teamToUse.players || !formations[formationName]) {
      return { occupiedPositions: 0, unassignedPlayers: 0 };
    }

    // Use the same calculation logic as RosaAcquistata
    const formation = formations[formationName];
    const formationRoles = new Set();
    formation.positions.forEach(positionGroup => {
      positionGroup.forEach(role => formationRoles.add(role));
    });
    const formationRolesArray = Array.from(formationRoles);
    
    const playersByRole = {};
    const positionAssignments = {};
    const unassignedPlayers = [];
    
    // Initialize all formation roles
    formationRolesArray.forEach(role => {
      playersByRole[role] = [];
    });
    playersByRole['UNUSED'] = [];
    
    // Helper function to get appetibilita ranking for a role
    const getRoleRanking = (role) => {
      return appetibilitaData[role] || 999;
    };
    
    // Create position slots from formation
    const formationPositions = formation.positions.map((positionGroup, index) => ({
      positionIndex: index,
      roles: positionGroup,
      assignedPlayer: null,
      assignedPlayerId: null
    }));
    
    // Get all team players with their possible roles (same logic as RosaAcquistata)
    const teamPlayersWithRoles = teamToUse.players.map(teamPlayer => {
      if (!teamPlayer) return null;
      
      const playerDetail = players.find(p => p.id === teamPlayer.id);
      if (!playerDetail) return null;
      
      let possibleRoles = [];
      let unusedRoles = [];
      
      if (playerDetail['Ruolo Mantra']) {
        try {
          const roles = JSON.parse(playerDetail['Ruolo Mantra'].replace(/'/g, '"'));
          
          roles.forEach(englishRole => {
            let roleMatched = false;
            
            formationPositions.forEach(position => {
              const italianRole = translateRoleToItalian(englishRole);
              const roleMatch = position.roles.some(formationRole => 
                formationRole.toLowerCase() === italianRole.toLowerCase()
              );
              
              if (roleMatch) {
                roleMatched = true;
                const formationRole = position.roles.find(formationRole => 
                  formationRole.toLowerCase() === italianRole.toLowerCase()
                );
                
                if (formationRole) {
                  possibleRoles.push({
                    role: formationRole,
                    positionIndex: position.positionIndex,
                    ranking: getRoleRanking(formationRole),
                    originalRole: englishRole
                  });
                }
              }
            });
            
            if (!roleMatched) {
              unusedRoles.push(englishRole);
            }
          });
        } catch (error) {
          console.warn('Error parsing Ruolo Mantra for player:', playerDetail.Nome, error);
        }
      } else if (playerDetail.Ruolo) {
        const role = getPlayerRole(playerDetail);
        let roleMatched = false;
        
        formationPositions.forEach(position => {
          const italianRole = translateRoleToItalian(role);
          const roleMatch = position.roles.some(formationRole => 
            formationRole.toLowerCase() === italianRole.toLowerCase()
          );
          
          if (roleMatch) {
            roleMatched = true;
            possibleRoles.push({
              role: italianRole,
              positionIndex: position.positionIndex,
              ranking: getRoleRanking(italianRole),
              originalRole: role
            });
          }
        });
        
        if (!roleMatched) {
          unusedRoles.push(role);
        }
      }
      
      return {
        player: playerDetail,
        playerId: teamPlayer.id,
        possibleRoles,
        unusedRoles,
        fantamilioni: teamPlayer.price || 0,
        timestamp: teamPlayer.timestamp || Date.now()
      };
    }).filter(Boolean);
    
    // Create position assignments list (same logic as RosaAcquistata)
    const positionAssignmentsList = [];
    formationPositions.forEach((position, positionIndex) => {
      const worstAppetibilita = Math.max(...position.roles.map(role => getRoleRanking(role)));
      
      positionAssignmentsList.push({
        positionIndex,
        roles: position.roles,
        appetibilita: worstAppetibilita,
        assigned: false,
        assignedPlayer: null
      });
    });
    
    // Sort positions by appetibilita (same as RosaAcquistata)
    positionAssignmentsList.sort((a, b) => {
      if (a.appetibilita !== b.appetibilita) {
        return b.appetibilita - a.appetibilita; // Descending order (higher appetibilita first)
      }
      return a.positionIndex - b.positionIndex;
    });
    
    // Assign players to positions (same logic as RosaAcquistata)
    const availablePlayers = [...teamPlayersWithRoles];
    const assignedPlayerIds = new Set();
    let totalAssignedPlayers = 0;
    const maxPlayers = 11;
    
    positionAssignmentsList.forEach((positionAssignment) => {
      if (positionAssignment.assigned || totalAssignedPlayers >= maxPlayers) return;
      
      const position = formationPositions[positionAssignment.positionIndex];
      if (position.assignedPlayer) return;
      
      const availableForPosition = availablePlayers.filter(playerData => 
        !assignedPlayerIds.has(playerData.playerId)
      );
      
      if (availableForPosition.length === 0) return;
      
      // Find the best player for this position
      const playersWithBestRoles = availableForPosition.map(playerData => {
        const applicableRoles = playerData.possibleRoles.filter(roleOption => 
          roleOption.role && positionAssignment.roles.includes(roleOption.role)
        );
        
        if (applicableRoles.length === 0) return null;
        
        // Find the role with the lowest appetibilita (best quality) for this position
        const bestRole = applicableRoles.sort((a, b) => a.ranking - b.ranking)[0];
        
        return {
          playerData,
          bestRole,
          appetibilita: bestRole.ranking,
          fpediaScore: parseFloat(playerData.player['Punteggio FPEDIA'] || 0)
        };
      }).filter(Boolean);
      
      if (playersWithBestRoles.length === 0) return;
      
      // Sort by appetibilita (lowest first), then by FPEDIA (highest first) as tiebreaker
      playersWithBestRoles.sort((a, b) => {
        if (a.appetibilita !== b.appetibilita) {
          return a.appetibilita - b.appetibilita; // Lower appetibilita (better quality) first
        }
        return b.fpediaScore - a.fpediaScore; // Higher FPEDIA as tiebreaker
      });
      
      const bestPlayer = playersWithBestRoles[0].playerData;
      const assignedRoleOption = playersWithBestRoles[0].bestRole;
      
      if (bestPlayer && assignedRoleOption) {
        position.assignedPlayer = bestPlayer.player;
        position.assignedPlayerId = bestPlayer.playerId;
        positionAssignment.assigned = true;
        positionAssignment.assignedPlayer = bestPlayer.player;
        assignedPlayerIds.add(bestPlayer.playerId);
        totalAssignedPlayers++;
        
        positionAssignments[bestPlayer.playerId] = {
          positionIndex: positionAssignment.positionIndex,
          role: assignedRoleOption.role,
          originalRole: assignedRoleOption.originalRole
        };
        
        if (!playersByRole[assignedRoleOption.role]) {
          playersByRole[assignedRoleOption.role] = [];
        }
        
        playersByRole[assignedRoleOption.role].push({
          ...bestPlayer.player,
          price: bestPlayer.fantamilioni,
          fantamilioni: bestPlayer.fantamilioni,
          playerId: bestPlayer.playerId,
          assignedRole: assignedRoleOption.role,
          positionIndex: positionAssignment.positionIndex,
          originalRoles: bestPlayer.possibleRoles.map(r => r.originalRole)
        });
      }
    });
    
    // Count players with no possible roles
    const playersWithNoPossibleRoles = teamPlayersWithRoles.filter(playerData => {
      if (assignedPlayerIds.has(playerData.playerId)) return false;
      const possibleRoles = playerData.possibleRoles || [];
      return possibleRoles.length === 0;
    });
    const unusedPlayersCount = playersWithNoPossibleRoles.length;
    
    // Calculate occupied positions from actual formation box data (exclude UNUSED)
    const occupiedPositions = Object.keys(playersByRole)
      .filter(role => role !== 'UNUSED')
      .reduce((total, role) => total + (playersByRole[role]?.length || 0), 0);
    
    return {
      occupiedPositions: occupiedPositions,
      unassignedPlayers: unusedPlayersCount,
      totalUsablePlayers: occupiedPositions + (teamPlayersWithRoles.length - occupiedPositions - unusedPlayersCount)
    };
  }, [formations, players, appetibilitaData, getPlayerRole, translateRoleToItalian]);

  return (
    <div style={{
      minHeight: '100px',
      padding: '20px',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e5e7eb',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
    }}>
      {player ? (
        <>
          {/* Two Main Boxes Layout */}
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            
            {/* LEFT BOX: Player Info, Buttons, Price */}
            <div style={{ 
              flex: '0 0 400px', 
              padding: '15px', 
              backgroundColor: '#f8fafc', 
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '18px' // Increased base font size by 4 points
            }}>
              {/* Player Name and Roles */}
              <div style={{ marginBottom: '15px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '24px', marginBottom: '5px' }}>{player.Nome}</div>
                <div style={{ fontSize: '20px', color: '#666', marginBottom: '8px' }}>{player.Squadra}</div>
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
                    
                    return playerRoles.map((role, idx) => (
                      <span key={idx} style={{
                        padding: '3px 8px',
                        backgroundColor: getRoleColor(role),
                        borderRadius: '4px',
                        fontSize: '20px',
                        color: 'white',
                        fontWeight: '600'
                      }}>
                        {roleMapping[role] || role}
                      </span>
                    ));
                  })()}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <button
                  onClick={handleCancel}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '20px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    backgroundColor: '#f3f4f6',
                    color: '#374151'
                  }}
                >
                  Annulla
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!fantamilioni || parseInt(fantamilioni) <= 0 || parseInt(fantamilioni) > teamBudget || teamBudget <= 0 || !selectedTeamId}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '20px',
                    fontWeight: '500',
                    cursor: (!fantamilioni || parseInt(fantamilioni) <= 0 || parseInt(fantamilioni) > teamBudget || teamBudget <= 0 || !selectedTeamId) ? 'not-allowed' : 'pointer',
                    backgroundColor: (!fantamilioni || parseInt(fantamilioni) <= 0 || parseInt(fantamilioni) > teamBudget || teamBudget <= 0 || !selectedTeamId) ? '#9ca3af' : '#3b82f6'
                  }}
                >
                  Conferma
                </button>
              </div>

              {/* Price Input */}
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '20px', fontWeight: '500', display: 'block', marginBottom: '5px' }}>Prezzo:</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    value={fantamilioni}
                    onChange={(e) => setFantamilioni(e.target.value)}
                    placeholder="0"
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '20px',
                      width: '100px'
                    }}
                  />
                  <span style={{ fontSize: '20px', color: '#666' }}>FM</span>
                </div>
              </div>

              {/* Quick Price Suggestions */}
              {selectedTeamId && teamBudget > 0 && (
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '500', marginBottom: '5px', color: '#666' }}>Suggerimenti:</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {[1, 5, 10, 20, 50].filter(amount => amount <= teamBudget).map(amount => (
                      <button
                        key={amount}
                        onClick={() => setFantamilioni(amount.toString())}
                        style={{
                          padding: '4px 8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          fontSize: '18px',
                          backgroundColor: fantamilioni === amount.toString() ? '#3b82f6' : '#f3f4f6',
                          color: fantamilioni === amount.toString() ? 'white' : '#374151',
                          cursor: 'pointer'
                        }}
                      >
                        {amount}
                      </button>
                    ))}
                    <button
                      onClick={() => setFantamilioni(calculateMaxAmount(selectedTeamId).toString())}
                      style={{
                        padding: '4px 8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '18px',
                        backgroundColor: fantamilioni === calculateMaxAmount(selectedTeamId).toString() ? '#3b82f6' : '#f3f4f6',
                        color: fantamilioni === calculateMaxAmount(selectedTeamId).toString() ? 'white' : '#374151',
                        cursor: 'pointer'
                      }}
                    >
                      Max
                    </button>
                  </div>
                </div>
              )}

              {/* Budget Display */}
              {selectedTeamId && (
                <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f0f9ff', borderRadius: '6px', border: '1px solid #bae6fd' }}>
                  <div style={{ fontSize: '18px', fontWeight: '500', color: '#0369a1' }}>
                    Budget rimanente: {teamBudget} FM
                  </div>
                  {teamBudget > 0 && (
                    <div style={{ fontSize: '16px', color: '#0284c7', marginTop: '2px' }}>
                      Max offerta: {calculateMaxAmount(selectedTeamId)} FM
                    </div>
                  )}
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div style={{ color: '#ef4444', fontSize: '18px', fontWeight: '500', marginTop: '10px' }}>
                  {error}
                </div>
              )}
            </div>

            {/* RIGHT BOX: Team Buttons with Formation Rankings */}
            <div style={{ flex: 1, display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
              {teams && Array.isArray(teams) ? teams.map(team => {
                const isSelected = selectedTeamId === String(team.id);
                const playerCount = (team.players || []).length;
                const teamRemainingBudget = calculateTeamBudget(team.id);
                
                // Get centralized color coding
                const colorCoding = getTeamColorCoding(team, teams, 21, 30);
                const isDisabled = colorCoding.status === 'red';
                
                // Calculate formation rankings for this team (exact same logic as RosaAcquistata)
                const getTeamFormationRankings = () => {
                  try {
                    if (!formations || Object.keys(formations).length === 0) return [];
                    
                    console.log('🔍 DEBUG: Calculating rankings for team:', team.name);
                    console.log('🔍 DEBUG: Formations available:', Object.keys(formations));
                    console.log('🔍 DEBUG: Team players:', team.players?.length || 0);

                    // Calculate current rankings using the exact same logic as RosaAcquistata
                    const currentRankings = Object.keys(formations).map(formationCode => {
                      const stats = getFormationStatsForTeam(team, formationCode);
                      console.log(`🔍 DEBUG: Formation ${formationCode} current stats:`, stats);
                      
                      // Calculate score based on UI values (exact same as RosaAcquistata)
                      const starterFilled = stats.occupiedPositions;
                      const starterTotal = 11;
                      const starterFraction = starterFilled / starterTotal;
                      
                      // Estimate backup coverage (simplified - could be improved)
                      const backupSlotsWithCoverage = Math.max(0, starterFilled - 1); // Assume some backup coverage
                      const backupFraction = backupSlotsWithCoverage / starterTotal;
                      
                      // Unusable players penalty
                      const unusablePlayers = stats.unassignedPlayers;
                      const unusablePenalty = Math.min(20, 20 * (unusablePlayers / Math.max(team.players?.length || 1, 1)));
                      
                      // Calculate score (0-100)
                      const starterScore = 50 * starterFraction; // 0-50 points for starters
                      const backupScore = 30 * backupFraction;   // 0-30 points for backups
                      const totalScore = Math.max(0, Math.min(100, starterScore + backupScore - unusablePenalty));
                      
                      console.log(`🔍 DEBUG: Formation ${formationCode} scoring:`, {
                        starterFilled,
                        starterScore: starterScore.toFixed(2),
                        backupScore: backupScore.toFixed(2),
                        unusablePenalty: unusablePenalty.toFixed(2),
                        totalScore: totalScore.toFixed(2)
                      });
                      
                      return {
                        code: formationCode,
                        score: totalScore,
                        breakdown: {
                          starterFilled,
                          starterTotal,
                          starterFraction,
                          backupSlotsWithCoverage,
                          backupFraction,
                          unusablePlayers,
                          notes: [`UI-based calculation: ${starterFilled}/11 starters, ${unusablePlayers} unusable`]
                        }
                      };
                    });

                    // Calculate rankings with the new player
                    const newPlayer = { ...player, price: parseInt(fantamilioni) || 0 };
                    const teamWithNewPlayer = {
                      ...team,
                      players: [...(team.players || []), newPlayer]
                    };

                    const newRankings = Object.keys(formations).map(formationCode => {
                      const stats = getFormationStatsForTeam(teamWithNewPlayer, formationCode);
                      console.log(`🔍 DEBUG: Formation ${formationCode} new stats:`, stats);
                      
                      // Calculate score based on UI values (exact same as RosaAcquistata)
                      const starterFilled = stats.occupiedPositions;
                      const starterTotal = 11;
                      const starterFraction = starterFilled / starterTotal;
                      
                      // Estimate backup coverage (simplified - could be improved)
                      const backupSlotsWithCoverage = Math.max(0, starterFilled - 1); // Assume some backup coverage
                      const backupFraction = backupSlotsWithCoverage / starterTotal;
                      
                      // Unusable players penalty
                      const unusablePlayers = stats.unassignedPlayers;
                      const unusablePenalty = Math.min(20, 20 * (unusablePlayers / Math.max(teamWithNewPlayer.players?.length || 1, 1)));
                      
                      // Calculate score (0-100)
                      const starterScore = 50 * starterFraction; // 0-50 points for starters
                      const backupScore = 30 * backupFraction;   // 0-30 points for backups
                      const totalScore = Math.max(0, Math.min(100, starterScore + backupScore - unusablePenalty));
                      
                      return {
                        code: formationCode,
                        score: totalScore,
                        breakdown: {
                          starterFilled,
                          starterTotal,
                          starterFraction,
                          backupSlotsWithCoverage,
                          backupFraction,
                          unusablePlayers,
                          notes: [`UI-based calculation: ${starterFilled}/11 starters, ${unusablePlayers} unusable`]
                        }
                      };
                    });

                    // Sort by score descending (exact same as RosaAcquistata)
                    currentRankings.sort((a, b) => b.score - a.score);
                    newRankings.sort((a, b) => b.score - a.score);

                    console.log('🔍 DEBUG: Current rankings:', currentRankings.map(r => ({ code: r.code, score: r.score.toFixed(1) })));
                    console.log('🔍 DEBUG: New rankings:', newRankings.map(r => ({ code: r.code, score: r.score.toFixed(1) })));

                    // Get top 3 formations with current and new scores
                    return currentRankings.slice(0, 3).map(currentFormation => {
                      const newRanking = newRankings.find(f => f.code === currentFormation.code);
                      
                      return {
                        code: currentFormation.code,
                        currentScore: Math.round(currentFormation.score),
                        newScore: newRanking ? Math.round(newRanking.score) : Math.round(currentFormation.score)
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
                  padding: '8px',
                  border: `2px solid ${isSelected ? '#3b82f6' : colorCoding.colors.border}`,
                  borderRadius: '8px',
                  backgroundColor: isSelected ? '#eff6ff' : colorCoding.colors.background,
                  color: isSelected ? '#3b82f6' : colorCoding.colors.text,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  fontSize: '17px', // Increased by 4 points from 13px
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px',
                  minHeight: '140px', // Reduced height for more compact layout
                  justifyContent: 'flex-start',
                  opacity: isDisabled ? 0.6 : 1,
                  minWidth: '140px', // Reduced width for better fit
                  maxWidth: '160px', // Reduced max width
                  flexShrink: 0,
                  flexBasis: 'calc(25% - 6px)', // 4 buttons per row (25% each minus gap)
                  width: 'calc(25% - 6px)' // Ensure exactly 4 buttons per line
                };
                
                // Use centralized budget color
                let budgetColor = colorCoding.colors.budget;
                if (isSelected) {
                  budgetColor = '#3b82f6';
                }
                
                return (
                  <button
                    key={team.id}
                    onClick={() => !isDisabled && setSelectedTeamId(String(team.id))}
                    style={buttonStyle}
                  >
                    {/* Team Name */}
                    <div style={{ fontWeight: 'bold', fontSize: '18px', textAlign: 'center', lineHeight: '1.2' }}>
                      {team.name}
                    </div>
                    
                    {/* Budget and Player Count in one line */}
                    <div style={{ fontSize: '16px', color: budgetColor, textAlign: 'center', lineHeight: '1.1' }}>
                      {teamRemainingBudget} FM
                    </div>
                    <div style={{ fontSize: '15px', color: '#666', textAlign: 'center', lineHeight: '1.1' }}>
                      {playerCount}/30
                    </div>
                    
                    {/* Formation Rankings - more compact */}
                    {formationRankings.length > 0 && (
                      <div style={{ marginTop: '6px', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '6px' }}>
                        {formationRankings.map((formation, idx) => (
                          <div key={idx} style={{ 
                            marginBottom: '3px', 
                            fontSize: '15px',
                            textAlign: 'center',
                            lineHeight: '1.1'
                          }}>
                            <div style={{ 
                              fontWeight: '500',
                              color: '#000000' // Formation in black
                            }}>
                              {formation.code}: <span style={{ color: '#ef4444' }}>{formation.currentScore}</span> → <span style={{ color: '#22c55e' }}>{formation.newScore}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </button>
                );
              }) : (
                <div style={{ color: '#666', fontSize: '20px', padding: '20px' }}>Nessuna squadra disponibile</div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Empty state - just show a placeholder */
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          width: '100%',
          color: '#9ca3af',
          fontSize: '20px',
          fontWeight: '500'
        }}>
          🛒 Clicca su "Compra" per iniziare l'acquisto di un giocatore
        </div>
      )}
    </div>
  );
};

export default FantamilioniBar;
