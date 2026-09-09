import React, { useState, useEffect, useCallback } from 'react';
import { getTeamColorCoding } from '../utils/dataUtils';
import { calculateBudgetStats, getRoleCategoryColor, getRoleCategoryName } from '../utils/budgetStats';

const SquadreTab = ({ budget = 500, teams = [], onTeamsChange, maxPlayers = 30, players = [] }) => {
  // Window width state for responsive design
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Use teams from props instead of localStorage
  const [localTeams, setLocalTeams] = useState(() => {
    // If teams prop is provided, use it
    if (teams && teams.length > 0) {
      return teams;
    }
    
    try {
      const savedTeams = localStorage.getItem('fantacalcio_teams');
      if (savedTeams) {
        const parsedTeams = JSON.parse(savedTeams);
        
        // Validate the data - if it's not an array or has too many teams, use default
        if (Array.isArray(parsedTeams) && parsedTeams.length <= 20 && parsedTeams.length >= 1) {
          // Ensure each team has a players array
          return parsedTeams.map(team => ({
            ...team,
            players: team.players || []
          }));
        } else {
          console.log('Invalid teams data in localStorage, using default 8 teams');
        }
      }
    } catch (error) {
      console.error('Error loading teams from localStorage:', error);
    }
    
    // Default team names - always 8 teams
    return Array.from({ length: 8 }, (_, index) => ({
      id: index + 1,
      name: `Squadra ${index + 1}`,
      budget: 500, // Each team gets its own 500 FM budget
      players: []
    }));
  });

  const [, setNumberOfTeams] = useState(8);
  const [draggedPlayer, setDraggedPlayer] = useState(null);
  const [draggedOverPlayer, setDraggedOverPlayer] = useState(null);
  const [draggedOverTeam, setDraggedOverTeam] = useState(null);

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

  // Clear corrupted localStorage data on mount if needed
  useEffect(() => {
    try {
      const savedTeams = localStorage.getItem('fantacalcio_teams');
      if (savedTeams) {
        const parsedTeams = JSON.parse(savedTeams);
        if (!Array.isArray(parsedTeams) || parsedTeams.length > 20 || parsedTeams.length < 1) {
          console.log('Clearing corrupted teams data from localStorage');
          localStorage.removeItem('fantacalcio_teams');
        }
      }
    } catch (error) {
      console.error('Error checking localStorage data:', error);
      localStorage.removeItem('fantacalcio_teams');
    }
  }, []);

  // Update localTeams when teams prop changes
  useEffect(() => {
    if (teams && teams.length > 0) {
      console.log('🔍 DEBUG: SquadreTab received teams update:', teams);
      setLocalTeams(teams);
    }
  }, [teams]);

  // Update team budgets when the main budget changes
  useEffect(() => {
    setLocalTeams(prevTeams => 
      prevTeams.map(team => ({
        ...team,
        budget: budget
      }))
    );
  }, [budget]);

  // Save teams to localStorage whenever localTeams change
  useEffect(() => {
    localStorage.setItem('fantacalcio_teams', JSON.stringify(localTeams));
  }, [localTeams]);

  // Notify parent of teams changes (only when localTeams actually change, not on mount)
  useEffect(() => {
    if (onTeamsChange && localTeams.length > 0) {
      onTeamsChange(localTeams);
    }
  }, [localTeams, onTeamsChange]); // Added onTeamsChange back to dependencies

  const handleTeamNameChange = (teamId, newName) => {
    setLocalTeams(prevTeams =>
      prevTeams.map(team =>
        team.id === teamId ? { ...team, name: newName } : team
      )
    );
  };

  const handleAddTeam = () => {
    setLocalTeams(prevTeams => {
      const newId = Math.max(...prevTeams.map(team => team.id), 0) + 1;
      const newTeam = {
        id: newId,
        name: `Squadra ${newId}`,
        budget: budget,
        players: []
      };
      return [...prevTeams, newTeam];
    });
    setNumberOfTeams(prev => prev + 1);
  };

  const handleRemoveTeam = (teamId) => {
    if (localTeams.length <= 1) return; // Keep at least 1 team
    
    setLocalTeams(prevTeams => {
      return prevTeams.filter(team => team.id !== teamId);
    });
    setNumberOfTeams(prev => Math.max(1, prev - 1));
  };

  const handleRemovePlayerFromTeam = (teamId, playerIndex) => {
    setLocalTeams(prevTeams => {
      return prevTeams.map(team => {
        if (team.id === teamId) {
          const updatedPlayers = [...team.players];
          updatedPlayers.splice(playerIndex, 1);
          return { ...team, players: updatedPlayers };
        }
        return team;
      });
    });
  };

  // Function to sort players by price (highest to lowest)
  const sortPlayersByPrice = useCallback((players) => {
    return [...players].sort((a, b) => {
      const priceA = parseFloat(a.price) || 0;
      const priceB = parseFloat(b.price) || 0;
      return priceB - priceA; // Descending order (highest first)
    });
  }, []);

  const handleDragStart = (e, teamId, playerIndex) => {
    setDraggedPlayer({ teamId, playerIndex });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
  };

  const handleDragOver = (e, teamId, playerIndex) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDraggedOverPlayer({ teamId, playerIndex });
  };

  const handleDragLeave = () => {
    setDraggedOverPlayer(null);
  };

  const handleDrop = (e, targetTeamId, targetPlayerIndex) => {
    e.preventDefault();
    
    if (!draggedPlayer) return;
    
    const { teamId: sourceTeamId, playerIndex: sourcePlayerIndex } = draggedPlayer;
    
    setLocalTeams(prevTeams => {
      const sourceTeam = prevTeams.find(team => team.id === sourceTeamId);
      const targetTeam = prevTeams.find(team => team.id === targetTeamId);
      
      if (!sourceTeam || !targetTeam) return prevTeams;
      
      // Check if target team has space (respect maxPlayers limit)
      if (sourceTeamId !== targetTeamId && targetTeam.players.length >= maxPlayers) {
        console.log('Target team is at maximum capacity');
        return prevTeams;
      }
      
      // Get the dragged player data
      const draggedPlayerData = sourceTeam.players[sourcePlayerIndex];
      if (!draggedPlayerData) return prevTeams;
      
      // Handle same-team reordering differently
      if (sourceTeamId === targetTeamId) {
        return prevTeams.map(team => {
          if (team.id === sourceTeamId) {
            const updatedPlayers = [...team.players];
            // Remove the player from source position
            updatedPlayers.splice(sourcePlayerIndex, 1);
            // Adjust target index if needed (since we removed an element)
            const adjustedTargetIndex = sourcePlayerIndex < targetPlayerIndex 
              ? targetPlayerIndex - 1 
              : targetPlayerIndex;
            // Insert at target position
            updatedPlayers.splice(adjustedTargetIndex, 0, draggedPlayerData);
            return { ...team, players: updatedPlayers };
          }
          return team;
        });
      } else {
        // Handle cross-team movement
        return prevTeams.map(team => {
          if (team.id === sourceTeamId) {
            // Remove player from source team
            const updatedPlayers = [...team.players];
            updatedPlayers.splice(sourcePlayerIndex, 1);
            return { ...team, players: updatedPlayers };
          } else if (team.id === targetTeamId) {
            // Add player to target team
            const updatedPlayers = [...team.players];
            updatedPlayers.splice(targetPlayerIndex, 0, draggedPlayerData);
            return { ...team, players: updatedPlayers };
          }
          return team;
        });
      }
    });
    
    setDraggedPlayer(null);
    setDraggedOverPlayer(null);
  };

  const handleDragEnd = () => {
    setDraggedPlayer(null);
    setDraggedOverPlayer(null);
    setDraggedOverTeam(null);
  };

  const handleTeamDragOver = (e, teamId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDraggedOverTeam(teamId);
  };

  const handleTeamDrop = (e, targetTeamId) => {
    e.preventDefault();
    
    if (!draggedPlayer) return;
    
    const { teamId: sourceTeamId, playerIndex: sourcePlayerIndex } = draggedPlayer;
    
    // If dropping on the same team, do nothing
    if (sourceTeamId === targetTeamId) return;
    
    setLocalTeams(prevTeams => {
      const sourceTeam = prevTeams.find(team => team.id === sourceTeamId);
      const targetTeam = prevTeams.find(team => team.id === targetTeamId);
      
      if (!sourceTeam || !targetTeam) return prevTeams;
      
      // Check if target team has space (respect maxPlayers limit)
      if (targetTeam.players.length >= maxPlayers) {
        console.log('Target team is at maximum capacity');
        return prevTeams;
      }
      
      // Get the dragged player data
      const draggedPlayerData = sourceTeam.players[sourcePlayerIndex];
      if (!draggedPlayerData) return prevTeams;
      
      return prevTeams.map(team => {
        if (team.id === sourceTeamId) {
          // Remove player from source team
          const updatedPlayers = [...team.players];
          updatedPlayers.splice(sourcePlayerIndex, 1);
          return { ...team, players: updatedPlayers };
        } else if (team.id === targetTeamId) {
          // Add player to end of target team
          const updatedPlayers = [...team.players, draggedPlayerData];
          return { ...team, players: updatedPlayers };
        }
        return team;
      });
    });
    
    setDraggedPlayer(null);
    setDraggedOverPlayer(null);
    setDraggedOverTeam(null);
  };

  const handleResetTeams = () => {
    const defaultTeams = Array.from({ length: 8 }, (_, index) => ({
      id: index + 1,
      name: `Squadra ${index + 1}`,
      budget: budget,
      players: []
    }));
    setLocalTeams(defaultTeams);
    setNumberOfTeams(8);
    localStorage.setItem('fantacalcio_teams', JSON.stringify(defaultTeams));
  };


  // Function to add a player to a team (called from App.js)
  const addPlayerToTeam = useCallback((teamId, player, price) => {
    setLocalTeams(prevTeams =>
      prevTeams.map(team =>
        team.id === teamId
          ? {
              ...team,
              players: (team.players || []).length >= maxPlayers 
                ? team.players // Don't add if at max capacity
                : sortPlayersByPrice([...(team.players || []), { ...player, price }])
            }
          : team
      )
    );
  }, [maxPlayers, sortPlayersByPrice]);

  // Expose the addPlayerToTeam function to parent component
  useEffect(() => {
    window.addPlayerToTeam = addPlayerToTeam;
    return () => {
      delete window.addPlayerToTeam;
    };
  }, [addPlayerToTeam]);

  // Also expose via ref for more reliable access
  useEffect(() => {
    if (window.squadreTabRef) {
      window.squadreTabRef.addPlayerToTeam = addPlayerToTeam;
    }
  }, [addPlayerToTeam]);

  const containerStyle = {
    padding: '1rem',
    maxWidth: '100%',
    margin: '0 auto',
    overflowX: 'auto'
  };


  // Horizontal flex layout for all teams
  const getTeamsGridStyle = () => {
    return {
      display: 'flex',
      gap: windowWidth <= 768 ? '0.5rem' : '0.5rem',
      marginBottom: '2rem',
      alignItems: 'flex-start',
      minWidth: 'fit-content',
      flexWrap: windowWidth <= 768 ? 'wrap' : 'nowrap',
      justifyContent: windowWidth <= 768 ? 'center' : 'space-evenly'
    };
  };

  const teamCountSelectorStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: windowWidth <= 768 ? '0.5rem' : '1rem',
    marginBottom: '2rem',
    justifyContent: 'center',
    flexWrap: windowWidth <= 768 ? 'wrap' : 'nowrap'
  };

  const teamCountLabelStyle = {
    fontSize: '1rem',
    fontWeight: '500',
    color: '#374151'
  };

  const buttonStyle = {
    padding: '0.5rem 1rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backgroundColor: 'white',
    color: '#374151'
  };

  const addButtonStyle = {
    ...buttonStyle,
    borderColor: '#10b981',
    color: '#10b981'
  };

  const removeButtonStyle = {
    ...buttonStyle,
    borderColor: '#ef4444',
    color: '#ef4444'
  };

  const resetButtonStyle = {
    ...buttonStyle,
    borderColor: '#6b7280',
    color: '#6b7280',
    fontSize: '0.75rem',
    padding: '0.375rem 0.75rem'
  };

  const buttonHoverStyle = {
    transform: 'translateY(-1px)',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
  };

  const teamBoxStyle = {
    backgroundColor: 'white',
    border: '2px solid #e5e7eb',
    borderRadius: '0.5rem',
    padding: windowWidth <= 768 ? '0.375rem' : '0.25rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s',
    cursor: 'pointer',
    minWidth: windowWidth <= 768 ? '120px' : '130px',
    maxWidth: windowWidth <= 768 ? '160px' : '140px',
    flex: '0 0 auto',
    height: 'fit-content'
  };

  const teamBoxHoverStyle = {
    ...teamBoxStyle,
    borderColor: '#3b82f6',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)'
  };

  const teamNameInputStyle = {
    width: '100%',
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: windowWidth <= 768 ? '0.875rem' : '1rem', // Increased by 4 points (0.25rem)
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: '0.25rem',
    padding: windowWidth <= 768 ? '0.1rem' : '0.125rem',
    borderRadius: '0.25rem',
    outline: 'none',
    transition: 'background-color 0.2s'
  };

  const teamNameInputFocusStyle = {
    ...teamNameInputStyle,
    backgroundColor: '#f3f4f6'
  };

  const budgetLabelStyle = {
    fontSize: '0.7rem',
    color: '#6b7280',
    marginBottom: '0.25rem',
    textAlign: 'center'
  };


  // Calculate height based on max players (each player item is ~60px with margins for 4 lines)
  const getPlayersListStyle = () => ({
    marginTop: '0.25rem',
    height: `${maxPlayers * 60}px`, // Always fit exactly maxPlayers * 60px
    overflowY: 'auto'
  });

  const playerItemStyle = {
    display: 'flex',
    flexDirection: 'row',
    padding: '0.125rem 0.375rem',
    marginBottom: '0.125rem',
    backgroundColor: '#f9fafb',
    borderRadius: '0.25rem',
    fontSize: '0.7rem',
    cursor: 'grab',
    transition: 'all 0.2s',
    alignItems: 'flex-start',
    gap: '0.5rem'
  };

  const playerNameStyle = {
    fontWeight: '500',
    color: '#1f2937',
    fontSize: '0.7rem',
    marginBottom: '0.05rem'
  };

  const playerSurnameStyle = {
    fontWeight: '600',
    color: '#1f2937',
    fontSize: '0.7rem',
    marginBottom: '0.125rem'
  };


  const roleBadgeStyle = {
    fontSize: '0.6rem',
    padding: '0.15rem 0.3rem',
    borderRadius: '0.25rem',
    color: 'white',
    fontWeight: '600',
    minWidth: '20px',
    textAlign: 'center',
    lineHeight: '1'
  };

  const playerDetailsStyle = {
    fontSize: '0.65rem',
    color: '#6b7280',
    textAlign: 'left'
  };

  const playerLeftContentStyle = {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minWidth: 0
  };

  const playerRightRolesStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.125rem',
    flexShrink: 0
  };

  const playerSecondLineStyle = {
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: '0.5rem'
  };

  const playerCountStyle = {
    fontSize: '0.65rem',
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: '0.125rem',
    fontWeight: '500'
  };

  const teamBoxHeaderStyle = {
    userSelect: 'none'
  };

  // Function to calculate remaining budget for a team
  const calculateRemainingBudget = (team) => {
    const totalSpent = (team.players || []).reduce((sum, player) => sum + (player.price || 0), 0);
    return team.budget - totalSpent;
  };

  // Function to get role color. `role` is already a Mantra code (P, Dc, Dd, Ds, B, E, M, C,
  // W, T, A, Pc), as found directly in player['Ruolo Mantra'] - no translation needed.
  const getRoleInfo = (role) => {
    const roleColorMap = {
      'P': '#f97316',    // Orange
      'Dc': '#22c55e',   // Green
      'B': '#22c55e',    // Green
      'Dd': '#22c55e',   // Green
      'Ds': '#22c55e',   // Green
      'E': '#3b82f6',    // Blue
      'M': '#3b82f6',    // Blue
      'C': '#3b82f6',    // Blue
      'W': '#a855f7',    // Purple
      'T': '#a855f7',    // Purple
      'A': '#ef4444',    // Red
      'Pc': '#ef4444'    // Red
    };
    return { italian: role, color: roleColorMap[role] || '#6b7280' };
  };

  // Function to parse mantra roles (copied from RosaAcquistata and MantraGiocatoriTab)
  const parseMantraRoles = (mantraRoles) => {
    if (!mantraRoles) return [];
    
    if (Array.isArray(mantraRoles)) {
      // It's already an array
      return mantraRoles;
    } else if (typeof mantraRoles === 'string') {
      // It's a string that needs to be parsed
      try {
        // Replace single quotes with double quotes and parse as JSON
        const jsonString = mantraRoles.replace(/'/g, '"');
        return JSON.parse(jsonString);
      } catch (e) {
        // If parsing fails, treat as single role
        return [mantraRoles];
      }
    } else {
      // Fallback for other types
      return [mantraRoles];
    }
  };

  // Function to extract name and surname
  const getNameParts = (fullName) => {
    if (!fullName) return { name: '', surname: '' };
    const nameParts = fullName.trim().split(' ');
    if (nameParts.length === 1) return { name: nameParts[0], surname: '' };
    const surname = nameParts[nameParts.length - 1];
    const name = nameParts.slice(0, -1).join(' ');
    return { name, surname };
  };

  const remainingBudgetStyle = {
    fontSize: '1rem',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: '0.5rem'
  };

  const remainingBudgetPositiveStyle = {
    ...remainingBudgetStyle,
    color: '#059669'
  };

  const remainingBudgetNegativeStyle = {
    ...remainingBudgetStyle,
    color: '#dc2626'
  };


  return (
    <div style={containerStyle}>
      
      {/* Team Management */}
      <div style={teamCountSelectorStyle}>
        <span style={teamCountLabelStyle}>Squadre: {localTeams.length}</span>
        <button
          onClick={handleAddTeam}
          style={addButtonStyle}
          onMouseEnter={(e) => {
            Object.assign(e.target.style, { ...addButtonStyle, ...buttonHoverStyle });
          }}
          onMouseLeave={(e) => {
            Object.assign(e.target.style, addButtonStyle);
          }}
        >
          + Aggiungi Squadra
        </button>
        <button
          onClick={() => {
            if (localTeams.length > 1) {
              const lastTeam = localTeams.reduce((max, team) => team.id > max.id ? team : max);
              handleRemoveTeam(lastTeam.id);
            }
          }}
          disabled={localTeams.length <= 1}
          style={{
            ...removeButtonStyle,
            opacity: localTeams.length <= 1 ? 0.5 : 1,
            cursor: localTeams.length <= 1 ? 'not-allowed' : 'pointer'
          }}
          onMouseEnter={(e) => {
            if (localTeams.length > 1) {
              Object.assign(e.target.style, { ...removeButtonStyle, ...buttonHoverStyle });
            }
          }}
          onMouseLeave={(e) => {
            Object.assign(e.target.style, {
              ...removeButtonStyle,
              opacity: localTeams.length <= 1 ? 0.5 : 1,
              cursor: localTeams.length <= 1 ? 'not-allowed' : 'pointer'
            });
          }}
        >
          - Rimuovi Squadra
        </button>
        <button
          onClick={handleResetTeams}
          style={resetButtonStyle}
          onMouseEnter={(e) => {
            Object.assign(e.target.style, { ...resetButtonStyle, ...buttonHoverStyle });
          }}
          onMouseLeave={(e) => {
            Object.assign(e.target.style, resetButtonStyle);
          }}
        >
          Reset a 8
        </button>
      </div>
      
      <div style={getTeamsGridStyle()}>
        {localTeams && localTeams.length > 0 ? localTeams.map((team, index) => {
          // Special styling for the first team (index 0)
          const isFirstTeam = index === 0;
          const isDraggedOver = draggedOverTeam === team.id;
          const isDraggingFromDifferentTeam = draggedPlayer && draggedPlayer.teamId !== team.id;
          const canAcceptDrop = isDraggingFromDifferentTeam && team.players.length < maxPlayers;
          
          // Get centralized color coding
          const colorCoding = getTeamColorCoding(team, localTeams, 21, maxPlayers);
          
          const firstTeamStyle = isFirstTeam ? {
            ...teamBoxStyle,
            backgroundColor: colorCoding.colors.background,
            border: `3px solid ${colorCoding.colors.border}`,
            boxShadow: `0 0 20px ${colorCoding.colors.border}40, 0 4px 12px rgba(0, 0, 0, 0.1)`,
            position: 'relative'
          } : {
            ...teamBoxStyle,
            backgroundColor: colorCoding.colors.background,
            border: `2px solid ${colorCoding.colors.border}`
          };
          
          // Add drag over styling
          const dragOverStyle = isDraggedOver && canAcceptDrop ? {
            ...firstTeamStyle,
            border: isFirstTeam ? '3px solid #3b82f6' : '2px solid #3b82f6',
            backgroundColor: '#f0f9ff',
            boxShadow: isFirstTeam ? '0 0 25px rgba(59, 130, 246, 0.4), 0 4px 12px rgba(0, 0, 0, 0.15)' : '0 4px 12px rgba(59, 130, 246, 0.15)'
          } : firstTeamStyle;
          
          const firstTeamHoverStyle = isFirstTeam ? {
            ...firstTeamStyle,
            borderColor: '#16a34a',
            boxShadow: '0 0 25px rgba(34, 197, 94, 0.4), 0 4px 12px rgba(0, 0, 0, 0.15)'
          } : teamBoxHoverStyle;
          
          return (
            <div
              key={team.id}
              style={dragOverStyle}
              onMouseEnter={(e) => {
                if (!isDraggedOver) {
                  Object.assign(e.currentTarget.style, firstTeamHoverStyle);
                }
              }}
              onMouseLeave={(e) => {
                if (!isDraggedOver) {
                  Object.assign(e.currentTarget.style, firstTeamStyle);
                }
              }}
              onDragOver={(e) => handleTeamDragOver(e, team.id)}
              onDragLeave={() => setDraggedOverTeam(null)}
              onDrop={(e) => handleTeamDrop(e, team.id)}
            >
              {/* "La tua squadra" label for first team */}
              {isFirstTeam && (
                <div style={{
                  position: 'absolute',
                  top: '-30px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#22c55e',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  zIndex: 10
                }}>
                  La tua squadra
                </div>
              )}
              
            {/* Team Header */}
            <div style={teamBoxHeaderStyle}>
              <input
                type="text"
                value={team.name}
                onChange={(e) => handleTeamNameChange(team.id, e.target.value)}
                style={teamNameInputStyle}
                onFocus={(e) => {
                  Object.assign(e.target.style, teamNameInputFocusStyle);
                }}
                onBlur={(e) => {
                  Object.assign(e.target.style, teamNameInputStyle);
                }}
                placeholder={`Squadra ${team.id}`}
                onClick={(e) => e.stopPropagation()}
              />
              
              {/* Player Count */}
              <div style={playerCountStyle}>
                {team.players ? team.players.length : 0} / {maxPlayers} giocatori
              </div>
              
              <div style={budgetLabelStyle}>Budget</div>
              {(() => {
                const remaining = calculateRemainingBudget(team);
                return (
                  <div style={{
                    ...(remaining >= 0 ? remainingBudgetPositiveStyle : remainingBudgetNegativeStyle),
                    color: colorCoding.colors.budget,
                    ...colorCoding.budgetHighlight
                  }}>
                    {remaining.toLocaleString()}/{team.budget.toLocaleString()} FM
                  </div>
                );
              })()}
              
              {/* Role spending percentages for this team */}
              {(() => {
                const teamBudgetStats = calculateBudgetStats([team], players);
                const roleCategories = ['defenders', 'midfielders', 'wingers', 'attackers'];
                
                return (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.125rem',
                    marginTop: '0.25rem',
                    fontSize: '0.6rem'
                  }}>
                    {roleCategories.map(category => {
                      // % of the team's total budget spent on this sector (not % of spend so far)
                      const percentage = teamBudgetStats.totalBudgetInitial > 0
                        ? (teamBudgetStats.roleSpending[category] / teamBudgetStats.totalBudgetInitial) * 100
                        : 0;
                      const color = getRoleCategoryColor(category);
                      const roleName = getRoleCategoryName(category);
                      
                      return (
                        <div key={category} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.125rem 0.25rem',
                          backgroundColor: color + '15',
                          borderRadius: '0.25rem',
                          border: `1px solid ${color}30`
                        }}>
                          <span style={{ color: color, fontWeight: '500' }}>
                            {roleName}
                          </span>
                          <span style={{ color: color, fontWeight: '600' }}>
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Players List - Always Visible */}
            {team.players && team.players.length > 0 && (
              <div>
                <div style={getPlayersListStyle()}>
                {team.players.map((player, index) => {
                  const isDragged = draggedPlayer?.teamId === team.id && draggedPlayer?.playerIndex === index;
                  const isDraggedOver = draggedOverPlayer?.teamId === team.id && draggedOverPlayer?.playerIndex === index;
                  
                  return (
                    <div 
                      key={index} 
                      draggable
                      onDragStart={(e) => handleDragStart(e, team.id, index)}
                      onDragOver={(e) => handleDragOver(e, team.id, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, team.id, index)}
                      onDragEnd={handleDragEnd}
                      style={{
                        ...playerItemStyle,
                        opacity: isDragged ? 0.5 : 1,
                        backgroundColor: isDraggedOver ? '#e5e7eb' : '#f9fafb',
                        border: isDraggedOver ? '2px dashed #3b82f6' : 'none',
                        cursor: isDragged ? 'grabbing' : 'grab'
                      }}
                    >
                      {(() => {
                        const { name, surname } = getNameParts(player.Nome);
                        const mantraRoles = parseMantraRoles(player['Ruolo Mantra']);
                        return (
                          <>
                            <div style={playerLeftContentStyle}>
                              <div style={playerNameStyle}>{name}</div>
                              <div style={playerSurnameStyle}>{surname}</div>
                              <div style={playerSecondLineStyle}>
                                <div style={playerDetailsStyle}>{player.price} FM</div>
                                <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemovePlayerFromTeam(team.id, index);
                          }}
                          style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                          border: 'none',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                          transition: 'all 0.2s',
                          flexShrink: 0
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#dc2626';
                          e.target.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = '#ef4444';
                          e.target.style.transform = 'scale(1)';
                        }}
                        title="Rimuovi giocatore"
                      >
                        ×
                      </button>
                              </div>
                            </div>
                            <div style={playerRightRolesStyle}>
                              {mantraRoles.map((role, roleIndex) => {
                                const roleInfo = getRoleInfo(role);
                                return (
                                  <span
                                    key={roleIndex}
                                    style={{
                                      ...roleBadgeStyle,
                                      backgroundColor: roleInfo.color
                                    }}
                                  >
                                    {roleInfo.italian}
                                  </span>
                                );
                              })}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  );
                })}
                </div>
              </div>
            )}
          </div>
          );
        }) : (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            Nessuna squadra disponibile
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(SquadreTab);
