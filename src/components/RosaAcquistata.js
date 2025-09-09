// src/components/RosaAcquistata.js
import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { getAcquiredPlayers } from '../utils/storage';

const RosaAcquistata = ({ 
  players = [],
  playerStatus = {},
  onPlayerStatusChange,
  isMantraMode = false,
  roleMapping = {},
  teams = [],
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
    
    if (isMantraMode) {
      loadFormations();
    }
  }, [isMantraMode]);

  // Initialize selected team when teams are available
  useEffect(() => {
    if (teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  // Get selected team
  const selectedTeam = teams.find(team => team.id === selectedTeamId);

  // Helper function to get player role (handles both normal and Mantra modes)
  const getPlayerRole = useCallback((player) => {
    if (isMantraMode && player['Ruolo Mantra']) {
      // In Mantra mode, use the first role from the array and map it
      const mantraRole = player['Ruolo Mantra'][0];
      return roleMapping[mantraRole] || mantraRole;
    }
    return player.Ruolo;
  }, [isMantraMode, roleMapping]);
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
    if (isMantraMode && roleMapping) {
      return Object.values(roleMapping).filter((role, index, arr) => arr.indexOf(role) === index);
    }
    return ['POR', 'DIF', 'CEN', 'ATT'];
  }, [isMantraMode, roleMapping]);

  // Raggruppa giocatori per ruolo
  const playersByRole = useMemo(() => {
    const grouped = {};
    
    // Initialize grouped object with available roles
    availableRoles.forEach(role => {
      grouped[role] = { players: [], count: 0, total: 0 };
    });

    teamPlayers.forEach(player => {
      if (isMantraMode && player['Ruolo Mantra']) {
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
        // Normal mode - single role
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
  }, [teamPlayers, getPlayerRole, isMantraMode, roleMapping, availableRoles]);

  // Statistiche totali
  const totalPlayers = teamPlayers.length;

  // Gestori eventi
  const handleRemovePlayer = (playerId) => {
    if (window.confirm('Sei sicuro di voler rimuovere questo giocatore dalla squadra?')) {
      // Remove player from team
      if (window.addPlayerToTeam && selectedTeamId) {
        // This is a bit of a hack - we need to remove the player from the team
        // For now, we'll use the existing player status change
        onPlayerStatusChange(playerId, 'none');
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
    border: '1px solid #e2e8f0'
  };

  const formationLineStyle = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.75rem'
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

  const playerUnderRoleMultipleStyle = {
    ...playerUnderRoleStyle,
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b'
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
      
      // Categorize positions into lines based on the formation structure
      if (positionGroup.some(role => role.toLowerCase() === 'p')) {
        lines.p.push(positionDisplay);
      } else if (positionGroup.some(role => ['DC', 'DD', 'DS', 'B'].map(r => r.toLowerCase()).includes(role.toLowerCase()))) {
        lines.defense.push(positionDisplay);
      } else if (positionGroup.some(role => ['M', 'C', 'E'].map(r => r.toLowerCase()).includes(role.toLowerCase()))) {
        lines.midfield.push(positionDisplay);
      } else if (positionGroup.some(role => ['A', 'T', 'PC', 'W'].map(r => r.toLowerCase()).includes(role.toLowerCase()))) {
        lines.attack.push(positionDisplay);
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
      
      if (isMantraMode && playerDetail['Ruolo Mantra']) {
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
    
    // Sort players by their best possible role ranking (lower is better)
    teamPlayers.sort((a, b) => {
      const aBestRanking = Math.min(...a.possibleRoles.map(r => r.ranking));
      const bBestRanking = Math.min(...b.possibleRoles.map(r => r.ranking));
      return aBestRanking - bBestRanking;
    });
    
    // Assign players to positions using greedy algorithm
    teamPlayers.forEach(playerData => {
      if (playerData.possibleRoles.length === 0) {
        // Player has no matching roles, add to unused
        playerData.unusedRoles.forEach(unusedRole => {
          unassignedPlayers.push({
            ...playerData.player,
            price: playerData.teamPlayer.price,
            originalRole: unusedRole,
            playerId: playerData.playerId
          });
        });
        return;
      }
      
      // Sort possible roles by ranking (lower is better)
      playerData.possibleRoles.sort((a, b) => a.ranking - b.ranking);
      
      // Try to assign player to their best available position
      let assigned = false;
      for (const roleOption of playerData.possibleRoles) {
        const position = formationPositions[roleOption.positionIndex];
        
        // Check if this position is still available
        if (!position.assignedPlayer) {
          // Assign player to this position
          position.assignedPlayer = playerData.player;
          position.assignedPlayerId = playerData.playerId;
          positionAssignments[playerData.playerId] = {
            positionIndex: roleOption.positionIndex,
            role: roleOption.role,
            originalRole: roleOption.originalRole
          };
          
          // Add to playersByRole for display
          if (!playersByRole[roleOption.role]) {
            playersByRole[roleOption.role] = [];
          }
          
          playersByRole[roleOption.role].push({
            ...playerData.player,
            price: playerData.teamPlayer.price,
            playerId: playerData.playerId,
            assignedRole: roleOption.role,
            positionIndex: roleOption.positionIndex,
            originalRoles: playerData.possibleRoles.map(r => r.originalRole)
          });
          
          assigned = true;
          
          // Debug logging
          if (playerData.player.Nome && playerData.player.Nome.toLowerCase().includes('tramoni')) {
            console.log('Tramoni assigned to position:', {
              playerName: playerData.player.Nome,
              positionIndex: roleOption.positionIndex,
              role: roleOption.role,
              ranking: roleOption.ranking
            });
          }
          
          break;
        }
      }
      
      if (!assigned) {
        // Player couldn't be assigned to any position, add to unused
        playerData.unusedRoles.forEach(unusedRole => {
          unassignedPlayers.push({
            ...playerData.player,
            price: playerData.teamPlayer.price,
            originalRole: unusedRole,
            playerId: playerData.playerId
          });
        });
      }
    });
    
    // Add unassigned players to unused box
    playersByRole['UNUSED'] = unassignedPlayers;
    
    console.log('Final position assignments:', positionAssignments);
    console.log('Unassigned players:', unassignedPlayers);
    
    return { playersByRole, positionAssignments };
  }, [selectedTeam, players, getFormationRoles, isMantraMode, roleMapping, getPlayerRole, formations, selectedFormation, appetibilitaData]);

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
        {isMantraMode && Object.keys(formations).length > 0 && (
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
        {isMantraMode && formations[selectedFormation] && (
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
              {getFormationLines.p.map((role, index) => (
                <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={formationPositionStyle}>
                    {role}
                  </div>
                  {getPlayersByFormationRoles.playersByRole && getPlayersByFormationRoles.playersByRole['P'] && 
                    getPlayersByFormationRoles.playersByRole['P'].map((player, playerIndex) => (
                      <div 
                        key={playerIndex} 
                        style={playerUnderRoleStyle}
                      >
                        {player.Nome}
                      </div>
                    ))
                  }
                </div>
              ))}
            </div>

            {/* Defense Line */}
            <div style={formationLineStyle}>
              <span style={formationLineLabelStyle}>Difesa:</span>
              {getFormationLines.defense.map((role, index) => {
                // Get all individual roles from the position (e.g., "A/PC" -> ["A", "PC"])
                const individualRoles = role.includes('/') ? role.split('/') : [role];
                return (
                  <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={formationPositionStyle}>
                      {role}
                    </div>
                    {individualRoles.map(individualRole => 
                      getPlayersByFormationRoles.playersByRole && getPlayersByFormationRoles.playersByRole[individualRole] && 
                      getPlayersByFormationRoles.playersByRole[individualRole].map((player, playerIndex) => (
                        <div 
                          key={`${individualRole}-${playerIndex}`} 
                          style={playerUnderRoleStyle}
                        >
                          {player.Nome}
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </div>

            {/* Midfield Line */}
            <div style={formationLineStyle}>
              <span style={formationLineLabelStyle}>Centrocampo:</span>
              {getFormationLines.midfield.map((role, index) => {
                // Get all individual roles from the position (e.g., "A/PC" -> ["A", "PC"])
                const individualRoles = role.includes('/') ? role.split('/') : [role];
                return (
                  <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={formationPositionStyle}>
                      {role}
                    </div>
                    {individualRoles.map(individualRole => 
                      getPlayersByFormationRoles.playersByRole && getPlayersByFormationRoles.playersByRole[individualRole] && 
                      getPlayersByFormationRoles.playersByRole[individualRole].map((player, playerIndex) => (
                        <div 
                          key={`${individualRole}-${playerIndex}`} 
                          style={playerUnderRoleStyle}
                        >
                          {player.Nome}
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </div>

            {/* Attack Line */}
            <div style={formationLineStyle}>
              <span style={formationLineLabelStyle}>Attacco:</span>
              {getFormationLines.attack.map((role, index) => {
                // Get all individual roles from the position (e.g., "A/PC" -> ["A", "PC"])
                const individualRoles = role.includes('/') ? role.split('/') : [role];
                return (
                  <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={formationPositionStyle}>
                      {role}
                    </div>
                    {individualRoles.map(individualRole => 
                      getPlayersByFormationRoles.playersByRole && getPlayersByFormationRoles.playersByRole[individualRole] && 
                      getPlayersByFormationRoles.playersByRole[individualRole].map((player, playerIndex) => (
                        <div 
                          key={`${individualRole}-${playerIndex}`} 
                          style={playerUnderRoleStyle}
                        >
                          {player.Nome}
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
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
      {isMantraMode && Object.keys(formations).length > 0 && (
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
      {isMantraMode && formations[selectedFormation] && (
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
            {getFormationLines.p.map((role, index) => (
              <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={formationPositionStyle}>
                  {role}
                </div>
                {getPlayersByFormationRoles.playersByRole && getPlayersByFormationRoles.playersByRole['P'] && 
                  getPlayersByFormationRoles.playersByRole['P'].map((player, playerIndex) => (
                    <div 
                      key={playerIndex} 
                      style={player.hasMultipleRoles ? playerUnderRoleMultipleStyle : playerUnderRoleStyle}
                    >
                      {player.Nome} ({player.price} FM)
                    </div>
                  ))
                }
              </div>
            ))}
          </div>

          {/* Defense Line */}
          <div style={formationLineStyle}>
            <span style={formationLineLabelStyle}>Difesa:</span>
            {getFormationLines.defense.map((role, index) => {
              // Get all individual roles from the position (e.g., "A/PC" -> ["A", "PC"])
              const individualRoles = role.includes('/') ? role.split('/') : [role];
              return (
                <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={formationPositionStyle}>
                    {role}
                  </div>
                  {individualRoles.map(individualRole => {
                    // Debug logging for display
                    if (individualRole === 'DC' || individualRole === 'PC') {
                      console.log('Display debug:', {
                        individualRole: individualRole,
                        playersByRole: getPlayersByFormationRoles.playersByRole,
                        playersForRole: getPlayersByFormationRoles.playersByRole ? getPlayersByFormationRoles.playersByRole[individualRole] : 'undefined',
                        allRoleKeys: getPlayersByFormationRoles.playersByRole ? Object.keys(getPlayersByFormationRoles.playersByRole) : 'undefined'
                      });
                    }
                    
                    return getPlayersByFormationRoles.playersByRole && getPlayersByFormationRoles.playersByRole[individualRole] && 
                      getPlayersByFormationRoles.playersByRole[individualRole].map((player, playerIndex) => (
                        <div 
                          key={`${individualRole}-${playerIndex}`} 
                          style={playerUnderRoleStyle}
                        >
                          {player.Nome}
                        </div>
                      ));
                  })}
                </div>
              );
            })}
          </div>

          {/* Midfield Line */}
          <div style={formationLineStyle}>
            <span style={formationLineLabelStyle}>Centrocampo:</span>
            {getFormationLines.midfield.map((role, index) => {
              // Get all individual roles from the position (e.g., "A/PC" -> ["A", "PC"])
              const individualRoles = role.includes('/') ? role.split('/') : [role];
              return (
                <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={formationPositionStyle}>
                    {role}
                  </div>
                  {individualRoles.map(individualRole => 
                    getPlayersByFormationRoles.playersByRole && getPlayersByFormationRoles.playersByRole[individualRole] && 
                    getPlayersByFormationRoles.playersByRole[individualRole].map((player, playerIndex) => (
                      <div 
                        key={`${individualRole}-${playerIndex}`} 
                        style={playerUnderRoleStyle}
                      >
                        {player.Nome}
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>

          {/* Attack Line */}
          <div style={formationLineStyle}>
            <span style={formationLineLabelStyle}>Attacco:</span>
            {getFormationLines.attack.map((role, index) => {
              // Get all individual roles from the position (e.g., "A/PC" -> ["A", "PC"])
              const individualRoles = role.includes('/') ? role.split('/') : [role];
              return (
                <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={formationPositionStyle}>
                    {role}
                  </div>
                  {individualRoles.map(individualRole => 
                    getPlayersByFormationRoles.playersByRole && getPlayersByFormationRoles.playersByRole[individualRole] && 
                    getPlayersByFormationRoles.playersByRole[individualRole].map((player, playerIndex) => (
                      <div 
                        key={`${individualRole}-${playerIndex}`} 
                        style={playerUnderRoleStyle}
                      >
                        {player.Nome}
                      </div>
                    ))
                  )}
                </div>
              );
            })}
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
