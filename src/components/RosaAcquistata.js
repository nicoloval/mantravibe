// src/components/RosaAcquistata.js
/* eslint-disable no-unused-vars */
import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTeamColorCoding } from '../utils/dataUtils';

const RosaAcquistata = ({ 
  players = [],
  playerStatus = {},
  onPlayerStatusChange,
  roleMapping = {},
  teams = [],
  onTeamsChange,
  appetibilitaData = {},
  roles = []
}) => {
  const navigate = useNavigate();
  
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [formations, setFormations] = useState({});
  const [selectedFormation, setSelectedFormation] = useState('4-3-3');
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoles, setSelectedRoles] = useState([]);
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Window width state for responsive design
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

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

  // Create role color mapping from roles.csv - SIMPLE VERSION
  const roleColorMapping = useMemo(() => {
    const colorNameToHex = {
      'Orange': '#f97316',
      'Green': '#22c55e', 
      'Blue': '#3b82f6',
      'Purple': '#a855f7',
      'Red': '#ef4444'
    };
    
    const mapping = {};
    
    // Map roles.csv roles directly - this is the source of truth
    roles.forEach(role => {
      mapping[role.Role] = colorNameToHex[role.Color] || role.Color;
    });
    
    // Fallback color mapping for when CSV Color column is missing
    const fallbackColors = {
      'G': '#f97316',    // Orange - Goalkeeper
      'CB': '#22c55e',   // Green - Center Back
      'LA': '#22c55e',   // Green - Left Back
      'RB': '#22c55e',   // Green - Right Back
      'LB': '#22c55e',   // Green - Left Back
      'E': '#3b82f6',    // Blue - Wing
      'DM': '#3b82f6',   // Blue - Defensive Midfielder
      'M': '#3b82f6',    // Blue - Midfielder
      'W': '#a855f7',    // Purple - Winger
      'OM': '#a855f7',   // Purple - Offensive Midfielder
      'F': '#ef4444',    // Red - Forward
      'CF': '#ef4444',   // Red - Center Forward
      // Formation roles (Italian)
      'P': '#f97316',    // Orange - Portiere
      'DC': '#22c55e',   // Green - Difensore Centrale
      'DD': '#3b82f6',   // Blue - Difensore Destro
      'DS': '#3b82f6',   // Blue - Difensore Sinistro
      'B': '#22c55e',    // Green - Back
      'C': '#3b82f6',    // Blue - Centrocampista
      'T': '#a855f7',    // Purple - Trequartista
      'A': '#ef4444',    // Red - Attaccante
      'PC': '#ef4444'    // Red - Punto Centrale
    };
    
    // Apply fallback colors for any missing mappings
    Object.keys(fallbackColors).forEach(role => {
      if (!mapping[role] || mapping[role] === '') {
        mapping[role] = fallbackColors[role];
      }
    });
    
    
    return mapping;
  }, [roles]);

  // Get all available roles from roles.csv (first column) in CSV order - same as Giocatori tab
  const availableRolesForFilter = useMemo(() => {
    // Use all roles from the roles.csv file (first column) in the order they appear in CSV
    // This ensures consistent sorting with the Giocatori tab
    const csvRoles = roles.map(role => role.Role);
    
    return csvRoles;
  }, [roles]);

  // Enhanced role mapping that includes formation roles
  const enhancedRoleMapping = useMemo(() => {
    const mapping = {};
    
    // Map roles.csv roles directly - this is the source of truth
    roles.forEach(role => {
      mapping[role.Role] = role.Ruolo;
    });
    
    
    return mapping;
  }, [roles]);

  // Function to translate English role to Italian for formation matching
  const translateRoleToItalian = useCallback((englishRole) => {
    const italianRole = enhancedRoleMapping[englishRole] || englishRole;
    return italianRole;
  }, [enhancedRoleMapping]);

  // Toggle role selection
  const toggleRole = useCallback((role) => {
    setSelectedRoles(prev => {
      if (prev.includes(role)) {
        return prev.filter(r => r !== role);
      } else {
        return [...prev, role];
      }
    });
  }, []);

  // Handle sorting
  const handleSort = useCallback((key) => {
    setSortConfig(prevConfig => {
      if (prevConfig.key === key) {
        // Same column clicked, toggle direction
        return {
          key,
          direction: prevConfig.direction === 'asc' ? 'desc' : 'asc'
        };
      } else {
        // New column clicked, default to ascending
        return {
          key,
          direction: 'asc'
        };
      }
    });
  }, []);

  // Get sort icon
  const getSortIcon = useCallback((key) => {
    if (sortConfig.key !== key) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  }, [sortConfig]);

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

  // Raggruppa giocatori per ruolo - REMOVED (not used)

  // Statistiche totali
  const totalPlayers = teamPlayers.length;

  // Gestori eventi
  const handleRemovePlayer = (playerId) => {
    
    if (window.confirm('Sei sicuro di voler rimuovere questo giocatore dalla squadra?')) {
      // Remove player from team
      if (selectedTeamId && onTeamsChange) {
        // Update teams by removing the player from the selected team
        const updatedTeams = teams.map(team => {
          if (team.id === selectedTeamId) {
            const filteredPlayers = team.players.filter(player => player.id !== playerId);
            return {
              ...team,
              players: filteredPlayers
            };
          }
          return team;
        });
        
        
        // Update teams state
        onTeamsChange(updatedTeams);
        
        // Update player status to 'none' (available again)
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

  // const rolesGridStyle = { // REMOVED - not used
  //   display: 'grid',
  //   gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  //   gap: '1.5rem',
  //   marginTop: '2rem'
  // };

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
    marginBottom: '0.25rem',
    fontSize: '0.875rem'
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

  // Function to calculate remaining budget for a team
  const calculateRemainingBudget = (team) => {
    const totalSpent = (team.players || []).reduce((sum, player) => sum + (player.price || 0), 0);
    return team.budget - totalSpent;
  };

  const teamButtonStyle = {
    padding: windowWidth <= 768 ? '0.375rem 0.75rem' : '0.5rem 1rem',
    border: '2px solid #e5e7eb',
    borderRadius: '0.375rem',
    fontSize: windowWidth <= 768 ? '1rem' : '1.125rem', // Increased by 4 points (0.25rem)
    backgroundColor: 'white',
    color: '#374151',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontWeight: '500'
  };

  const teamButtonSelectedStyle = {
    ...teamButtonStyle,
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
    color: '#3b82f6'
  };

  const teamButtonOrangeStyle = {
    ...teamButtonStyle,
    borderColor: '#f97316',
    backgroundColor: '#fff7ed',
    boxShadow: '0 1px 3px rgba(249, 115, 22, 0.1)'
  };

  const teamButtonRedStyle = {
    ...teamButtonStyle,
    borderColor: '#dc2626',
    backgroundColor: '#fef2f2',
    boxShadow: '0 1px 3px rgba(220, 38, 38, 0.1)'
  };


  const teamSelectorStyle = {
    marginBottom: '2rem',
    display: 'flex',
    alignItems: 'center',
    gap: windowWidth <= 768 ? '0.5rem' : '1rem',
    justifyContent: windowWidth <= 768 ? 'flex-start' : 'center',
    flexWrap: 'wrap'
  };

  const formationSelectorStyle = {
    marginBottom: '2rem',
    display: 'flex',
    alignItems: 'center',
    gap: windowWidth <= 768 ? '0.5rem' : '1rem',
    justifyContent: windowWidth <= 768 ? 'flex-start' : 'center',
    flexWrap: 'wrap'
  };

  const groupedFormationSelectorStyle = {
    marginBottom: '2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem' // Smaller gap between the two lines
  };

  const formationLineStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: windowWidth <= 768 ? '0.75rem' : '1.5rem',
    justifyContent: 'center',
    flexWrap: 'wrap'
  };

  const formationButtonStyle = useMemo(() => ({
    padding: windowWidth <= 768 ? '0.375rem 0.75rem' : '0.5rem 1rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: windowWidth <= 768 ? '1rem' : '1.125rem', // Increased by 4 points (0.25rem)
    backgroundColor: 'white',
    color: '#374151',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontWeight: '500'
  }), [windowWidth]);

  const formationButtonActiveStyle = useMemo(() => ({
    ...formationButtonStyle,
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
    color: '#3b82f6',
    border: '2px solid #3b82f6',
    boxShadow: '0 4px 6px rgba(59, 130, 246, 0.1)'
  }), [formationButtonStyle]);

  const formationDisplayStyle = {
    padding: '1.5rem',
    backgroundColor: '#f8fafc',
    borderRadius: '0.75rem',
    border: '1px solid #e2e8f0',
    justifyContent: 'center'
  };


  const formationPositionStyle = {
    padding: '0.5rem 0.75rem',
    backgroundColor: 'white',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '0.9rem',
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
      'DS': '#22c55e',   // Green
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

  // Function to get role info (Italian name and color)
  const getRoleInfo = (role) => {
    const roleInfoMap = {
      'P': { italian: 'P', color: 'Orange' },
      'DC': { italian: 'Dc', color: 'Green' },
      'B': { italian: 'B', color: 'Green' },
      'DD': { italian: 'Dd', color: 'Green' },
      'DS': { italian: 'Ds', color: 'Green' },
      'E': { italian: 'E', color: 'Blue' },
      'M': { italian: 'M', color: 'Blue' },
      'C': { italian: 'C', color: 'Blue' },
      'W': { italian: 'W', color: 'Purple' },
      'T': { italian: 'T', color: 'Purple' },
      'A': { italian: 'A', color: 'Red' },
      'PC': { italian: 'Pc', color: 'Red' },
      'Dm': { italian: 'Dm', color: 'Blue' },
      'Cm': { italian: 'Cm', color: 'Blue' },
      'Am': { italian: 'Am', color: 'Purple' },
      'Al': { italian: 'Al', color: 'Red' },
      'Ad': { italian: 'Ad', color: 'Red' },
      'Ac': { italian: 'Ac', color: 'Red' }
    };
    return roleInfoMap[role] || { italian: role, color: 'Gray' };
  };

  // Function to convert color name to hex
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
    
    // For 3 colors, create a three-way split
    if (colors.length === 3) {
      return {
        ...formationPositionStyle,
        background: `linear-gradient(90deg, ${colors[0]} 33.33%, ${colors[1]} 33.33%, ${colors[1]} 66.66%, ${colors[2]} 66.66%)`,
        color: 'white',
        border: `1px solid ${colors[0]}`,
        position: 'relative'
      };
    }
    
    // For more than 3 colors, use the first color as fallback
    return {
      ...formationPositionStyle,
      backgroundColor: colors[0],
      color: 'white',
      border: `1px solid ${colors[0]}`
    };
  };

  const formationLineLabelStyle = {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#6b7280',
    marginRight: '1rem',
    minWidth: '80px',
    textAlign: 'right'
  };

  const playerUnderRoleStyle = {
    fontSize: '0.8rem',
    color: '#374151',
    marginTop: '0.25rem',
    padding: '0.25rem',
    backgroundColor: '#f9fafb',
    borderRadius: '0.25rem',
    border: '1px solid #e5e7eb',
    minHeight: '2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    width: '100%',
    maxWidth: '120px'
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

  // Parse formation name to get visual layout (e.g., "3-4-3" -> [3, 4, 3])
  const getFormationLayout = useMemo(() => {
    if (!selectedFormation) return [];
    
    // Extract numbers from formation name (e.g., "3-4-3" -> [3, 4, 3])
    const numbers = selectedFormation.split('-').map(num => parseInt(num)).filter(num => !isNaN(num));
    return numbers;
  }, [selectedFormation]);

  // Organize formation positions into visual lines based on formation layout
  const getFormationLines = useMemo(() => {
    if (!formations[selectedFormation]) return { p: [], lines: [] };
    
    const positions = formations[selectedFormation].positions;
    const layout = getFormationLayout;
    const lines = { p: [], lines: [] };
    
    let positionIndex = 0;
    
    // First, handle goalkeeper (P)
    if (positions[positionIndex] && positions[positionIndex].some(role => role && role.toLowerCase() === 'p')) {
      const positionGroup = positions[positionIndex];
      const positionDisplay = positionGroup.length > 1 ? positionGroup.join('/') : positionGroup[0];
      lines.p.push({
        role: positionDisplay, 
        roles: positionGroup, 
        positionIndex: positionIndex
      });
      positionIndex++;
    }
    
    // Then, create lines based on formation layout
    layout.forEach((positionsInLine, lineIndex) => {
      const line = [];
      for (let i = 0; i < positionsInLine && positionIndex < positions.length; i++) {
        const positionGroup = positions[positionIndex];
        const positionDisplay = positionGroup.length > 1 ? positionGroup.join('/') : positionGroup[0];
        line.push({
          role: positionDisplay,
          roles: positionGroup,
          positionIndex: positionIndex
        });
        positionIndex++;
      }
      lines.lines.push(line);
    });
    
    return lines;
  }, [formations, selectedFormation, getFormationLayout]);

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


  // Calculate stats for ALL formations only when team players change (not when formation selection changes)
  const allFormationStats = useMemo(() => {
    console.log('🔄 RECALCULATING allFormationStats - team players changed');
    console.log('🔄 Team players count:', teamPlayers.length);
    console.log('🔄 Selected team:', selectedTeam?.name);
    if (!selectedTeam || !selectedTeam.players || !teamPlayers.length) {
      console.log('🔄 Early return - no team or players');
      return {};
    }

    const stats = {};
    
    // Calculate stats for each formation using the EXACT same logic as getPlayersByFormationRoles
    console.log('🔄 Processing formations:', Object.keys(formations));
    Object.keys(formations).forEach(formationName => {
      console.log(`🔄 Processing formation: ${formationName}`);
      const formation = formations[formationName];
      if (!formation || !formation.positions) {
        console.log(`🔄 Skipping formation ${formationName} - no formation or positions`);
        stats[formationName] = { occupiedPositions: 0, unassignedPlayers: 0 };
        return;
      }
      
      console.log(`🔄 Starting calculation for ${formationName}...`);
      console.log(`🔄 Formation positions for ${formationName}:`, formation.positions);

      // Use the exact same logic as getPlayersByFormationRoles but for this specific formation
      // Get formation roles the same way as the main function
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
        return appetibilitaData[role] || 999; // Default high value for unknown roles
      };
      
      // Create position slots from formation
      const formationPositions = formation.positions.map((positionGroup, index) => ({
        positionIndex: index,
        roles: positionGroup, // Array of roles that can fill this position
        assignedPlayer: null,
        assignedPlayerId: null
      }));
      
      // Create a list of all positions with their appetibilita rankings
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
      
      // Sort positions by appetibilita (descending order - higher appetibilita first)
      positionAssignmentsList.sort((a, b) => {
        if (a.appetibilita !== b.appetibilita) {
          return b.appetibilita - a.appetibilita; // Descending order
        }
        return a.positionIndex - b.positionIndex;
      });
      
      // Get all team players with their possible roles (same structure as main function)
      const teamPlayersWithRoles = selectedTeam.players.map(teamPlayer => {
        if (!teamPlayer) return null;
        
        const playerDetail = players.find(p => p.id === teamPlayer.id);
        if (!playerDetail) return null;
        
        let possibleRoles = [];
        let unusedRoles = [];
        
        if (playerDetail['Ruolo Mantra']) {
          try {
            const roles = JSON.parse(playerDetail['Ruolo Mantra'].replace(/'/g, '"'));
            
            // Check each player role against each formation position
            roles.forEach(englishRole => {
              let roleMatched = false;
              
              formationPositions.forEach(position => {
                if (position.roles.includes(roleMapping[englishRole] || englishRole)) {
                  roleMatched = true;
                }
              });
              
              if (roleMatched) {
                possibleRoles.push({
                  role: roleMapping[englishRole] || englishRole,
                  originalRole: englishRole
                });
              } else {
                unusedRoles.push({
                  role: roleMapping[englishRole] || englishRole,
                  originalRole: englishRole
                });
              }
            });
          } catch (error) {
            console.warn('Error parsing Ruolo Mantra for player:', playerDetail.Nome, error);
          }
        } else if (playerDetail.Ruolo) {
          const mappedRole = roleMapping[playerDetail.Ruolo] || playerDetail.Ruolo;
          
          // Check if this role matches any formation position
          let roleMatched = false;
          formationPositions.forEach(position => {
            if (position.roles.includes(mappedRole)) {
              roleMatched = true;
            }
          });
          
          if (roleMatched) {
            possibleRoles.push({
              role: mappedRole,
              originalRole: playerDetail.Ruolo
            });
          } else {
            unusedRoles.push({
              role: mappedRole,
              originalRole: playerDetail.Ruolo
            });
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
      
      console.log(`🔄 Team players count for ${formationName}:`, teamPlayersWithRoles.length);
      
      // Assign players to positions (EXACT same logic as main function)
      const availablePlayers = [...teamPlayersWithRoles];
      const assignedPlayerIds = new Set();
      let totalAssignedPlayers = 0;
      const maxPlayers = 11;
      
      positionAssignmentsList.forEach((positionAssignment) => {
        if (positionAssignment.assigned || totalAssignedPlayers >= maxPlayers) return;
        
        const position = formationPositions[positionAssignment.positionIndex];
        if (position.assignedPlayer) return;
        
        // Filter available players
        const availableForPosition = availablePlayers.filter(playerData => 
          !assignedPlayerIds.has(playerData.playerId)
        );
        
        if (availableForPosition.length === 0) return;
        
        // Find best player for this position
        let bestPlayer = null;
        let bestScore = -1;
        let assignedRoleOption = null;
        
        availableForPosition.forEach(playerData => {
          playerData.possibleRoles.forEach(roleOption => {
            if (positionAssignment.roles.includes(roleOption.role)) {
              const score = playerData.player['Punteggio FPEDIA'] || 0;
              if (score > bestScore) {
                bestScore = score;
                bestPlayer = playerData;
                assignedRoleOption = roleOption;
              }
            }
          });
        });
        
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
      
      // Count players in "Giocatori con ruoli non utilizzati" - use the actual formation box data (same as main function)
      // This should match the main function's logic: count players with possibleRoles.length === 0
      const playersWithNoPossibleRoles = teamPlayersWithRoles.filter(playerData => {
        if (assignedPlayerIds.has(playerData.playerId)) return false;
        const possibleRoles = playerData.possibleRoles || [];
        return possibleRoles.length === 0;
      });
      const unusedPlayersCount = playersWithNoPossibleRoles.length;
      
      // Calculate occupied positions from actual formation box data (exclude UNUSED) - same as main function
      const occupiedPositions = Object.keys(playersByRole)
        .filter(role => role !== 'UNUSED')
        .reduce((total, role) => total + (playersByRole[role]?.length || 0), 0);
      
      // Calculate total usable players (occupied positions + reserve players)
      // Reserve players are those who have possible roles but weren't assigned to positions
      const reservePlayers = teamPlayersWithRoles.filter(playerData => {
        if (assignedPlayerIds.has(playerData.playerId)) return false; // Not assigned to formation
        const possibleRoles = playerData.possibleRoles || [];
        return possibleRoles.length > 0; // Has roles that fit the formation
      });
      const totalUsablePlayers = occupiedPositions + reservePlayers.length;
      
      stats[formationName] = {
        occupiedPositions: occupiedPositions, // Use actual formation box data
        unassignedPlayers: unusedPlayersCount,  // Use actual formation box data
        totalUsablePlayers: totalUsablePlayers
      };
      
      console.log(`✅ Completed calculation for ${formationName}:`, stats[formationName]);
      console.log(`✅ Assigned players for ${formationName}:`, Array.from(assignedPlayerIds));
      console.log(`✅ Players with no possible roles for ${formationName}:`, playersWithNoPossibleRoles.length);
      
      console.log(`📈 Formation ${formationName} stats:`, {
        occupiedPositions: occupiedPositions,
        unassignedPlayers: unusedPlayersCount,
        totalTeamPlayers: teamPlayersWithRoles.length,
        assignedPlayerIds: assignedPlayerIds.size,
        formationRoles: formationRolesArray
      });
      
      // Debug: Show which players are assigned and which are unused
      console.log(`🔍 DEBUG ${formationName} - Assigned players:`, Array.from(assignedPlayerIds));
      console.log(`🔍 DEBUG ${formationName} - Players with no possible roles:`, 
        teamPlayersWithRoles.filter(playerData => {
          if (assignedPlayerIds.has(playerData.playerId)) return false;
          const possibleRoles = playerData.possibleRoles || [];
          return possibleRoles.length === 0;
        }).map(p => ({ name: p.player.Nome, possibleRoles: p.possibleRoles }))
      );
      
      // Debug: Show all players and their roles
      console.log(`🔍 DEBUG ${formationName} - All players and their roles:`, 
        teamPlayersWithRoles.map(p => ({ 
          name: p.player.Nome, 
          possibleRoles: p.possibleRoles.map(r => r.role),
          unusedRoles: p.unusedRoles.map(r => r.role),
          assigned: assignedPlayerIds.has(p.playerId)
        }))
      );
      
      // DEBUG: Check what the cached calculation shows vs what the main function shows
      console.log(`🔍 CACHED CALCULATION DEBUG ${formationName}:`);
      try {
        console.log(`  - Cached occupiedPositions: ${occupiedPositions}`);
        console.log(`  - Cached unusedPlayersCount: ${unusedPlayersCount}`);
        console.log(`  - Cached playersWithNoPossibleRoles: ${playersWithNoPossibleRoles ? playersWithNoPossibleRoles.length : 'undefined'}`);
        console.log(`  - Cached playersByRole keys:`, Object.keys(playersByRole));
        console.log(`  - Cached playersByRole counts:`, Object.keys(playersByRole).map(role => `${role}: ${playersByRole[role] ? playersByRole[role].length : 'undefined'}`));
        console.log(`  - Cached assignedPlayerIds:`, Array.from(assignedPlayerIds));
        console.log(`  - Cached teamPlayersWithRoles count:`, teamPlayersWithRoles ? teamPlayersWithRoles.length : 'undefined');
      } catch (error) {
        console.error(`❌ ERROR in cached calculation debug for ${formationName}:`, error);
      }
      
      // DEBUG: Check if this is a "3" or "4" formation and log specific info
      if (formationName.startsWith('3')) {
        console.log(`🟢 FORMATION 3-* DEBUG ${formationName}:`, {
          occupiedPositions,
          unusedPlayersCount,
          formationRoles: formationRolesArray,
          teamPlayersCount: teamPlayersWithRoles.length
        });
      } else if (formationName.startsWith('4')) {
        console.log(`🔴 FORMATION 4-* DEBUG ${formationName}:`, {
          occupiedPositions,
          unusedPlayersCount,
          formationRoles: formationRolesArray,
          teamPlayersCount: teamPlayersWithRoles.length
        });
        
        // Extra debug for problematic 4-* formations
        if (formationName === '4-3-3' || formationName === '4-3-1-2' || formationName === '4-4-1-1') {
          console.log(`🚨 PROBLEMATIC FORMATION ${formationName} DETAILED DEBUG:`);
          console.log(`  - Formation positions:`, formation.positions);
          console.log(`  - Formation roles array:`, formationRolesArray);
          console.log(`  - Team players with roles:`, teamPlayersWithRoles.map(p => ({
            name: p.player.Nome,
            possibleRoles: p.possibleRoles.map(r => r.role),
            assigned: assignedPlayerIds.has(p.playerId)
          })));
          console.log(`  - Assigned player IDs:`, Array.from(assignedPlayerIds));
          console.log(`  - Players by role counts:`, Object.keys(playersByRole).map(role => `${role}: ${playersByRole[role].length}`));
          console.log(`  - Final stats:`, { occupiedPositions, unusedPlayersCount });
        }
      }
    });
    
    return stats;
  }, [selectedTeam, teamPlayers, formations, appetibilitaData, roleMapping, players]); // Only recalculate when team players change

  // Get cached formation data for the selected formation (no recalculation needed)
  const getPlayersByFormationRoles = useMemo(() => {
    if (!selectedTeam || !selectedTeam.players || !formations[selectedFormation]) {
      return { playersByRole: {}, positionAssignments: {}, occupiedPositions: 0, unassignedPlayers: 0 };
    }

    // Get the cached stats for this formation
    const cachedStats = allFormationStats[selectedFormation] || { occupiedPositions: 0, unassignedPlayers: 0 };
    
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
          roles.forEach(englishRole => {
            let roleMatched = false;
            
            formationPositions.forEach(position => {
              // Translate English role to Italian for matching with formation positions
              const italianRole = translateRoleToItalian(englishRole);
              
              
              // Case-insensitive matching with Italian formation roles
              const roleMatch = position.roles.some(formationRole => 
                formationRole.toLowerCase() === italianRole.toLowerCase()
              );
              
              
              if (roleMatch) {
                roleMatched = true;
                // Use the Italian role from formation positions
                const formationRole = position.roles.find(formationRole => 
                  formationRole.toLowerCase() === italianRole.toLowerCase()
                );
                
                if (formationRole) {
                  possibleRoles.push({
                    role: formationRole, // Use Italian role for formation assignment
                    positionIndex: position.positionIndex,
                    ranking: getRoleRanking(formationRole),
                    originalRole: englishRole // Keep original English role for reference
                  });
                }
              }
            });
            
            if (!roleMatched) {
              unusedRoles.push(englishRole);
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
          // Translate English role to Italian for matching with formation positions
          const italianRole = translateRoleToItalian(role);
          
          // Case-insensitive matching with Italian formation roles
          const roleMatch = position.roles.some(formationRole => 
            formationRole.toLowerCase() === italianRole.toLowerCase()
          );
          
          if (roleMatch) {
            roleMatched = true;
            possibleRoles.push({
              role: italianRole, // Use Italian role for formation assignment
              positionIndex: position.positionIndex,
              ranking: getRoleRanking(italianRole),
              originalRole: role // Keep original English role for reference
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
    
    
    // NEW ASSIGNMENT ALGORITHM: Position-based assignment following appetibilita priority
    
    // Step 1: Create a list of all positions with their appetibilita rankings
    // Each position can have multiple roles, so we need to find the best appetibilita for each position
    const positionAssignmentsList = [];
    formationPositions.forEach((position, positionIndex) => {
      // Find the worst (highest) appetibilita among all roles for this position
      const worstAppetibilita = Math.max(...position.roles.map(role => getRoleRanking(role)));
      
      positionAssignmentsList.push({
        positionIndex,
        roles: position.roles, // All possible roles for this position
        appetibilita: worstAppetibilita,
        assigned: false,
        assignedPlayer: null
      });
    });
    
    // Step 2: Sort positions by appetibilita (higher number = higher priority for assignment)
    // For same appetibilita, maintain original order (positionIndex)
    positionAssignmentsList.sort((a, b) => {
      if (a.appetibilita !== b.appetibilita) {
        return b.appetibilita - a.appetibilita; // Descending order (higher appetibilita first)
      }
      // If same appetibilita, maintain original order (positionIndex)
      return a.positionIndex - b.positionIndex;
    });
    
    
    // Step 3: For each position (in appetibilita order), find the best available player
    const availablePlayers = [...teamPlayers]; // Copy of all players
    const assignedPlayerIds = new Set(); // Track assigned players
    let totalAssignedPlayers = 0;
    const maxPlayers = 11; // Maximum 11 players in formation
    
    positionAssignmentsList.forEach((positionAssignment, assignmentIndex) => {
      if (positionAssignment.assigned || totalAssignedPlayers >= maxPlayers) {
        return;
      }
      
      const position = formationPositions[positionAssignment.positionIndex];
      if (position.assignedPlayer) {
        return;
      }
      
      // Find all available players who can play ANY of the roles for this position
      const eligiblePlayers = availablePlayers.filter(playerData => {
        if (assignedPlayerIds.has(playerData.playerId)) {
          return false;
        }
        
        // Check if player can play ANY of the roles for this position
        return playerData.possibleRoles.some(roleOption => 
          positionAssignment.roles.some(positionRole => 
            roleOption.role && positionRole && 
            roleOption.role.toLowerCase() === positionRole.toLowerCase()
          )
        );
      });
      
      if (eligiblePlayers.length > 0) {
        // NEW ALGORITHM: Find the best player for this position
        // Step 1: For each eligible player, find their best role for this position (lowest appetibilita)
        const playersWithBestRoles = eligiblePlayers.map(playerData => {
          const applicableRoles = playerData.possibleRoles.filter(roleOption => 
            positionAssignment.roles.some(positionRole => 
              roleOption.role && positionRole && 
              roleOption.role.toLowerCase() === positionRole.toLowerCase()
            )
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
        
        // Step 2: Sort by appetibilita (lowest first), then by FPEDIA (highest first) as tiebreaker
        playersWithBestRoles.sort((a, b) => {
          if (a.appetibilita !== b.appetibilita) {
            return a.appetibilita - b.appetibilita; // Lower appetibilita (better quality) first
          }
          return b.fpediaScore - a.fpediaScore; // Higher FPEDIA as tiebreaker
        });
        
        const bestPlayer = playersWithBestRoles[0].playerData;
        const assignedRoleOption = playersWithBestRoles[0].bestRole;
        
        if (!assignedRoleOption) {
          console.error('❌ No valid role found for player', bestPlayer.player.Nome);
        return;
      }
      
        
        // Assign the best player to this position
        position.assignedPlayer = bestPlayer.player;
        position.assignedPlayerId = bestPlayer.playerId;
        positionAssignment.assigned = true;
        positionAssignment.assignedPlayer = bestPlayer;
        assignedPlayerIds.add(bestPlayer.playerId);
        totalAssignedPlayers++;
        
        
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
        
      }
    });
    
    // Step 4: Add unassigned players to unused (grouped by player)
    const unusedPlayersMap = new Map();
    
    teamPlayers.forEach(playerData => {
      if (!assignedPlayerIds.has(playerData.playerId)) {
        // Player was not assigned to any position
        if (playerData.possibleRoles.length === 0) {
          // Player has NO matching roles - ALL their roles are unused
          // Only add to UNUSED if they have no roles that fit the formation
          if (!unusedPlayersMap.has(playerData.playerId)) {
            unusedPlayersMap.set(playerData.playerId, {
            ...playerData.player,
            price: playerData.teamPlayer.price,
              fantamilioni: playerData.teamPlayer.price,
            playerId: playerData.playerId,
              unusedRoles: []
          });
          }
          // Add all unused roles to this player
          playerData.unusedRoles.forEach(unusedRole => {
            unusedPlayersMap.get(playerData.playerId).unusedRoles.push(unusedRole);
        });
        }
        // If player has matching roles (possibleRoles.length > 0), 
        // they should NOT be in the UNUSED box even if not assigned
        // because at least one of their roles fits the formation
      }
    });
    
    // Convert map to array for display
    const unusedPlayersArray = Array.from(unusedPlayersMap.values());
    
    // Add unassigned players to unused box
    playersByRole['UNUSED'] = unusedPlayersArray;
    
    // Count players in "Giocatori con ruoli non utilizzati" - use the actual formation box data
    const unusedPlayersCount = playersByRole['UNUSED'] ? playersByRole['UNUSED'].length : 0;
    
    console.log('=== MAIN FUNCTION STATS ===');
    console.log('Total assigned players:', totalAssignedPlayers);
    console.log('Unused players count:', unusedPlayersCount);
    console.log('Total team players:', teamPlayers.length);
    console.log('Assigned player IDs:', assignedPlayerIds.size);
    console.log('=== MAIN FUNCTION DEBUG ===');
    console.log('🔍 MAIN - Assigned players:', Array.from(assignedPlayerIds));
    console.log('🔍 MAIN - Players with no possible roles:', 
      teamPlayers.filter(playerData => {
        if (assignedPlayerIds.has(playerData.playerId)) return false;
        const possibleRoles = playerData.possibleRoles || [];
        return possibleRoles.length === 0;
      }).map(p => ({ name: p.player.Nome, possibleRoles: p.possibleRoles }))
    );
    
    // DEBUG: Check what the formation box actually shows vs what we calculate
    console.log('🔍 FORMATION BOX DEBUG:');
    console.log('  - Formation box shows players by role:', Object.keys(playersByRole).map(role => `${role}: ${playersByRole[role].length}`));
    console.log('  - Formation box shows unused players:', playersByRole['UNUSED']?.length || 0);
    console.log('  - Our calculated totalAssignedPlayers:', totalAssignedPlayers);
    console.log('  - Our calculated unusedPlayersCount:', unusedPlayersCount);
    console.log('  - Cached stats (what buttons show):', cachedStats);
    
    // Calculate occupied positions from actual formation box data (exclude UNUSED)
    const occupiedPositions = Object.keys(playersByRole)
      .filter(role => role !== 'UNUSED')
      .reduce((total, role) => total + (playersByRole[role]?.length || 0), 0);
    
    console.log('🔍 CALCULATION COMPARISON:');
    console.log('  - OLD: totalAssignedPlayers =', totalAssignedPlayers);
    console.log('  - NEW: occupiedPositions from playersByRole =', occupiedPositions);
    console.log('  - OLD: unusedPlayersCount =', unusedPlayersCount);
    console.log('  - NEW: unusedPlayersCount from playersByRole =', playersByRole['UNUSED']?.length || 0);
    
    // Calculate total usable players (occupied positions + reserve players)
    // Reserve players are those who have possible roles but weren't assigned to positions
    const reservePlayers = teamPlayers.filter(playerData => {
      if (assignedPlayerIds.has(playerData.playerId)) return false; // Not assigned to formation
      const possibleRoles = playerData.possibleRoles || [];
      return possibleRoles.length > 0; // Has roles that fit the formation
    });
    const totalUsablePlayers = occupiedPositions + reservePlayers.length;
    
    const result = {
      playersByRole,
      positionAssignments,
      occupiedPositions: occupiedPositions, // Use actual formation box data
      unassignedPlayers: unusedPlayersCount,  // Use actual formation box data
      totalUsablePlayers: totalUsablePlayers
    };
    
    return result;
  }, [selectedTeam, players, getFormationRoles, roleMapping, getPlayerRole, formations, selectedFormation, appetibilitaData, translateRoleToItalian, allFormationStats]);

  // Helper function to get formation stats for any formation using the same logic as formation box
  const getFormationStats = useCallback((formationName) => {
    if (!selectedTeam || !selectedTeam.players || !formations[formationName]) {
      return { occupiedPositions: 0, unassignedPlayers: 0 };
    }

    // Use the same calculation logic as getPlayersByFormationRoles but for any formation
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
    
    // Get all team players with their possible roles (same logic as main function)
    const teamPlayersWithRoles = selectedTeam.players.map(teamPlayer => {
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
    
    // Create position assignments list (same logic as main function)
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
    
    // Sort positions by appetibilita (same as main function)
    positionAssignmentsList.sort((a, b) => {
      if (a.appetibilita !== b.appetibilita) {
        return b.appetibilita - a.appetibilita; // Descending order (higher appetibilita first)
      }
      return a.positionIndex - b.positionIndex;
    });
    
    // Assign players to positions (same logic as main function)
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
      
      // NEW ALGORITHM: Find the best player for this position
      // Step 1: For each eligible player, find their best role for this position (lowest appetibilita)
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
      
      // Step 2: Sort by appetibilita (lowest first), then by FPEDIA (highest first) as tiebreaker
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
    
    // Count players with no possible roles (same logic as main function)
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
    
    // Calculate total usable players (occupied positions + reserve players)
    // Reserve players are those who have possible roles but weren't assigned to positions
    const reservePlayers = teamPlayersWithRoles.filter(playerData => {
      if (assignedPlayerIds.has(playerData.playerId)) return false; // Not assigned to formation
      const possibleRoles = playerData.possibleRoles || [];
      return possibleRoles.length > 0; // Has roles that fit the formation
    });
    const totalUsablePlayers = occupiedPositions + reservePlayers.length;
    
    return {
      occupiedPositions: occupiedPositions,
      unassignedPlayers: unusedPlayersCount,
      totalUsablePlayers: totalUsablePlayers
    };
  }, [selectedTeam, players, formations, appetibilitaData, getPlayerRole, translateRoleToItalian]);

  // Helper function to group formations by their starting number (3 vs 4)
  const getGroupedFormations = useCallback(() => {
    const formationsList = Object.keys(formations);
    const formations3 = formationsList.filter(f => f.startsWith('3-'));
    const formations4 = formationsList.filter(f => f.startsWith('4-'));
    
    return {
      formations3: formations3.sort(),
      formations4: formations4.sort()
    };
  }, [formations]);

  // Helper function to render formation buttons
  const renderFormationButtons = useCallback((formationList) => {
    return formationList.map(formation => {
      const stats = getFormationStats(formation);
      console.log(`📊 FORMATION ${formation} stats:`, stats);
      
      return (
        <button
          key={formation}
          onClick={() => setSelectedFormation(formation)}
          style={selectedFormation === formation ? formationButtonActiveStyle : formationButtonStyle}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <span>{formation}</span>
            <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem' }}>
              <span style={{ color: '#22c55e', fontWeight: 'bold' }}>
                {stats.occupiedPositions}
              </span>
              <span style={{ color: '#ef4444', fontWeight: 'bold' }}>
                {stats.unassignedPlayers}
              </span>
              <span style={{ color: '#000000', fontWeight: 'bold' }}>
                {stats.totalUsablePlayers}
              </span>
            </div>
          </div>
        </button>
      );
    });
  }, [getFormationStats, selectedFormation, formationButtonActiveStyle, formationButtonStyle]);

  // Get reserve players with formation assignment logic (same as main formation but with unassigned players)
  const getReservePlayers = useMemo(() => {
    if (!selectedTeam || !selectedTeam.players || !formations[selectedFormation]) return { playersByRole: {}, positionAssignments: {} };
    
    const assignedPlayerIds = new Set();
    
    // Get all assigned player IDs from the main formation
    if (getPlayersByFormationRoles && getPlayersByFormationRoles.positionAssignments) {
      Object.keys(getPlayersByFormationRoles.positionAssignments).forEach(playerId => {
        assignedPlayerIds.add(parseInt(playerId));
      });
    }
    
    // Get unassigned players (these will be our reserve pool)
    const unassignedTeamPlayers = selectedTeam.players.filter(player => {
      return !assignedPlayerIds.has(player.player_id);
    });
    
    
    // Initialize reserve players by role (same structure as main formation)
    const reservePlayersByRole = {};
    const getFormationRoles = formations[selectedFormation] ? formations[selectedFormation].positions.flat() : [];
    
    // Initialize all formation roles for reserve
    getFormationRoles.forEach(role => {
      reservePlayersByRole[role] = [];
    });
    
    // Helper function to get appetibilita ranking for a role
    const getRoleRanking = (role) => {
      return appetibilitaData[role] || 999;
    };
    
    // Create position slots from formation (same as main formation)
    const formationPositions = formations[selectedFormation].positions.map((positionGroup, index) => ({
      positionIndex: index,
      roles: positionGroup,
      assignedPlayer: null,
      assignedPlayerId: null
    }));
    
    // Process unassigned players with same logic as main formation
    const reservePlayerData = unassignedTeamPlayers.map(teamPlayer => {
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
              const roleMatch = position.roles.some(formationRole => 
                formationRole.toLowerCase() === mappedRole.toLowerCase()
              );
              
              if (roleMatch) {
                roleMatched = true;
                // Check if this role is already in possibleRoles (avoid duplicates)
                const alreadyExists = possibleRoles.some(existingRole => 
                  existingRole.role === mappedRole
                );
                if (!alreadyExists) {
                  possibleRoles.push({
                    role: mappedRole,
                    positionIndex: position.positionIndex,
                    ranking: getRoleRanking(mappedRole)
                  });
                }
              }
            });
            
            if (!roleMatched) {
              unusedRoles.push(mappedRole);
            }
          });
        } catch (error) {
          console.error('Error parsing Ruolo Mantra for reserve:', error);
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
    
    // RESERVE ASSIGNMENT ALGORITHM (same as main formation)
    const positionAssignmentsList = [];
    formationPositions.forEach((position, positionIndex) => {
      const worstAppetibilita = Math.max(...position.roles.map(role => getRoleRanking(role)));
      
      positionAssignmentsList.push({
        positionIndex,
        roles: position.roles,
        bestAppetibilita: worstAppetibilita,
        assignedPlayer: null,
        assignedPlayerId: null
      });
    });
    
    // Sort positions by appetibilita (same as main formation)
    positionAssignmentsList.sort((a, b) => b.bestAppetibilita - a.bestAppetibilita); // Descending order
    
    const reservePositionAssignments = {};
    const assignedReservePlayerIds = new Set();
    
    // Assign players to reserve positions (same logic as main formation)
    positionAssignmentsList.forEach(position => {
      // NEW ALGORITHM: Find the best player for this reserve position
      const availableReservePlayers = reservePlayerData.filter(playerData => 
        !assignedReservePlayerIds.has(playerData.playerId)
      );
      
      // Step 1: For each eligible player, find their best role for this position (lowest appetibilita)
      const playersWithBestRoles = availableReservePlayers.map(playerData => {
        const applicableRoles = playerData.possibleRoles.filter(roleOption => 
          position.roles.some(positionRole => 
            roleOption.role && positionRole && 
            roleOption.role.toLowerCase() === positionRole.toLowerCase()
          )
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
      
      // Step 2: Sort by appetibilita (lowest first), then by FPEDIA (highest first) as tiebreaker
      playersWithBestRoles.sort((a, b) => {
        if (a.appetibilita !== b.appetibilita) {
          return a.appetibilita - b.appetibilita; // Lower appetibilita (better quality) first
        }
        return b.fpediaScore - a.fpediaScore; // Higher FPEDIA as tiebreaker
      });
      
      const bestPlayer = playersWithBestRoles[0].playerData;
      
      if (bestPlayer) {
        // Find the matching role for this position
        const matchingRole = position.roles.find(role => 
          bestPlayer.possibleRoles.some(playerRole => 
            playerRole.role && role && 
            playerRole.role.toLowerCase() === role.toLowerCase()
          )
        );
        
        if (matchingRole) {
          reservePositionAssignments[bestPlayer.playerId] = {
            positionIndex: position.positionIndex,
            role: matchingRole,
            originalRole: matchingRole
          };
          
          assignedReservePlayerIds.add(bestPlayer.playerId);
          
          // Add to reserve players by role
          if (!reservePlayersByRole[matchingRole]) {
            reservePlayersByRole[matchingRole] = [];
          }
          reservePlayersByRole[matchingRole].push({
            ...bestPlayer.player,
            price: bestPlayer.teamPlayer.price,
            fantamilioni: bestPlayer.teamPlayer.price
          });
        }
      }
    });
    
    
    return { 
      playersByRole: reservePlayersByRole, 
      positionAssignments: reservePositionAssignments 
    };
  }, [selectedTeam, formations, selectedFormation, getPlayersByFormationRoles, players, roleMapping, appetibilitaData]);

  // Filter team players for the table
  const filteredTeamPlayers = useMemo(() => {
    if (!selectedTeam || !selectedTeam.players) return [];
    
    // Get all team players with their full details
    const teamPlayersWithDetails = selectedTeam.players.map(teamPlayer => {
      const playerDetail = players.find(p => p.id === teamPlayer.id);
      return playerDetail ? {
        ...playerDetail,
        fantamilioni: teamPlayer.price
      } : null;
    }).filter(Boolean);
    
    // Apply search filter
    let filtered = teamPlayersWithDetails.filter(player => {
      const matchesSearch = !searchTerm || 
        player.Nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.Squadra?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = selectedRoles.length === 0 || (() => {
        // Parse the Ruolo Mantra field for filtering
        let playerRoles = [];
        if (player['Ruolo Mantra']) {
          if (Array.isArray(player['Ruolo Mantra'])) {
            playerRoles = player['Ruolo Mantra'];
          } else if (typeof player['Ruolo Mantra'] === 'string') {
            try {
              const jsonString = player['Ruolo Mantra'].replace(/'/g, '"');
              playerRoles = JSON.parse(jsonString);
            } catch (e) {
              playerRoles = [player['Ruolo Mantra']];
            }
          } else {
            playerRoles = [player['Ruolo Mantra']];
          }
        }
        
        // Check if player has any of the selected roles
        return selectedRoles.some(selectedRole => playerRoles.includes(selectedRole));
      })();
      
      return matchesSearch && matchesRole;
    });
    
    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue, bValue;
        
        switch (sortConfig.key) {
          case 'Squadra':
            aValue = a.Squadra || '';
            bValue = b.Squadra || '';
            break;
          case 'Prezzo':
            aValue = parseFloat(a.fantamilioni) || 0;
            bValue = parseFloat(b.fantamilioni) || 0;
            break;
          case 'Ruolo':
            // Get primary role for sorting (first role in Ruolo Mantra)
            let aRoles = [];
            let bRoles = [];
            
            if (a['Ruolo Mantra']) {
              if (Array.isArray(a['Ruolo Mantra'])) {
                aRoles = a['Ruolo Mantra'];
              } else if (typeof a['Ruolo Mantra'] === 'string') {
                try {
                  const jsonString = a['Ruolo Mantra'].replace(/'/g, '"');
                  aRoles = JSON.parse(jsonString);
                } catch (e) {
                  aRoles = [a['Ruolo Mantra']];
                }
              } else {
                aRoles = [a['Ruolo Mantra']];
              }
            }
            
            if (b['Ruolo Mantra']) {
              if (Array.isArray(b['Ruolo Mantra'])) {
                bRoles = b['Ruolo Mantra'];
              } else if (typeof b['Ruolo Mantra'] === 'string') {
                try {
                  const jsonString = b['Ruolo Mantra'].replace(/'/g, '"');
                  bRoles = JSON.parse(jsonString);
                } catch (e) {
                  bRoles = [b['Ruolo Mantra']];
                }
              } else {
                bRoles = [b['Ruolo Mantra']];
              }
            }
            
            // Role sorting order: P, Dc, Dd, Ds, E, M, C, T, W, A, Pc
            const roleOrder = ['P', 'DC', 'DD', 'DS', 'E', 'M', 'C', 'T', 'W', 'A', 'PC'];
            const aRoleIndex = roleOrder.indexOf(aRoles[0] || '');
            const bRoleIndex = roleOrder.indexOf(bRoles[0] || '');
            
            aValue = aRoleIndex === -1 ? 999 : aRoleIndex;
            bValue = bRoleIndex === -1 ? 999 : bRoleIndex;
            break;
          default:
            aValue = a[sortConfig.key] || '';
            bValue = b[sortConfig.key] || '';
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return filtered;
  }, [selectedTeam, players, searchTerm, selectedRoles, sortConfig]);

  if (totalPlayers === 0) {
    return (
      <div style={containerStyle}>
        
        {/* Team Selector */}
        {teams.length > 0 && (
          <div style={teamSelectorStyle}>
            {teams.map(team => {
              const isSelected = selectedTeamId === team.id;
              const remainingBudget = calculateRemainingBudget(team);
              const playerCount = team.players ? team.players.length : 0;
              const maxPlayers = 30; // Default max players
              
              // Get centralized color coding
              const colorCoding = getTeamColorCoding(team, teams, 21, maxPlayers);
              
              // Determine button style using centralized color coding
              let buttonStyle = {
                ...teamButtonStyle,
                borderColor: isSelected ? '#3b82f6' : colorCoding.colors.border,
                backgroundColor: isSelected ? '#eff6ff' : colorCoding.colors.background,
                color: isSelected ? '#3b82f6' : colorCoding.colors.text
              };
              
              
              return (
                <button
                  key={team.id}
                  onClick={() => setSelectedTeamId(team.id)}
                  style={buttonStyle}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <span>{team.name}</span>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem' }}>
                      <span style={{ color: '#22c55e', fontWeight: 'bold' }}>
                        {playerCount}
                      </span>
                      <span style={{ 
                        color: remainingBudget <= 0 || playerCount >= maxPlayers ? '#ef4444' : '#000000', 
                        fontWeight: 'bold' 
                      }}>
                        {remainingBudget} FM
                      </span>
                  </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Formation Selector - Grouped by starting number */}
        {Object.keys(formations).length > 0 && (() => {
          const { formations3, formations4 } = getGroupedFormations();
          return (
            <div style={groupedFormationSelectorStyle}>
              {/* Formations starting with 3 */}
              {formations3.length > 0 && (
                <div style={formationLineStyle}>
                  {renderFormationButtons(formations3)}
                </div>
              )}
              {/* Formations starting with 4 */}
              {formations4.length > 0 && (
                <div style={formationLineStyle}>
                  {renderFormationButtons(formations4)}
                </div>
              )}
            </div>
          );
        })()}

        
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

      {/* Team Selector */}
      {teams.length > 0 && (
        <div style={teamSelectorStyle}>
          {teams.map(team => {
            const isSelected = selectedTeamId === team.id;
            const remainingBudget = calculateRemainingBudget(team);
            const playerCount = team.players ? team.players.length : 0;
            const maxPlayers = 30; // Default max players
            
            // Get centralized color coding
            const colorCoding = getTeamColorCoding(team, teams, 21, maxPlayers);
            
            // Determine button style using centralized color coding
            let buttonStyle = {
              ...teamButtonStyle,
              borderColor: isSelected ? '#3b82f6' : colorCoding.colors.border,
              backgroundColor: isSelected ? '#eff6ff' : colorCoding.colors.background,
              color: isSelected ? '#3b82f6' : colorCoding.colors.text
            };
              
              return (
              <button
                key={team.id}
                onClick={() => setSelectedTeamId(team.id)}
                style={buttonStyle}
              >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                  <span>{team.name}</span>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem' }}>
                      <span style={{ color: '#22c55e', fontWeight: 'bold' }}>
                      {playerCount}
                      </span>
                    <span style={{ 
                      color: remainingBudget <= 0 || playerCount >= maxPlayers ? '#ef4444' : '#000000', 
                      fontWeight: 'bold' 
                    }}>
                      {remainingBudget} FM
                      </span>
                    </div>
                  </div>
              </button>
              );
            })}
          </div>
        )}

      {/* Formation Selector - Grouped by starting number */}
      {Object.keys(formations).length > 0 && (() => {
        const { formations3, formations4 } = getGroupedFormations();
              return (
          <div style={groupedFormationSelectorStyle}>
            {/* Formations starting with 3 */}
            {formations3.length > 0 && (
              <div style={formationLineStyle}>
                {renderFormationButtons(formations3)}
              </div>
            )}
            {/* Formations starting with 4 */}
            {formations4.length > 0 && (
              <div style={formationLineStyle}>
                {renderFormationButtons(formations4)}
              </div>
            )}
          </div>
        );
      })()}

        {/* Formation Display */}
        {formations[selectedFormation] && (
        <div style={{ 
          display: 'flex', 
          gap: '1.5rem', 
          alignItems: 'stretch', 
          minHeight: '700px',
          flexDirection: windowWidth <= 768 ? 'column' : 'row'
        }}>

          {/* Formation Column */}
          <div style={{
            ...formationDisplayStyle,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            width: windowWidth <= 768 ? '100%' : 'auto',
            justifyContent: 'flex-start'
          }}>
            {/* Fixed Formation Header */}
            <div style={{
              position: 'sticky',
              top: 0,
              backgroundColor: '#f8fafc',
              zIndex: 10,
              padding: '1rem 0',
              borderBottom: '2px solid #e2e8f0',
              marginBottom: '1rem'
            }}>
              <h3 style={{ textAlign: 'center', marginBottom: '0.5rem', fontSize: '1.625rem', fontWeight: '600', color: '#374151' }}>
              Formazione {selectedFormation}
            </h3>
              <div style={{ textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '1.25rem' }}>
                    {getPlayersByFormationRoles.occupiedPositions}/11 posizioni occupate
                  </span>
                <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '1.25rem' }}>
                    {getPlayersByFormationRoles.unassignedPlayers} giocatori non utilizzabili
                  </span>
                <span style={{ color: '#000000', fontWeight: 'bold', fontSize: '1.25rem' }}>
                    {getPlayersByFormationRoles.totalUsablePlayers} giocatori utilizzabili
                  </span>
            </div>
                  </div>

            {/* Formation Diagram with Fixed Height */}
            <div style={{
              minHeight: '500px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '1rem 0'
            }}>
          
          {/* Goalkeeper Line */}
            <div style={formationLineStyle}>
            {getFormationLines.p.map((positionData, index) => (
                  <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={getPositionStyle(positionData)}>
                    {positionData.role}
                    </div>
                        <div style={playerUnderRoleStyle}>
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
                        <span 
                          style={{cursor: 'pointer', color: '#3b82f6'}}
                          onClick={() => navigate(`/player/${player.player_id}`)}
                          title="Click to view player details"
                        >
                          {player.Nome} ({player.fantamilioni} FM)
                        </span>
                      ) : null;
                    }
                    return null;
                  })()}
        </div>
                  </div>
              ))}
            </div>

          {/* Formation Lines based on visual layout */}
          {getFormationLines.lines.map((line, lineIndex) => (
            <div key={lineIndex} style={formationLineStyle}>
              {line.map((positionData, positionIndex) => (
                <div key={positionIndex} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={getPositionStyle(positionData)}>
                    {positionData.role}
                    </div>
                  <div style={playerUnderRoleStyle}>
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
                          <span 
                            style={{cursor: 'pointer', color: '#3b82f6'}}
                            onClick={() => navigate(`/player/${player.player_id}`)}
                            title="Click to view player details"
                          >
                            {player.Nome} ({player.fantamilioni} FM)
                          </span>
                      ) : null;
                    }
                    return null;
                  })()}
                  </div>
                  </div>
                ))}
              </div>
          ))}

        </div>
      </div>

          {/* Riserve Column */}
          <div style={{ 
            minWidth: windowWidth <= 768 ? '100%' : '280px', 
            maxWidth: windowWidth <= 768 ? '100%' : '300px',
            backgroundColor: '#f8fafc', 
            borderRadius: '0.5rem', 
            padding: '1rem',
            border: '1px solid #e2e8f0',
            overflowY: 'auto'
          }}>
            <h3 style={{ 
              textAlign: 'center', 
              marginBottom: '1rem', 
              fontSize: '1.625rem', 
              fontWeight: '600', 
              color: '#374151' 
            }}>
              Riserve ({Object.keys(getReservePlayers.positionAssignments || {}).length})
          </h3>
            
            {getReservePlayers.playersByRole && Object.keys(getReservePlayers.playersByRole).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {Object.entries(getReservePlayers.playersByRole).map(([role, players]) => {
                  if (players.length === 0) return null;
                  
                  
                  // Convert role to Italian and get color using roles.csv mapping
                  const roleToItalianAndColor = (role) => {
                    // Use the actual roleMapping from roles.csv
                    // Handle formation role mapping to Italian
                    let italianRole = roleMapping[role];
                    if (!italianRole) {
                      // Map formation roles to Italian translations
                      const formationToItalian = {
                        'P': 'P',      // Goalkeeper
                        'DC': 'Dc',    // Center Back
                        'B': 'B',      // Full Back
                        'E': 'E',      // Wing Back
                        'M': 'M',      // Midfielder
                        'C': 'C',      // Central Midfielder
                        'W': 'W',      // Winger
                        'A': 'A',      // Attacker/Forward
                        'PC': 'Pc',    // Center Forward
                        'T': 'T',      // Trequartista
                        'Dd': 'Dd',    // Right Back
                        'Ds': 'Ds',    // Left Back
                        'Dm': 'Dm',    // Defensive Midfielder
                        'Cm': 'Cm',    // Central Midfielder
                        'Am': 'Am',    // Attacking Midfielder
                        'Al': 'Al',    // Left Attacker
                        'Ad': 'Ad',    // Right Attacker
                        'Ac': 'Ac'     // Center Attacker
                      };
                      italianRole = formationToItalian[role] || role;
                    }
                    
                    // Get color from roles.csv mapping
                    const roleInfo = getRoleInfo(italianRole);
                    return { 
                      italian: italianRole, 
                      color: roleInfo ? roleInfo.color : '#6b7280'
                    };
                  };
                  
                  const roleInfo = roleToItalianAndColor(role);
                  
                  return players.map((player, playerIndex) => (
                    <div key={`${role}-${playerIndex}`} style={{
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
                        <div 
                          style={{ fontWeight: '600', color: '#3b82f6', fontSize: '0.875rem', cursor: 'pointer' }}
                          onClick={() => navigate(`/player/${player.player_id}`)}
                          title="Click to view player details"
                        >
                          {player.Nome}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {player.Squadra}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                        <span style={{
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
                      </div>
                    </div>
                  ));
                }).filter(Boolean).flat()}
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
          </div>
      )}

      {/* Unused Roles Box - Outside Formation Display */}
      {formations[selectedFormation] && getPlayersByFormationRoles.playersByRole && getPlayersByFormationRoles.playersByRole['UNUSED'] && 
           getPlayersByFormationRoles.playersByRole['UNUSED'].length > 0 && (
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          backgroundColor: '#fef2f2',
          borderRadius: '0.5rem',
          border: '1px solid #fecaca'
        }}>
          <div style={{
            fontSize: '1rem',
            fontWeight: '600',
            color: '#dc2626',
            marginBottom: '0.75rem',
            textAlign: 'center'
          }}>
                Giocatori con ruoli non utilizzati in questa formazione
              </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
              {getPlayersByFormationRoles.playersByRole['UNUSED'].map((player, index) => (
              <div 
                key={index} 
                style={{
                  padding: '0.5rem',
                  backgroundColor: 'white',
                  borderRadius: '0.25rem',
                  border: '1px solid #fecaca',
                  cursor: 'pointer',
                  color: '#3b82f6',
                  fontSize: '0.875rem'
                }}
                onClick={() => navigate(`/player/${player.player_id}`)}
                title="Click to view player details"
              >
                  {player.Nome} - {player.unusedRoles ? player.unusedRoles.join(', ') : player.originalRole}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Team Players Table - Full Featured */}
      {totalPlayers > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '600', 
            color: '#374151', 
            marginBottom: '1rem' 
          }}>
            Giocatori Acquistati ({totalPlayers})
          </h3>
          
          {/* Search and Filters */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: '1rem', 
            marginBottom: '1rem' 
          }}>
            {/* Search Box */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'center' }}>
              <input
                type="text"
                placeholder="Cerca per giocatore..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  minWidth: '200px'
                }}
              />
            </div>
            
            {/* Role Filter Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
              {availableRolesForFilter.map(englishRole => {
                const isSelected = selectedRoles.includes(englishRole);
                const roleColor = roleColorMapping[englishRole] || '#6b7280';
                const italianRole = enhancedRoleMapping[englishRole] || englishRole;
                
          
          return (
                  <button
                    key={englishRole}
                    onClick={() => toggleRole(englishRole)}
                    style={{
                      padding: '0.5rem 1rem',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      border: `2px solid ${roleColor}`,
                      borderRadius: '0.375rem',
                      backgroundColor: isSelected ? roleColor : 'white',
                      color: isSelected ? 'white' : roleColor,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      minWidth: '40px',
                      textAlign: 'center'
                    }}
                    title={`${italianRole} - ${englishRole}`}
                  >
                    {italianRole}
                  </button>
                );
              })}
              <span style={{ fontSize: '0.875rem', color: '#6b7280', marginLeft: '1rem' }}>
                {filteredTeamPlayers.length} giocatori trovati
              </span>
                </div>
              </div>

          {/* Table */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            border: '1px solid #e5e7eb',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  {windowWidth > 768 && (
                  <th style={{ 
                    padding: '0.75rem', 
                    textAlign: 'left', 
                    fontWeight: '600', 
                    color: '#374151',
                    borderBottom: '1px solid #e5e7eb'
                  }}>
                    Azioni
                  </th>
                  )}
                  <th style={{ 
                    padding: windowWidth <= 768 ? '0.5rem' : '0.75rem', 
                    textAlign: 'left', 
                    fontWeight: '600', 
                    color: '#374151',
                    borderBottom: '1px solid #e5e7eb',
                    fontSize: windowWidth <= 768 ? '0.75rem' : '1rem'
                  }}>
                    Nome
                  </th>
                  {windowWidth > 768 && (
                  <th 
                    style={{ 
                      padding: '0.75rem', 
                      textAlign: 'left', 
                      fontWeight: '600', 
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                    onClick={() => handleSort('Squadra')}
                    title="Clicca per ordinare per squadra"
                  >
                    Squadra {getSortIcon('Squadra')}
                  </th>
                  )}
                  <th 
                    style={{ 
                      padding: windowWidth <= 768 ? '0.5rem' : '0.75rem', 
                      textAlign: 'left', 
                      fontWeight: '600', 
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      userSelect: 'none',
                      fontSize: windowWidth <= 768 ? '0.75rem' : '1rem'
                    }}
                    onClick={() => handleSort('Ruolo')}
                    title="Clicca per ordinare per ruolo"
                  >
                    Ruolo {getSortIcon('Ruolo')}
                  </th>
                  {windowWidth > 768 && (
                  <th 
                    style={{ 
                      padding: '0.75rem', 
                      fontWeight: '600', 
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb'
                    }}
                  >
                    Skills
                  </th>
                  )}
                  <th 
                    style={{ 
                      padding: windowWidth <= 768 ? '0.5rem' : '0.75rem', 
                      textAlign: 'right', 
                      fontWeight: '600', 
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      userSelect: 'none',
                      fontSize: windowWidth <= 768 ? '0.75rem' : '1rem'
                    }}
                    onClick={() => handleSort('Prezzo')}
                    title="Clicca per ordinare per prezzo"
                  >
                    Prezzo {getSortIcon('Prezzo')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTeamPlayers.map((player, index) => (
                  <tr 
                      key={player.id} 
                      style={{
                      borderBottom: index === filteredTeamPlayers.length - 1 ? 'none' : '1px solid #f3f4f6'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8fafc';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                    {windowWidth > 768 && (
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <button
                        onClick={() => handleRemovePlayer(player.id)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: 'transparent',
                          border: '1px solid #ef4444',
                          borderRadius: '0.25rem',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          transition: 'all 0.2s'
                        }}
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
                        Rimuovi
                      </button>
                    </td>
                    )}
                    <td style={{ 
                      padding: windowWidth <= 768 ? '0.5rem' : '0.75rem', 
                      fontWeight: '500', 
                      color: '#3b82f6',
                      fontSize: windowWidth <= 768 ? '0.75rem' : '1rem',
                      cursor: 'pointer'
                    }}
                    onClick={() => navigate(`/player/${player.player_id}`)}
                    title="Click to view player details">
                      {player.Nome}
                    </td>
                    {windowWidth > 768 && (
                    <td style={{ padding: '0.75rem', color: '#6b7280' }}>
                      {player.Squadra}
                    </td>
                    )}
                    <td style={{ 
                      padding: windowWidth <= 768 ? '0.5rem' : '0.75rem'
                    }}>
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                        {(() => {
                          // Parse the Ruolo Mantra field
                          let playerRoles = [];
                          if (player['Ruolo Mantra']) {
                            if (Array.isArray(player['Ruolo Mantra'])) {
                              playerRoles = player['Ruolo Mantra'];
                            } else if (typeof player['Ruolo Mantra'] === 'string') {
                              try {
                                const jsonString = player['Ruolo Mantra'].replace(/'/g, '"');
                                playerRoles = JSON.parse(jsonString);
                              } catch (e) {
                                playerRoles = [player['Ruolo Mantra']];
                              }
                            } else {
                              playerRoles = [player['Ruolo Mantra']];
                            }
                          }
                          
                          return playerRoles.map((englishRole, roleIndex) => {
                            const italianRole = enhancedRoleMapping[englishRole] || englishRole;
                            const roleColor = roleColorMapping[englishRole] || '#6b7280';
                            
                            
                            return (
                              <span
                                key={roleIndex}
                                style={{
                                  padding: windowWidth <= 768 ? '0.1rem 0.25rem' : '0.125rem 0.375rem',
                                  backgroundColor: roleColor,
                                  color: 'white',
                                  borderRadius: '0.25rem',
                                  fontSize: windowWidth <= 768 ? '0.5rem' : '0.625rem',
                                  fontWeight: '600',
                                  minWidth: '1.5rem',
                                  textAlign: 'center'
                                }}
                              >
                                {italianRole}
                              </span>
                            );
                          });
                        })()}
                    </div>
                    </td>
                    {windowWidth > 768 && (
                    <td style={{ padding: '0.75rem' }}>
                      {(() => {
                        // Parse the Skills field for display
                        let skills = [];
                        if (player.Skills) {
                          if (Array.isArray(player.Skills)) {
                            skills = player.Skills;
                          } else if (typeof player.Skills === 'string') {
                            try {
                              const jsonString = player.Skills.replace(/'/g, '"');
                              skills = JSON.parse(jsonString);
                            } catch (e) {
                              skills = [player.Skills];
                            }
                          } else {
                            skills = [player.Skills];
                          }
                        }
                        
                        return skills.length > 0 ? (
                          <div style={{ display: 'flex', gap: '0.125rem', flexWrap: 'wrap' }}>
                            {skills.map((skill, idx) => {
                              // Define skill colors (same as Giocatori tab)
                              const getSkillColor = (skill) => {
                                const skillColorMap = {
                                  'Outsider': '#e11d48',      // Rose-600
                                  'Titolare': '#059669',      // Emerald-600
                                  'Buona Media': '#0ea5e9',   // Sky-500
                                  'Assistman': '#7c3aed',     // Violet-600
                                  'Goleador': '#dc2626',      // Red-600
                                  'Difensore': '#64748b',     // Slate-500
                                  'Portiere': '#ea580c',      // Orange-600
                                  'Centrocampista': '#0891b2', // Cyan-600
                                  'Attaccante': '#be185d',    // Pink-700
                                  'Falloso': '#f59e0b',       // Amber-500
                                  'Fuoriclasse': '#8b5cf6',   // Violet-500
                                  'Giovane talento': '#10b981', // Emerald-500
                                  'Panchinaro': '#6b7280',    // Slate-500
                                  'Piazzati': '#f97316',      // Orange-500
                                  'Rigorista': '#ef4444'      // Red-500
                                };
                                return skillColorMap[skill] || '#6b7280';
                              };
                              
                              return (
                                <span key={idx} style={{
                                  padding: '0.125rem 0.25rem',
                                  backgroundColor: getSkillColor(skill),
                                  borderRadius: '0.125rem',
                                  fontSize: '0.5rem',
                                  color: 'white',
                                  fontWeight: '600'
                                }}>
                                  {skill}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>-</span>
                        );
                      })()}
                    </td>
                    )}
                    <td style={{ 
                      padding: windowWidth <= 768 ? '0.5rem' : '0.75rem', 
                      textAlign: 'right', 
                      fontWeight: '500', 
                      color: '#1f2937',
                      fontSize: windowWidth <= 768 ? '0.75rem' : '1rem'
                    }}>
                      {player.fantamilioni} FM
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
              </div>
            </div>
      )}
    </div>
  );
};

export default RosaAcquistata;
