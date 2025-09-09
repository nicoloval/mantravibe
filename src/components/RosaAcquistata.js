// src/components/RosaAcquistata.js
import React, { useMemo, useCallback, useState, useEffect } from 'react';

const RosaAcquistata = ({ 
  players = [],
  playerStatus = {},
  onPlayerStatusChange,
  roleMapping = {},
  teams = [],
  onTeamsChange,
  appetibilitaData = {}
}) => {
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [formations, setFormations] = useState({});
  const [selectedFormation, setSelectedFormation] = useState('4-3-3');

  // Load formations data
  useEffect(() => {
    const loadFormations = async () => {
      try {
        const response = await fetch('/assets/mantra_formations_positions.json');
        const data = await response.json();
        setFormations(data);
      } catch (error) {
        console.error('Error loading formations:', error);
      }
    };
    
      loadFormations();
  }, []);

  // Initialize selected team when teams are available
  useEffect(() => {
    if (teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  // Get selected team
  const selectedTeam = teams.find(team => team.id === selectedTeamId);

  // Helper function to get player role (always Mantra mode)
  const getPlayerRole = useCallback((player) => {
    if (player['Ruolo Mantra']) {
      // In Mantra mode, use the first role from the array and map it
      const mantraRole = player['Ruolo Mantra'][0];
      return roleMapping[mantraRole] || mantraRole;
    }
    return player.Ruolo;
  }, [roleMapping]);
  // Get players from selected team
  const teamPlayers = useMemo(() => {
    if (!selectedTeam || !selectedTeam.players) return [];
    
    return selectedTeam.players.map(teamPlayer => {
      const playerDetail = players.find(p => p.id === teamPlayer.id);
      if (!playerDetail) return null;
      
      return {
        ...playerDetail,
        fantamilioni: teamPlayer.price,
        timestamp: teamPlayer.timestamp || Date.now()
      };
    }).filter(Boolean);
  }, [selectedTeam, players]);

  // Get available roles from roleMapping
  const availableRoles = useMemo(() => {
    if (roleMapping) {
      return Object.values(roleMapping).filter((role, index, arr) => arr.indexOf(role) === index);
    }
    return ['POR', 'DIF', 'CEN', 'ATT'];
  }, [roleMapping]);

  // Raggruppa giocatori per ruolo
  const playersByRole = useMemo(() => {
    const grouped = {};
    
    // Initialize grouped object with available roles
    availableRoles.forEach(role => {
      grouped[role] = { players: [], count: 0, total: 0 };
    });

    teamPlayers.forEach(player => {
      if (player['Ruolo Mantra']) {
        // In Mantra mode, player can have multiple roles
        try {
          const roles = JSON.parse(player['Ruolo Mantra'].replace(/'/g, '"'));
          roles.forEach(role => {
            const mappedRole = roleMapping[role] || role;
            if (grouped[mappedRole]) {
              grouped[mappedRole].players.push(player);
              grouped[mappedRole].count++;
              grouped[mappedRole].total += player.fantamilioni || 0;
            }
          });
        } catch (error) {
          console.error('Error parsing Ruolo Mantra:', error);
        }
      } else {
        // Fallback - single role
        const role = getPlayerRole(player);
      if (grouped[role]) {
        grouped[role].players.push(player);
        grouped[role].count++;
        grouped[role].total += player.fantamilioni || 0;
        }
      }
    });

    // Ordina ogni gruppo per fantamilioni spesi (decrescente)
    Object.keys(grouped).forEach(role => {
      grouped[role].players.sort((a, b) => (b.fantamilioni || 0) - (a.fantamilioni || 0));
    });

    return grouped;
  }, [teamPlayers, getPlayerRole, roleMapping, availableRoles]);

  // Statistiche totali
  const totalPlayers = teamPlayers.length;

  // Gestori eventi
  const handleRemovePlayer = (playerId) => {
    console.log('🔍 DEBUG: handleRemovePlayer called with playerId:', playerId);
    console.log('🔍 DEBUG: selectedTeamId:', selectedTeamId);
    console.log('🔍 DEBUG: current teams:', teams);
    console.log('🔍 DEBUG: current playerStatus:', playerStatus);
    
    if (window.confirm('Sei sicuro di voler rimuovere questo giocatore dalla squadra?')) {
      // Remove player from team
      if (selectedTeamId && onTeamsChange) {
        // Update teams by removing the player from the selected team
        const updatedTeams = teams.map(team => {
          if (team.id === selectedTeamId) {
            console.log('🔍 DEBUG: Team before removal:', team.players);
            const filteredPlayers = team.players.filter(player => player.id !== playerId);
            console.log('🔍 DEBUG: Team after removal:', filteredPlayers);
            return {
              ...team,
              players: filteredPlayers
            };
          }
          return team;
        });
        
        console.log('🔍 DEBUG: Updated teams:', updatedTeams);
        
        // Update teams state
        onTeamsChange(updatedTeams);
        
        // Update player status to 'none' (available again)
        console.log('🔍 DEBUG: Calling onPlayerStatusChange with:', playerId, 'none');
      onPlayerStatusChange(playerId, 'none');
        
        console.log(`✅ Removed player ${playerId} from team ${selectedTeamId}`);
      }
    }
  };

  // Stili
  const containerStyle = {
    width: '80%',
    margin: '0 auto',
    padding: '1rem'
  };

  const headerStyle = {
    marginBottom: '2rem',
    textAlign: 'center'
  };

  const titleStyle = {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#1f2937',
    margin: '0 0 1rem 0'
  };

  const rolesGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '1.5rem',
    marginTop: '2rem'
  };

  const roleCardStyle = {
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  };

  const roleHeaderStyle = {
    padding: '1rem',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  const roleTitleStyle = {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#1f2937',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  };

  const roleStatsStyle = {
    fontSize: '0.875rem',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  };

  const playersListStyle = {
    minHeight: '120px'
  };

  const playerItemStyle = {
    padding: '1rem',
    borderBottom: '1px solid #f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    transition: 'background-color 0.2s'
  };

  const playerInfoStyle = {
    flex: 1
  };

  const playerNameStyle = {
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '0.25rem'
  };

  const playerDetailsStyle = {
    fontSize: '0.875rem',
    color: '#6b7280'
  };

  const playerPriceStyle = {
    fontWeight: '600',
    color: '#dc2626',
    marginRight: '1rem',
    fontSize: '0.875rem'
  };

  const removeButtonStyle = {
    padding: '0.25rem 0.5rem',
    border: '1px solid #e5e7eb',
    backgroundColor: 'transparent',
    borderRadius: '6px',
    color: '#ef4444',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: '500',
    transition: 'all 0.2s'
  };

  const emptyStateStyle = {
    textAlign: 'center',
    padding: '3rem',
    color: '#64748b'
  };

  const emptyRoleStyle = {
    padding: '2rem',
    textAlign: 'center',
    color: '#9ca3af',
    fontStyle: 'italic'
  };

  const teamSelectorStyle = {
    marginBottom: '2rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    justifyContent: 'center'
  };

  const teamSelectorLabelStyle = {
    fontSize: '1rem',
    fontWeight: '500',
    color: '#374151'
  };

  const teamSelectorSelectStyle = {
    padding: '0.5rem 1rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '1rem',
    backgroundColor: 'white',
    color: '#374151',
    minWidth: '200px'
  };

  const formationSelectorStyle = {
    marginBottom: '2rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    justifyContent: 'center',
    flexWrap: 'wrap'
  };

  const formationButtonStyle = {
    padding: '0.5rem 1rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    backgroundColor: 'white',
    color: '#374151',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontWeight: '500'
  };

  const formationButtonActiveStyle = {
    ...formationButtonStyle,
    backgroundColor: '#3b82f6',
    color: 'white',
    borderColor: '#3b82f6'
  };

  const formationDisplayStyle = {
    marginBottom: '2rem',
    padding: '1.5rem',
    backgroundColor: '#f8fafc',
    borderRadius: '0.75rem',
    border: '1px solid #e2e8f0',
    justifyContent: 'center'
  };

  const formationLineStyle = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1.5rem'
  };

  const formationPositionStyle = {
    padding: '0.5rem 0.75rem',
    backgroundColor: 'white',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '0.7rem',
    fontWeight: '600',
    color: '#374151',
    minWidth: '50px',
    textAlign: 'center',
    whiteSpace: 'nowrap'
  };

  // Function to get role color for formation positions
  const getRoleColor = (role) => {
    const roleColorMap = {
      'P': '#f97316',    // Orange
      'DC': '#22c55e',   // Green
      'B': '#22c55e',    // Green
      'DD': '#22c55e',   // Green
      'DS': '#22c55e',   // Green (updated from Blue)
      'E': '#3b82f6',    // Blue
      'M': '#3b82f6',    // Blue
      'C': '#3b82f6',    // Blue
      'W': '#a855f7',    // Purple
      'T': '#a855f7',    // Purple
      'A': '#ef4444',    // Red
      'PC': '#ef4444'    // Red
    };
    return roleColorMap[role] || '#6b7280';
  };

  // Function to get position style with split colors for multiple roles
  const getPositionStyle = (positionData) => {
    const roles = positionData.roles || [positionData.role];
    const colors = roles.map(role => getRoleColor(role));
    
    // If only one role or all roles have the same color, use solid color
    if (colors.length === 1 || colors.every(color => color === colors[0])) {
      return {
        ...formationPositionStyle,
        backgroundColor: colors[0],
        color: 'white',
        border: `1px solid ${colors[0]}`
      };
    }
    
    // For multiple different colors, create a gradient or split effect
    if (colors.length === 2) {
      return {
        ...formationPositionStyle,
        background: `linear-gradient(90deg, ${colors[0]} 50%, ${colors[1]} 50%)`,
        color: 'white',
        border: `1px solid ${colors[0]}`,
        position: 'relative'
      };
    }
    
    // For more than 2 colors, use the first color as fallback
    return {
      ...formationPositionStyle,
      backgroundColor: colors[0],
      color: 'white',
      border: `1px solid ${colors[0]}`
    };
  };

  const formationLineLabelStyle = {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#6b7280',
    marginRight: '1rem',
    minWidth: '80px',
    textAlign: 'right'
  };

  const playerUnderRoleStyle = {
    fontSize: '0.65rem',
    color: '#374151',
    marginTop: '0.25rem',
    padding: '0.25rem',
    backgroundColor: '#f9fafb',
    borderRadius: '0.25rem',
    border: '1px solid #e5e7eb'
  };


  const unusedRolesBoxStyle = {
    marginTop: '1rem',
    padding: '1rem',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '0.5rem'
  };

  const unusedRolesTitleStyle = {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: '0.5rem',
    textAlign: 'center'
  };

  const unusedPlayerStyle = {
    fontSize: '0.7rem',
    color: '#374151',
    marginBottom: '0.25rem',
    padding: '0.25rem',
    backgroundColor: 'white',
    borderRadius: '0.25rem',
    border: '1px solid #fecaca'
  };

  // Mappatura ruoli con nomi (dynamic based on available roles)
  const roleInfo = useMemo(() => {
    const info = {};
    availableRoles.forEach(role => {
      info[role] = { name: role };
    });
    return info;
  }, [availableRoles]);

  // Organize formation positions into 4 lines with proper double role handling
  const getFormationLines = useMemo(() => {
    if (!formations[selectedFormation]) return { p: [], defense: [], midfield: [], attack: [] };
    
    const positions = formations[selectedFormation].positions;
    const lines = { p: [], defense: [], midfield: [], attack: [] };
    
    positions.forEach((positionGroup, index) => {
      // Handle double roles - if array has multiple roles, show them as "Role1/Role2"
      const positionDisplay = positionGroup.length > 1 ? positionGroup.join('/') : positionGroup[0];
      
      // Create position data with both display role and original roles array
      const positionData = { 
        role: positionDisplay, 
        roles: positionGroup, 
        positionIndex: index 
      };
      
      // Categorize positions into lines based on the formation structure
      if (positionGroup.some(role => role.toLowerCase() === 'p')) {
        lines.p.push(positionData);
      } else if (positionGroup.some(role => ['DC', 'DD', 'DS', 'B'].map(r => r.toLowerCase()).includes(role.toLowerCase()))) {
        lines.defense.push(positionData);
      } else if (positionGroup.some(role => ['M', 'C', 'E'].map(r => r.toLowerCase()).includes(role.toLowerCase()))) {
        lines.midfield.push(positionData);
      } else if (positionGroup.some(role => ['A', 'T', 'PC', 'W'].map(r => r.toLowerCase()).includes(role.toLowerCase()))) {
        lines.attack.push(positionData);
      }
    });
    
    return lines;
  }, [formations, selectedFormation]);

  // Count total positions to verify we have 11
  const getTotalPositions = useMemo(() => {
    if (!formations[selectedFormation]) return 0;
    return formations[selectedFormation].positions.length;
  }, [formations, selectedFormation]);

  // Get all roles used in the current formation
  const getFormationRoles = useMemo(() => {
    if (!formations[selectedFormation]) return new Set();
    const roles = new Set();
    formations[selectedFormation].positions.forEach(positionGroup => {
      positionGroup.forEach(role => roles.add(role));
    });
    return roles;
  }, [formations, selectedFormation]);


  // Organize players by their roles for the formation display
  const getPlayersByFormationRoles = useMemo(() => {
    if (!selectedTeam || !selectedTeam.players || !formations[selectedFormation]) return {};
    
    const playersByRole = {};
    const positionAssignments = {}; // Track which player is assigned to each position
    const unassignedPlayers = []; // Players that couldn't be assigned to any position
    
    // Initialize all formation roles
    getFormationRoles.forEach(role => {
      playersByRole[role] = [];
    });
    
    // Add unused roles box
    playersByRole['UNUSED'] = [];
    
    // Helper function to get appetibilita ranking for a role
    const getRoleRanking = (role) => {
      return appetibilitaData[role] || 999; // Default high value for unknown roles
    };
    
    // Create position slots from formation
    const formationPositions = formations[selectedFormation].positions.map((positionGroup, index) => ({
      positionIndex: index,
      roles: positionGroup, // Array of roles that can fill this position
      assignedPlayer: null,
      assignedPlayerId: null
    }));
    
    console.log('Formation positions:', formationPositions);
    
    // Get all team players with their possible roles
    const teamPlayers = selectedTeam.players.map(teamPlayer => {
      const playerDetail = players.find(p => p.id === teamPlayer.id);
      if (!playerDetail) return null;
      
      let possibleRoles = [];
      let unusedRoles = [];
      
      if (playerDetail['Ruolo Mantra']) {
        try {
          const roles = JSON.parse(playerDetail['Ruolo Mantra'].replace(/'/g, '"'));
          const mappedRoles = roles.map(role => roleMapping[role] || role);
          
          // Check each player role against each formation position
          mappedRoles.forEach(mappedRole => {
            let roleMatched = false;
            
            formationPositions.forEach(position => {
              // Case-insensitive matching
              const roleMatch = position.roles.some(formationRole => 
                formationRole.toLowerCase() === mappedRole.toLowerCase()
              );
              
              if (roleMatch) {
                roleMatched = true;
                // Normalize role key to match formation data case (uppercase)
                const normalizedRole = position.roles.find(formationRole => 
                  formationRole.toLowerCase() === mappedRole.toLowerCase()
                );
                
                if (normalizedRole) {
                  possibleRoles.push({
                    role: normalizedRole,
                    positionIndex: position.positionIndex,
                    ranking: getRoleRanking(normalizedRole),
                    originalRole: mappedRole
                  });
                }
              }
            });
            
            if (!roleMatched) {
              unusedRoles.push(mappedRole);
            }
          });
        } catch (error) {
          console.error('Error parsing Ruolo Mantra:', error);
        }
      } else {
        // Normal mode - single role
        const role = getPlayerRole(playerDetail);
        let roleMatched = false;
        
        formationPositions.forEach(position => {
          // Case-insensitive matching
          const roleMatch = position.roles.some(formationRole => 
            formationRole.toLowerCase() === role.toLowerCase()
          );
          
          if (roleMatch) {
            roleMatched = true;
            possibleRoles.push({
              role: role,
              positionIndex: position.positionIndex,
              ranking: getRoleRanking(role),
              originalRole: role
            });
          }
        });
        
        if (!roleMatched) {
          unusedRoles.push(role);
        }
      }
      
      return {
        playerId: teamPlayer.id,
        player: playerDetail,
        teamPlayer: teamPlayer,
        possibleRoles: possibleRoles,
        unusedRoles: unusedRoles
      };
    }).filter(Boolean);
    
    console.log('Team players with roles:', teamPlayers);
    
    // NEW ASSIGNMENT ALGORITHM: Position-based assignment following appetibilita priority
    
    // Step 1: Create a list of all positions with their appetibilita rankings
    // Each position can have multiple roles, so we need to find the best appetibilita for each position
    const positionAssignmentsList = [];
    formationPositions.forEach((position, positionIndex) => {
      // Find the best (lowest) appetibilita among all roles for this position
      const bestAppetibilita = Math.min(...position.roles.map(role => getRoleRanking(role)));
      
      positionAssignmentsList.push({
        positionIndex,
        roles: position.roles, // All possible roles for this position
        appetibilita: bestAppetibilita,
        assigned: false,
        assignedPlayer: null
      });
    });
    
    // Step 2: Sort positions by appetibilita (lower number = higher priority)
    // For same appetibilita, maintain original order (positionIndex)
    positionAssignmentsList.sort((a, b) => {
      if (a.appetibilita !== b.appetibilita) {
        return a.appetibilita - b.appetibilita;
      }
      // If same appetibilita, maintain original order (positionIndex)
      return a.positionIndex - b.positionIndex;
    });
    
    console.log('=== FORMATION ASSIGNMENT DEBUG ===');
    console.log('Position assignments sorted by appetibilita:', positionAssignmentsList);
    console.log('Total positions to fill:', positionAssignmentsList.length);
    console.log('Available players:', teamPlayers.length);
    
    // Debug: Show each position and its roles
    positionAssignmentsList.forEach((pos, index) => {
      console.log(`Position ${pos.positionIndex}: roles [${pos.roles.join(', ')}], appetibilita: ${pos.appetibilita}`);
    });
    
    // Step 3: For each position (in appetibilita order), find the best available player
    const availablePlayers = [...teamPlayers]; // Copy of all players
    const assignedPlayerIds = new Set(); // Track assigned players
    let totalAssignedPlayers = 0;
    const maxPlayers = 11; // Maximum 11 players in formation
    
    positionAssignmentsList.forEach((positionAssignment, assignmentIndex) => {
      console.log(`\n--- Processing Position ${positionAssignment.positionIndex} (${assignmentIndex + 1}/${positionAssignmentsList.length}) ---`);
      console.log(`Roles needed: [${positionAssignment.roles.join(', ')}]`);
      console.log(`Appetibilita: ${positionAssignment.appetibilita}`);
      
      if (positionAssignment.assigned) {
        console.log('❌ Position already assigned, skipping');
        return; // Skip already assigned positions
      }
      if (totalAssignedPlayers >= maxPlayers) {
        console.log('❌ Max players reached, stopping');
        return; // Stop if we've reached max players
      }
      
      const position = formationPositions[positionAssignment.positionIndex];
      if (position.assignedPlayer) {
        console.log('❌ Position already has a player, skipping');
        return; // Skip if position already has a player
      }
      
      console.log(`Available players before filtering: ${availablePlayers.length}`);
      console.log(`Already assigned player IDs: [${Array.from(assignedPlayerIds).join(', ')}]`);
      
      // Find all available players who can play ANY of the roles for this position
      const eligiblePlayers = availablePlayers.filter(playerData => {
        if (assignedPlayerIds.has(playerData.playerId)) {
          console.log(`  ❌ ${playerData.player.Nome} already assigned`);
          return false; // Already assigned
        }
        
        // Check if player can play ANY of the roles for this position
        const canPlay = playerData.possibleRoles.some(roleOption => 
          positionAssignment.roles.some(positionRole => 
            roleOption.role.toLowerCase() === positionRole.toLowerCase()
          )
        );
        
        if (canPlay) {
          console.log(`  ✅ ${playerData.player.Nome} can play this position`);
        } else {
          console.log(`  ❌ ${playerData.player.Nome} cannot play this position`);
        }
        
        return canPlay;
      });
      
      console.log(`Eligible players found: ${eligiblePlayers.length}`);
      
      if (eligiblePlayers.length > 0) {
        // Sort eligible players by Punteggio FPEDIA (higher is better)
        eligiblePlayers.sort((a, b) => {
          const aPunteggio = parseFloat(a.player['Punteggio FPEDIA'] || 0);
          const bPunteggio = parseFloat(b.player['Punteggio FPEDIA'] || 0);
          return bPunteggio - aPunteggio; // Higher Punteggio FPEDIA first
        });
        
        console.log('Eligible players sorted by Punteggio FPEDIA:');
        eligiblePlayers.forEach((player, index) => {
          const punteggio = parseFloat(player.player['Punteggio FPEDIA'] || 0);
          console.log(`  ${index + 1}. ${player.player.Nome} - Punteggio FPEDIA: ${punteggio}`);
        });
        
        const bestPlayer = eligiblePlayers[0];
        console.log(`🎯 Selected best player: ${bestPlayer.player.Nome}`);
        
        // Find which role the player will be assigned to (prefer the one with better appetibilita)
        const assignedRoleOption = bestPlayer.possibleRoles
          .filter(roleOption => 
            positionAssignment.roles.some(positionRole => 
              roleOption.role.toLowerCase() === positionRole.toLowerCase()
            )
          )
          .sort((a, b) => a.ranking - b.ranking)[0]; // Sort by appetibilita, pick the best
        
        if (!assignedRoleOption) {
          console.error('❌ No valid role found for player', bestPlayer.player.Nome);
        return;
      }
      
        console.log(`🎯 Selected role: ${assignedRoleOption.role} (appetibilita: ${assignedRoleOption.ranking})`);
        
        // Assign the best player to this position
        position.assignedPlayer = bestPlayer.player;
        position.assignedPlayerId = bestPlayer.playerId;
        positionAssignment.assigned = true;
        positionAssignment.assignedPlayer = bestPlayer;
        assignedPlayerIds.add(bestPlayer.playerId);
        totalAssignedPlayers++;
        
        console.log(`✅ ASSIGNED: ${bestPlayer.player.Nome} (ID: ${bestPlayer.playerId}) to position ${positionAssignment.positionIndex} as ${assignedRoleOption.role} with Punteggio FPEDIA ${bestPlayer.player['Punteggio FPEDIA']}`);
        console.log(`📊 Total assigned players: ${totalAssignedPlayers}/${maxPlayers}`);
        
        // Add to positionAssignments for tracking
        positionAssignments[bestPlayer.playerId] = {
          positionIndex: positionAssignment.positionIndex,
          role: assignedRoleOption.role,
          originalRole: assignedRoleOption.originalRole
          };
          
          // Add to playersByRole for display
        if (!playersByRole[assignedRoleOption.role]) {
          playersByRole[assignedRoleOption.role] = [];
        }
        
        playersByRole[assignedRoleOption.role].push({
          ...bestPlayer.player,
          price: bestPlayer.teamPlayer.price,
          fantamilioni: bestPlayer.teamPlayer.price,
          playerId: bestPlayer.playerId,
          assignedRole: assignedRoleOption.role,
          positionIndex: positionAssignment.positionIndex,
          originalRoles: bestPlayer.possibleRoles.map(r => r.originalRole)
        });
        
        console.log(`📋 Added to playersByRole[${assignedRoleOption.role}]`);
      } else {
        console.log(`❌ No eligible players found for position ${positionAssignment.positionIndex} with roles: ${positionAssignment.roles.join(', ')}`);
      }
    });
    
    console.log(`Total players assigned: ${totalAssignedPlayers}/${maxPlayers}`);
    
    // Create console command for debugging
    if (typeof window !== 'undefined') {
      window.debugFormation = () => {
        console.log('=== FORMATION DEBUG INFO ===');
        console.log('Selected Formation:', selectedFormation);
        console.log('Formation Positions:', formationPositions);
        console.log('Position Assignments:', positionAssignments);
        console.log('Players by Role:', playersByRole);
        console.log('Assigned Player IDs:', Array.from(assignedPlayerIds));
        console.log('Total Assigned Players:', totalAssignedPlayers);
        
        // Show each position and its assignment
        formationPositions.forEach((position, index) => {
          console.log(`Position ${index}:`, {
            roles: position.roles,
            assignedPlayer: position.assignedPlayer ? position.assignedPlayer.Nome : 'NONE',
            assignedPlayerId: position.assignedPlayerId || 'NONE'
          });
        });
        
        // Check for duplicates
        const playerIdCounts = {};
        formationPositions.forEach(position => {
          if (position.assignedPlayerId) {
            playerIdCounts[position.assignedPlayerId] = (playerIdCounts[position.assignedPlayerId] || 0) + 1;
          }
        });
        
        const duplicates = Object.entries(playerIdCounts).filter(([id, count]) => count > 1);
        if (duplicates.length > 0) {
          console.error('🚨 DUPLICATE PLAYERS FOUND:', duplicates);
        } else {
          console.log('✅ No duplicate players found');
        }
        
        return {
          formation: selectedFormation,
          positions: formationPositions,
          assignments: positionAssignments,
          playersByRole,
          totalAssigned: totalAssignedPlayers,
          duplicates
        };
      };
      
      console.log('🔧 Debug command available: window.debugFormation()');
    }
    
    // Step 4: Add unassigned players to unused
    teamPlayers.forEach(playerData => {
      if (!assignedPlayerIds.has(playerData.playerId)) {
        // Player was not assigned to any position
        if (playerData.possibleRoles.length === 0) {
          // Player has no matching roles
          playerData.unusedRoles.forEach(unusedRole => {
            unassignedPlayers.push({
              ...playerData.player,
              price: playerData.teamPlayer.price,
              fantamilioni: playerData.teamPlayer.price,
              originalRole: unusedRole,
              playerId: playerData.playerId
            });
          });
        } else {
          // Player has matching roles but wasn't assigned (all positions taken)
        playerData.unusedRoles.forEach(unusedRole => {
          unassignedPlayers.push({
            ...playerData.player,
            price: playerData.teamPlayer.price,
            originalRole: unusedRole,
            playerId: playerData.playerId
          });
        });
        }
      }
    });
    
    // Add unassigned players to unused box
    playersByRole['UNUSED'] = unassignedPlayers;
    
    console.log('\n=== ASSIGNMENT SUMMARY ===');
    console.log('Final position assignments:', positionAssignments);
    console.log('Unassigned players:', unassignedPlayers.length);
    console.log('Players by role summary:');
    Object.entries(playersByRole).forEach(([role, players]) => {
      console.log(`  ${role}: ${players.length} players`);
    });
    console.log('=== END ASSIGNMENT DEBUG ===\n');
    
    return { playersByRole, positionAssignments };
  }, [selectedTeam, players, getFormationRoles, roleMapping, getPlayerRole, formations, selectedFormation, appetibilitaData]);

  // Get reserve players (not assigned to formation) sorted by roles.csv order
  const getReservePlayers = useMemo(() => {
    if (!selectedTeam || !selectedTeam.players || !formations[selectedFormation]) return [];
    
    const assignedPlayerIds = new Set();
    
    // Get all assigned player IDs from the formation assignment results
    if (getPlayersByFormationRoles && getPlayersByFormationRoles.positionAssignments) {
      // The player IDs are the keys of the positionAssignments object
      Object.keys(getPlayersByFormationRoles.positionAssignments).forEach(playerId => {
        assignedPlayerIds.add(parseInt(playerId));
      });
    }
    
    console.log('🔍 DEBUG: Reserve players calculation:');
    console.log('  Total team players:', selectedTeam.players.length);
    console.log('  Assigned player IDs from positionAssignments:', Array.from(assignedPlayerIds));
    console.log('  getPlayersByFormationRoles:', getPlayersByFormationRoles);
    console.log('  positionAssignments keys:', getPlayersByFormationRoles?.positionAssignments ? Object.keys(getPlayersByFormationRoles.positionAssignments) : 'none');
    console.log('  positionAssignments values:', getPlayersByFormationRoles?.positionAssignments ? Object.values(getPlayersByFormationRoles.positionAssignments) : 'none');
    
    // Get unassigned players from the team
    const reservePlayers = selectedTeam.players.filter(player => {
      const isAssigned = assignedPlayerIds.has(player.player_id);
      if (isAssigned) {
        console.log(`  ❌ Player ${player.Nome} (ID: ${player.player_id}) is assigned to formation`);
      } else {
        console.log(`  ✅ Player ${player.Nome} (ID: ${player.player_id}) is available for reserves`);
      }
      return !isAssigned;
    });
    
    console.log('  Reserve players count:', reservePlayers.length);
    console.log('  Reserve players:', reservePlayers.map(p => `${p.Nome} (ID: ${p.player_id})`));
    
    // Sort by roles.csv order
    const roleOrder = ['G', 'CB', 'LA', 'RB', 'LB', 'E', 'DM', 'M', 'W', 'OM', 'F', 'CF'];
    
    return reservePlayers.sort((a, b) => {
      const aRole = a['Ruolo Mantra'] ? (Array.isArray(a['Ruolo Mantra']) ? a['Ruolo Mantra'][0] : a['Ruolo Mantra']) : '';
      const bRole = b['Ruolo Mantra'] ? (Array.isArray(b['Ruolo Mantra']) ? b['Ruolo Mantra'][0] : b['Ruolo Mantra']) : '';
      
      const aIndex = roleOrder.indexOf(aRole);
      const bIndex = roleOrder.indexOf(bRole);
      
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      
      return aIndex - bIndex;
    });
  }, [selectedTeam, formations, selectedFormation, getPlayersByFormationRoles]);

  if (totalPlayers === 0) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <h1 style={titleStyle}>
            La mia Rosa
          </h1>
        </div>
        
        {/* Team Selector */}
        {teams.length > 0 && (
          <div style={teamSelectorStyle}>
            <label style={teamSelectorLabelStyle}>Squadra:</label>
            <select
              value={selectedTeamId || ''}
              onChange={(e) => setSelectedTeamId(parseInt(e.target.value))}
              style={teamSelectorSelectStyle}
            >
              {teams.map(team => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Formation Selector */}
        {Object.keys(formations).length > 0 && (
          <div style={formationSelectorStyle}>
            <span style={teamSelectorLabelStyle}>Formazione:</span>
            {Object.keys(formations).map(formation => (
              <button
                key={formation}
                onClick={() => setSelectedFormation(formation)}
                style={selectedFormation === formation ? formationButtonActiveStyle : formationButtonStyle}
              >
                {formation}
              </button>
            ))}
          </div>
        )}

        {/* Formation Display */}
        {formations[selectedFormation] && (
          <div style={formationDisplayStyle}>
            <h3 style={{ textAlign: 'center', marginBottom: '0.5rem', fontSize: '1.125rem', fontWeight: '600', color: '#374151' }}>
              Formazione {selectedFormation}
            </h3>
            <div style={{ textAlign: 'center', marginBottom: '1rem', fontSize: '0.75rem', color: '#6b7280' }}>
              {getTotalPositions} posizioni totali
            </div>
            
            {/* P Line */}
            <div style={formationLineStyle}>
              <span style={formationLineLabelStyle}>Portiere:</span>
              {getFormationLines.p.map((positionData, index) => (
                <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={formationPositionStyle}>
                    {positionData.role}
                  </div>
                  {(() => {
                    // Find the player assigned to this specific position
                    const assignedPlayer = getPlayersByFormationRoles.positionAssignments ? 
                      Object.values(getPlayersByFormationRoles.positionAssignments).find(assignment => 
                        assignment.positionIndex === positionData.positionIndex
                      ) : null;
                    
                    if (assignedPlayer) {
                      const player = getPlayersByFormationRoles.playersByRole[assignedPlayer.role]?.find(p => 
                        p.positionIndex === positionData.positionIndex
                      );
                      return player ? (
                        <div style={playerUnderRoleStyle}>
                        {player.Nome}
                      </div>
                      ) : null;
                  }
                    return null;
                  })()}
                </div>
              ))}
            </div>

            {/* Defense Line */}
            <div style={formationLineStyle}>
              <span style={formationLineLabelStyle}>Difesa:</span>
              {getFormationLines.defense.map((positionData, index) => (
                  <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={formationPositionStyle}>
                    {positionData.role}
                    </div>
                  {(() => {
                    // Find the player assigned to this specific position
                    const assignedPlayer = getPlayersByFormationRoles.positionAssignments ? 
                      Object.values(getPlayersByFormationRoles.positionAssignments).find(assignment => 
                        assignment.positionIndex === positionData.positionIndex
                      ) : null;
                    
                    if (assignedPlayer) {
                      const player = getPlayersByFormationRoles.playersByRole[assignedPlayer.role]?.find(p => 
                        p.positionIndex === positionData.positionIndex
                      );
                      return player ? (
                        <div style={playerUnderRoleStyle}>
                          {player.Nome}
                        </div>
                      ) : null;
                    }
                    return null;
                  })()}
                  </div>
              ))}
            </div>

            {/* Midfield Line */}
            <div style={formationLineStyle}>
              <span style={formationLineLabelStyle}>Centrocampo:</span>
              {getFormationLines.midfield.map((positionData, index) => (
                  <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={formationPositionStyle}>
                    {positionData.role}
                    </div>
                  {(() => {
                    // Find the player assigned to this specific position
                    const assignedPlayer = getPlayersByFormationRoles.positionAssignments ? 
                      Object.values(getPlayersByFormationRoles.positionAssignments).find(assignment => 
                        assignment.positionIndex === positionData.positionIndex
                      ) : null;
                    
                    if (assignedPlayer) {
                      const player = getPlayersByFormationRoles.playersByRole[assignedPlayer.role]?.find(p => 
                        p.positionIndex === positionData.positionIndex
                      );
                      return player ? (
                        <div style={playerUnderRoleStyle}>
                          {player.Nome}
                        </div>
                      ) : null;
                    }
                    return null;
                  })()}
                  </div>
              ))}
            </div>

            {/* Attack Line */}
            <div style={formationLineStyle}>
              <span style={formationLineLabelStyle}>Attacco:</span>
              {getFormationLines.attack.map((positionData, index) => (
                  <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={formationPositionStyle}>
                    {positionData.role}
                    </div>
                  {(() => {
                    // Find the player assigned to this specific position
                    const assignedPlayer = getPlayersByFormationRoles.positionAssignments ? 
                      Object.values(getPlayersByFormationRoles.positionAssignments).find(assignment => 
                        assignment.positionIndex === positionData.positionIndex
                      ) : null;
                    
                    if (assignedPlayer) {
                      const player = getPlayersByFormationRoles.playersByRole[assignedPlayer.role]?.find(p => 
                        p.positionIndex === positionData.positionIndex
                      );
                      return player ? (
                        <div style={playerUnderRoleStyle}>
                          {player.Nome}
                        </div>
                      ) : null;
                    }
                    return null;
                  })()}
                  </div>
              ))}
            </div>

            {/* Unused Roles Box */}
            {getPlayersByFormationRoles.playersByRole && getPlayersByFormationRoles.playersByRole['UNUSED'] && 
             getPlayersByFormationRoles.playersByRole['UNUSED'].length > 0 && (
              <div style={unusedRolesBoxStyle}>
                <div style={unusedRolesTitleStyle}>
                  Giocatori con ruoli non utilizzati in questa formazione
                </div>
                {getPlayersByFormationRoles.playersByRole['UNUSED'].map((player, index) => (
                  <div key={index} style={unusedPlayerStyle}>
                    {player.Nome} - {player.originalRole} ({player.fantamilioni} FM)
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        <div style={emptyStateStyle}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>😔</div>
          <h2 style={{ 
            fontSize: '1.5rem', 
            fontWeight: '600', 
            color: '#374151', 
            marginBottom: '1rem' 
          }}>
            Nessun giocatore acquistato
          </h2>
          <p style={{ 
            color: '#6b7280', 
            lineHeight: '1.6' 
          }}>
            Inizia ad acquistare giocatori dalla sezione "Giocatori"<br />
            per vedere la tua rosa qui.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h1 style={titleStyle}>
          La mia Rosa
        </h1>
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <span style={{ fontSize: '1.125rem', fontWeight: '600', color: '#374151' }}>
            {selectedTeam ? selectedTeam.name : 'Nessuna squadra selezionata'}
          </span>
          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
            {totalPlayers} giocatori acquistati
          </div>
        </div>
      </div>

      {/* Team Selector */}
      {teams.length > 0 && (
        <div style={teamSelectorStyle}>
          <label style={teamSelectorLabelStyle}>Squadra:</label>
          <select
            value={selectedTeamId || ''}
            onChange={(e) => setSelectedTeamId(parseInt(e.target.value))}
            style={teamSelectorSelectStyle}
          >
            {teams.map(team => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Formation Selector */}
      {Object.keys(formations).length > 0 && (
        <div style={formationSelectorStyle}>
          <span style={teamSelectorLabelStyle}>Formazione:</span>
          {Object.keys(formations).map(formation => (
            <button
              key={formation}
              onClick={() => setSelectedFormation(formation)}
              style={selectedFormation === formation ? formationButtonActiveStyle : formationButtonStyle}
            >
              {formation}
            </button>
          ))}
        </div>
      )}

      {/* Formation Display */}
      {formations[selectedFormation] && (
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', minHeight: '600px' }}>
          {/* Riserve Column */}
          <div style={{ 
            minWidth: '280px', 
            maxWidth: '300px',
            backgroundColor: '#f8fafc', 
            borderRadius: '0.5rem', 
            padding: '1rem',
            border: '1px solid #e2e8f0',
            height: 'fit-content'
          }}>
            <h3 style={{ 
              textAlign: 'center', 
              marginBottom: '1rem', 
              fontSize: '1.125rem', 
              fontWeight: '600', 
              color: '#374151' 
            }}>
              Riserve ({getReservePlayers.length})
          </h3>
            
            {getReservePlayers.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {getReservePlayers.map((player, index) => {
                  // Convert role to Italian and get color using roles.csv mapping
                  const roleToItalianAndColor = (role) => {
                    const roleMap = {
                      'G': { italian: 'P', color: 'Orange' }, 
                      'CB': { italian: 'DC', color: 'Green' }, 
                      'LA': { italian: 'B', color: 'Green' }, 
                      'RB': { italian: 'DD', color: 'Green' }, 
                      'LB': { italian: 'DS', color: 'Green' }, // Updated from Blue to Green
                      'E': { italian: 'E', color: 'Blue' }, 
                      'DM': { italian: 'M', color: 'Blue' }, 
                      'M': { italian: 'C', color: 'Blue' }, 
                      'W': { italian: 'W', color: 'Purple' }, 
                      'OM': { italian: 'T', color: 'Purple' }, 
                      'F': { italian: 'A', color: 'Red' }, 
                      'CF': { italian: 'PC', color: 'Red' }
                    };
                    return roleMap[role] || { italian: role, color: 'Gray' };
                  };
                  
                  // Parse the Ruolo Mantra field properly
                  let playerRoles = [];
                  if (player['Ruolo Mantra']) {
                    if (Array.isArray(player['Ruolo Mantra'])) {
                      // It's already an array
                      playerRoles = player['Ruolo Mantra'];
                    } else if (typeof player['Ruolo Mantra'] === 'string') {
                      // It's a string that needs to be parsed
                      try {
                        // Replace single quotes with double quotes and parse as JSON
                        const jsonString = player['Ruolo Mantra'].replace(/'/g, '"');
                        playerRoles = JSON.parse(jsonString);
                      } catch (e) {
                        // If parsing fails, treat as single role
                        playerRoles = [player['Ruolo Mantra']];
                      }
                    } else {
                      // Fallback for other types
                      playerRoles = [player['Ruolo Mantra']];
                    }
                  }
                  
                  // Debug logging
                  console.log('🔍 DEBUG: Player roles for', player.Nome, ':', {
                    original: player['Ruolo Mantra'],
                    parsed: playerRoles,
                    type: typeof player['Ruolo Mantra']
                  });
                  
                  // Convert each role to Italian and get color
                  const roleData = playerRoles.map(roleToItalianAndColor);
                  
                  return (
                    <div key={player.player_id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.5rem',
                      backgroundColor: 'white',
                      borderRadius: '0.25rem',
                      border: '1px solid #e2e8f0',
                      fontSize: '0.75rem'
                    }}>
                      <div>
                        <div style={{ fontWeight: '600', color: '#1f2937', fontSize: '0.75rem' }}>
                          {player.Nome}
          </div>
                        <div style={{ fontSize: '0.625rem', color: '#6b7280' }}>
                          {player.Squadra}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                        {roleData.map((roleInfo, roleIndex) => {
                          // Convert color name to hex
                          const getColorHex = (colorName) => {
                            const colorMap = {
                              'Orange': '#f97316',
                              'Green': '#22c55e', 
                              'Blue': '#3b82f6',
                              'Purple': '#a855f7',
                              'Red': '#ef4444',
                              'Gray': '#6b7280'
                            };
                            return colorMap[colorName] || '#6b7280';
                          };
                          
                          return (
                            <span key={roleIndex} style={{
                              padding: '0.125rem 0.375rem',
                              backgroundColor: getColorHex(roleInfo.color),
                              color: 'white',
                              borderRadius: '0.25rem',
                              fontSize: '0.625rem',
                              fontWeight: '600',
                              minWidth: '1.5rem',
                              textAlign: 'center'
                            }}>
                              {roleInfo.italian}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                color: '#6b7280', 
                fontSize: '0.875rem',
                padding: '2rem 1rem'
              }}>
                Nessuna riserva
              </div>
            )}
          </div>

          {/* Formation Column */}
          <div style={{
            ...formationDisplayStyle,
            flex: 1,
            minHeight: '600px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <h3 style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '1.125rem', fontWeight: '600', color: '#374151' }}>
              Formazione {selectedFormation}
            </h3>
          
          {/* P Line */}
          <div style={formationLineStyle}>
            {getFormationLines.p.map((positionData, index) => (
              <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={getPositionStyle(positionData)}>
                  {positionData.role}
                </div>
                {(() => {
                  // Find the player assigned to this specific position
                  const assignedPlayer = getPlayersByFormationRoles.positionAssignments ? 
                    Object.values(getPlayersByFormationRoles.positionAssignments).find(assignment => 
                      assignment.positionIndex === positionData.positionIndex
                    ) : null;
                  
                  if (assignedPlayer) {
                    const player = getPlayersByFormationRoles.playersByRole[assignedPlayer.role]?.find(p => 
                      p.positionIndex === positionData.positionIndex
                    );
                    return player ? (
                      <div style={playerUnderRoleStyle}>
                      {player.Nome} ({player.fantamilioni} FM)
                    </div>
                    ) : null;
                }
                  return null;
                })()}
              </div>
            ))}
          </div>

          {/* Defense Line */}
          <div style={formationLineStyle}>
            {getFormationLines.defense.map((positionData, index) => (
                <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={getPositionStyle(positionData)}>
                  {positionData.role}
                  </div>
                {(() => {
                  // Find the player assigned to this specific position
                  const assignedPlayer = getPlayersByFormationRoles.positionAssignments ? 
                    Object.values(getPlayersByFormationRoles.positionAssignments).find(assignment => 
                      assignment.positionIndex === positionData.positionIndex
                    ) : null;
                  
                  if (assignedPlayer) {
                    const player = getPlayersByFormationRoles.playersByRole[assignedPlayer.role]?.find(p => 
                      p.positionIndex === positionData.positionIndex
                    );
                    return player ? (
                      <div style={playerUnderRoleStyle}>
                          {player.Nome}
                        </div>
                    ) : null;
                  }
                  return null;
                })()}
                </div>
            ))}
          </div>

          {/* Midfield Line */}
          <div style={formationLineStyle}>
            {getFormationLines.midfield.map((positionData, index) => (
                <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={getPositionStyle(positionData)}>
                  {positionData.role}
                  </div>
                {(() => {
                  // Find the player assigned to this specific position
                  const assignedPlayer = getPlayersByFormationRoles.positionAssignments ? 
                    Object.values(getPlayersByFormationRoles.positionAssignments).find(assignment => 
                      assignment.positionIndex === positionData.positionIndex
                    ) : null;
                  
                  if (assignedPlayer) {
                    const player = getPlayersByFormationRoles.playersByRole[assignedPlayer.role]?.find(p => 
                      p.positionIndex === positionData.positionIndex
                    );
                    return player ? (
                      <div style={playerUnderRoleStyle}>
                        {player.Nome}
                      </div>
                    ) : null;
                  }
                  return null;
                })()}
                </div>
            ))}
          </div>

          {/* Attack Line */}
          <div style={formationLineStyle}>
            {getFormationLines.attack.map((positionData, index) => (
                <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={getPositionStyle(positionData)}>
                  {positionData.role}
                  </div>
                {(() => {
                  // Find the player assigned to this specific position
                  const assignedPlayer = getPlayersByFormationRoles.positionAssignments ? 
                    Object.values(getPlayersByFormationRoles.positionAssignments).find(assignment => 
                      assignment.positionIndex === positionData.positionIndex
                    ) : null;
                  
                  if (assignedPlayer) {
                    const player = getPlayersByFormationRoles.playersByRole[assignedPlayer.role]?.find(p => 
                      p.positionIndex === positionData.positionIndex
                    );
                    return player ? (
                      <div style={playerUnderRoleStyle}>
                        {player.Nome}
                      </div>
                    ) : null;
                  }
                  return null;
                })()}
                </div>
            ))}
          </div>

          {/* Unused Roles Box */}
          {getPlayersByFormationRoles.playersByRole && getPlayersByFormationRoles.playersByRole['UNUSED'] && 
           getPlayersByFormationRoles.playersByRole['UNUSED'].length > 0 && (
            <div style={unusedRolesBoxStyle}>
              <div style={unusedRolesTitleStyle}>
                Giocatori con ruoli non utilizzati in questa formazione
              </div>
              {getPlayersByFormationRoles.playersByRole['UNUSED'].map((player, index) => (
                <div key={index} style={unusedPlayerStyle}>
                  {player.Nome} - {player.originalRole} ({player.price} FM)
                </div>
              ))}
            </div>
          )}
          </div>
        </div>
      )}

      {/* Griglia ruoli */}
      <div style={rolesGridStyle}>
        {Object.entries(roleInfo).map(([roleKey, roleData]) => {
          const roleStats = playersByRole[roleKey];
          
          return (
            <div key={roleKey} style={roleCardStyle}>
              {/* Header ruolo */}
              <div style={roleHeaderStyle}>
                <div style={roleTitleStyle}>
                  {roleData.name}
                </div>
                <div style={roleStatsStyle}>
                  <span>{roleStats.count} giocatori</span>
                  {roleStats.total > 0 && (
                    <span>• {roleStats.total} FM</span>
                  )}
                </div>
              </div>

              {/* Lista giocatori */}
              <div style={playersListStyle}>
                {roleStats.players.length === 0 ? (
                  <div style={emptyRoleStyle}>
                    Nessun {roleData.name.toLowerCase()} acquistato
                  </div>
                ) : (
                  roleStats.players.map((player, index) => (
                    <div 
                      key={player.id} 
                      style={{
                        ...playerItemStyle,
                        ...(index === roleStats.players.length - 1 ? { borderBottom: 'none' } : {})
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8fafc';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div style={playerInfoStyle}>
                        <div style={playerNameStyle}>
                          {player.Nome}
                        </div>
                        <div style={playerDetailsStyle}>
                          {player.Squadra} 
                          {player.convenienza && (
                            <span> • Conv: {player.convenienza.toFixed(1)}</span>
                          )}
                          {player.Fanta_Voto && (
                            <span> • Voto: {player.Fanta_Voto}</span>
                          )}
                        </div>
                      </div>
                      
                      <div style={playerPriceStyle}>
                        {player.fantamilioni} FM
                      </div>
                      
                      <button
                        onClick={() => handleRemovePlayer(player.id)}
                        style={removeButtonStyle}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#ef4444';
                          e.target.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = 'transparent';
                          e.target.style.color = '#ef4444';
                        }}
                        title="Rimuovi dalla rosa"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RosaAcquistata;
