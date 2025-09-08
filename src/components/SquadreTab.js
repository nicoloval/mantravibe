import React, { useState, useEffect } from 'react';

const SquadreTab = ({ budget = 500, onTeamsChange }) => {
  // Initialize teams with default names
  const [teams, setTeams] = useState(() => {
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
      budget: budget,
      players: []
    }));
  });

  const [numberOfTeams, setNumberOfTeams] = useState(8);
  const [collapsedTeams, setCollapsedTeams] = useState(new Set());

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

  // Update team budgets when the main budget changes
  useEffect(() => {
    setTeams(prevTeams => 
      prevTeams.map(team => ({
        ...team,
        budget: budget
      }))
    );
  }, [budget]);

  // Save teams to localStorage whenever teams change
  useEffect(() => {
    localStorage.setItem('fantacalcio_teams', JSON.stringify(teams));
  }, [teams]);

  // Notify parent of teams changes (only when teams actually change, not on mount)
  useEffect(() => {
    if (onTeamsChange && teams.length > 0) {
      onTeamsChange(teams);
    }
  }, [teams]); // Removed onTeamsChange from dependencies to avoid infinite loop

  const handleTeamNameChange = (teamId, newName) => {
    setTeams(prevTeams =>
      prevTeams.map(team =>
        team.id === teamId ? { ...team, name: newName } : team
      )
    );
  };

  const handleAddTeam = () => {
    setTeams(prevTeams => {
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

  const handleRemoveTeam = () => {
    if (teams.length <= 1) return; // Keep at least 1 team
    
    setTeams(prevTeams => {
      const sortedTeams = [...prevTeams].sort((a, b) => b.id - a.id);
      const teamToRemove = sortedTeams[0];
      return prevTeams.filter(team => team.id !== teamToRemove.id);
    });
    setNumberOfTeams(prev => Math.max(1, prev - 1));
  };

  const handleResetTeams = () => {
    const defaultTeams = Array.from({ length: 8 }, (_, index) => ({
      id: index + 1,
      name: `Squadra ${index + 1}`,
      budget: budget,
      players: []
    }));
    setTeams(defaultTeams);
    setNumberOfTeams(8);
    localStorage.setItem('fantacalcio_teams', JSON.stringify(defaultTeams));
  };

  const toggleTeamCollapse = (teamId) => {
    setCollapsedTeams(prev => {
      const newSet = new Set(prev);
      if (newSet.has(teamId)) {
        newSet.delete(teamId);
      } else {
        newSet.add(teamId);
      }
      return newSet;
    });
  };

  // Function to add a player to a team (called from App.js)
  const addPlayerToTeam = (teamId, player, price) => {
    setTeams(prevTeams =>
      prevTeams.map(team =>
        team.id === teamId
          ? {
              ...team,
              players: [...(team.players || []), { ...player, price }]
            }
          : team
      )
    );
  };

  // Expose the addPlayerToTeam function to parent component
  useEffect(() => {
    window.addPlayerToTeam = addPlayerToTeam;
    return () => {
      delete window.addPlayerToTeam;
    };
  }, []);

  // Also expose via ref for more reliable access
  useEffect(() => {
    if (window.squadreTabRef) {
      window.squadreTabRef.addPlayerToTeam = addPlayerToTeam;
    }
  }, []);

  const containerStyle = {
    padding: '2rem',
    maxWidth: '1200px',
    margin: '0 auto'
  };

  const titleStyle = {
    fontSize: '1.5rem',
    fontWeight: '600',
    marginBottom: '2rem',
    color: '#374151',
    textAlign: 'center'
  };

  // Dynamic grid style based on number of teams
  const getTeamsGridStyle = () => {
    const maxTeamsPerRow = 4;
    const actualColumns = Math.min(teams.length, maxTeamsPerRow);
    return {
      display: 'grid',
      gridTemplateColumns: `repeat(${actualColumns}, 1fr)`,
      gap: '1.5rem',
      marginBottom: '2rem',
      justifyItems: 'center'
    };
  };

  const teamCountSelectorStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '2rem',
    justifyContent: 'center'
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
    borderRadius: '0.75rem',
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s',
    cursor: 'pointer'
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
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: '1rem',
    padding: '0.5rem',
    borderRadius: '0.375rem',
    outline: 'none',
    transition: 'background-color 0.2s'
  };

  const teamNameInputFocusStyle = {
    ...teamNameInputStyle,
    backgroundColor: '#f3f4f6'
  };

  const budgetLabelStyle = {
    fontSize: '0.875rem',
    color: '#6b7280',
    marginBottom: '0.5rem',
    textAlign: 'center'
  };

  const budgetValueStyle = {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#059669',
    textAlign: 'center'
  };

  const playersListStyle = {
    marginTop: '1rem',
    maxHeight: '200px',
    overflowY: 'auto'
  };

  const playerItemStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem',
    marginBottom: '0.5rem',
    backgroundColor: '#f9fafb',
    borderRadius: '0.375rem',
    fontSize: '0.875rem'
  };

  const playerNameStyle = {
    fontWeight: '500',
    color: '#1f2937'
  };

  const playerDetailsStyle = {
    fontSize: '0.75rem',
    color: '#6b7280',
    textAlign: 'right'
  };

  const playerCountStyle = {
    fontSize: '0.75rem',
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: '0.5rem',
    fontWeight: '500'
  };

  const teamBoxHeaderStyle = {
    cursor: 'pointer',
    userSelect: 'none'
  };

  // Function to calculate remaining budget for a team
  const calculateRemainingBudget = (team) => {
    const totalSpent = (team.players || []).reduce((sum, player) => sum + (player.price || 0), 0);
    return team.budget - totalSpent;
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
      <h2 style={titleStyle}>Gestione Squadre</h2>
      
      {/* Team Management */}
      <div style={teamCountSelectorStyle}>
        <span style={teamCountLabelStyle}>Squadre: {teams.length}</span>
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
          onClick={handleRemoveTeam}
          disabled={teams.length <= 1}
          style={{
            ...removeButtonStyle,
            opacity: teams.length <= 1 ? 0.5 : 1,
            cursor: teams.length <= 1 ? 'not-allowed' : 'pointer'
          }}
          onMouseEnter={(e) => {
            if (teams.length > 1) {
              Object.assign(e.target.style, { ...removeButtonStyle, ...buttonHoverStyle });
            }
          }}
          onMouseLeave={(e) => {
            Object.assign(e.target.style, {
              ...removeButtonStyle,
              opacity: teams.length <= 1 ? 0.5 : 1,
              cursor: teams.length <= 1 ? 'not-allowed' : 'pointer'
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
        {teams && teams.length > 0 ? teams.map((team) => (
          <div
            key={team.id}
            style={teamBoxStyle}
            onMouseEnter={(e) => {
              Object.assign(e.currentTarget.style, teamBoxHoverStyle);
            }}
            onMouseLeave={(e) => {
              Object.assign(e.currentTarget.style, teamBoxStyle);
            }}
          >
            {/* Team Header - Clickable */}
            <div 
              style={teamBoxHeaderStyle}
              onClick={() => toggleTeamCollapse(team.id)}
            >
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
                {team.players ? team.players.length : 0} giocatori
              </div>
              
              <div style={budgetLabelStyle}>Budget</div>
              {(() => {
                const remaining = calculateRemainingBudget(team);
                return (
                  <div style={remaining >= 0 ? remainingBudgetPositiveStyle : remainingBudgetNegativeStyle}>
                    {remaining.toLocaleString()}/{team.budget.toLocaleString()} FM
                  </div>
                );
              })()}
            </div>

            {/* Players List - Collapsible */}
            {team.players && team.players.length > 0 && !collapsedTeams.has(team.id) && (
              <div style={playersListStyle}>
                {team.players.map((player, index) => (
                  <div key={index} style={playerItemStyle}>
                    <div style={playerNameStyle}>{player.Nome}</div>
                    <div style={playerDetailsStyle}>
                      <div>{player.price} FM</div>
                      <div>{player.Ruolo || 'N/A'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )) : (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            Nessuna squadra disponibile
          </div>
        )}
      </div>
    </div>
  );
};

export default SquadreTab;
