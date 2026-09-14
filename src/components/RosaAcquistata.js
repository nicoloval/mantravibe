// src/components/RosaAcquistata.js
/* eslint-disable no-unused-vars */
import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTeamColorCoding } from '../utils/dataUtils';
import { getCachedData, setCachedData, CACHE_CONFIG } from '../utils/cache';
import { rankFormations, processPlayersForRanking, DEFAULT_CONFIG } from '../utils/formationRanking';
import { computeFormationStats, computeFormationScore, SCORE_THRESHOLDS } from '../utils/formationScoring';
import { theme } from '../theme';

// Role-category ranking shared by the Rosa column's sort and the formation depth chart's row
// order, so both read top-to-bottom as goalkeeper -> defense -> midfield -> wingers/trequartisti
// -> attack.
const ROSTER_CATEGORY_ORDER = { goalkeepers: 0, defenders: 1, midfielders: 2, wingers: 3, attackers: 4 };
const rosterCategoryForPlayer = (player) => {
  let roles = [];
  if (player['Ruolo Mantra']) {
    try {
      roles = JSON.parse(player['Ruolo Mantra'].replace(/'/g, '"'));
    } catch (e) {
      roles = [player['Ruolo Mantra']];
    }
  } else if (player.Ruolo) {
    roles = [player.Ruolo];
  }
  const primary = (roles[0] || '').toLowerCase();
  if (primary === 'p') return 'goalkeepers';
  if (['dc', 'b', 'dd', 'ds'].includes(primary)) return 'defenders';
  if (['w', 't'].includes(primary)) return 'wingers';
  if (['a', 'pc'].includes(primary)) return 'attackers';
  return 'midfielders';
};

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
  const [formationRankings, setFormationRankings] = useState([]);
  
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
  // Keyed by the Mantra role codes used directly in player['Ruolo Mantra'] (P, Dc, Dd, Ds, B,
  // E, M, C, W, T, A, Pc) - same vocabulary as roles.csv's Ruolo column.
  const roleColorMapping = useMemo(() => {
    const colorNameToHex = {
      'Orange': theme.roleCategory.goalkeepers,
      'Green': theme.roleCategory.defenders,
      'Blue': theme.roleCategory.midfielders,
      'Purple': theme.roleCategory.wingers,
      'Red': theme.roleCategory.attackers
    };

    const mapping = {};

    // Map roles.csv roles directly - this is the source of truth
    roles.forEach(role => {
      mapping[role.Ruolo] = colorNameToHex[role.Color] || role.Color;
    });

    // Fallback color mapping for when CSV Color column is missing
    const fallbackColors = {
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

    // Apply fallback colors for any missing mappings
    Object.keys(fallbackColors).forEach(role => {
      if (!mapping[role] || mapping[role] === '') {
        mapping[role] = fallbackColors[role];
      }
    });


    return mapping;
  }, [roles]);

  // Get all available roles from roles.csv's Ruolo column, in CSV order - same vocabulary as
  // player['Ruolo Mantra'], and same as the Giocatori tab.
  const availableRolesForFilter = useMemo(() => {
    return roles.map(role => role.Ruolo);
  }, [roles]);

  // Enhanced role mapping that includes formation roles
  // Player roles (player['Ruolo Mantra']) are already Mantra codes (P, Dc, Dd, Ds, B, E, M,
  // C, W, T, A, Pc) - the exact vocabulary formation slots use, so no translation is needed.
  // This used to look roles up in roles.csv's Role->Ruolo column via `roleMapping`, but that
  // map's Role column happens to also contain "M" (mapping it to "C"), which silently
  // corrupted every player's real "M" role into "C" for formation-matching purposes. Keep
  // this as an identity function - do not reintroduce the roles.csv lookup here.
  const translateRoleToItalian = useCallback((role) => role, []);

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
      return mantraRole;
    }
    return player.Ruolo;
  }, []);
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

  // Whole-roster list for the compact left-hand column (see the 3-column "eagle eye" layout
  // below): every acquired player, grouped by role category (same order as the formation depth
  // chart) and by price within each category, so it reads as a quick squad overview alongside
  // the tactical view instead of requiring a scroll down to the full sortable table.
  const rosterSorted = useMemo(() => {
    return [...teamPlayers].sort((a, b) => {
      const rankA = ROSTER_CATEGORY_ORDER[rosterCategoryForPlayer(a)];
      const rankB = ROSTER_CATEGORY_ORDER[rosterCategoryForPlayer(b)];
      if (rankA !== rankB) return rankA - rankB;
      return (b.fantamilioni || 0) - (a.fantamilioni || 0);
    });
  }, [teamPlayers]);


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
    color: theme.text,
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
    color: theme.textMuted
  };

  const emptyRoleStyle = {
    padding: '2rem',
    textAlign: 'center',
    color: theme.textFaint,
    fontStyle: 'italic'
  };


  const teamSelectorLabelStyle = {
    fontSize: '1rem',
    fontWeight: '500',
    color: theme.text
  };

  const teamSelectorSelectStyle = {
    padding: '0.5rem 1rem',
    border: `1px solid ${theme.border}`,
    borderRadius: '0.375rem',
    fontSize: '1rem',
    backgroundColor: theme.surfaceAlt,
    color: theme.text,
    minWidth: '200px'
  };

  // Function to calculate remaining budget for a team
  const calculateRemainingBudget = (team) => {
    const totalSpent = (team.players || []).reduce((sum, player) => sum + (player.price || 0), 0);
    return team.budget - totalSpent;
  };

  const teamButtonStyle = {
    padding: windowWidth <= 768 ? '0.375rem 0.75rem' : '0.5rem 1rem',
    border: `2px solid ${theme.border}`,
    borderRadius: '0.375rem',
    fontSize: windowWidth <= 768 ? '1rem' : '1.125rem', // Increased by 4 points (0.25rem)
    backgroundColor: theme.surfaceAlt,
    color: theme.text,
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontWeight: '500'
  };

  const teamButtonSelectedStyle = {
    ...teamButtonStyle,
    borderColor: theme.pink,
    backgroundColor: theme.pinkSoft,
    color: theme.pink
  };

  const teamButtonOrangeStyle = {
    ...teamButtonStyle,
    borderColor: theme.roleCategory.goalkeepers,
    backgroundColor: 'rgba(251, 146, 60, 0.12)',
    boxShadow: '0 1px 3px rgba(251, 146, 60, 0.15)'
  };

  const teamButtonRedStyle = {
    ...teamButtonStyle,
    borderColor: theme.danger,
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    boxShadow: '0 1px 3px rgba(248, 113, 113, 0.15)'
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

  // Single scrollable row instead of two stacked groups - keeps every formation reachable
  // without wrapping, even on narrower screens (where it just becomes horizontally scrollable).
  const groupedFormationSelectorStyle = {
    marginBottom: '1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    overflowX: 'auto',
    paddingBottom: '0.25rem'
  };

  const formationGroupDividerStyle = {
    width: '1px',
    alignSelf: 'stretch',
    backgroundColor: theme.border,
    flexShrink: 0,
    margin: '0 0.125rem'
  };

  const formationButtonStyle = useMemo(() => ({
    padding: '0.375rem 0.625rem',
    border: `1px solid ${theme.border}`,
    borderRadius: '0.375rem',
    fontSize: '0.8rem',
    backgroundColor: theme.surfaceAlt,
    color: theme.text,
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontWeight: '500',
    flexShrink: 0
  }), []);

  const formationButtonActiveStyle = useMemo(() => ({
    ...formationButtonStyle,
    borderColor: theme.pink,
    backgroundColor: theme.pinkSoft,
    color: theme.pink,
    border: `2px solid ${theme.pink}`,
    boxShadow: '0 4px 6px rgba(236, 72, 153, 0.15)'
  }), [formationButtonStyle]);

  // Subtle pitch-like backdrop (a faint green wash over the normal surface color) behind the
  // formation depth chart - a nod to a football pitch without a literal turf graphic, and
  // legible in both light and dark mode since it's just a low-alpha overlay.
  const formationDisplayStyle = {
    padding: '1rem',
    background: `linear-gradient(180deg, rgba(52, 199, 89, 0.08), rgba(52, 199, 89, 0.02)), ${theme.surface}`,
    borderRadius: '0.75rem',
    border: `1px solid ${theme.border}`
  };

  const formationPositionStyle = {
    padding: '0.15rem 0.45rem',
    borderRadius: '999px',
    fontSize: '0.7rem',
    fontWeight: '700',
    color: 'white',
    minWidth: '28px',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    flexShrink: 0
  };

  // Function to get role color for formation positions. Formation slot codes are uppercase
  // (e.g. "DC", "PC" per mantra_formations_positions.json), so this maps onto the same
  // categories as theme.roleCategory / roleColorMapping (which are keyed by the mixed-case
  // Ruolo Mantra codes players actually carry).
  const getRoleColor = (role) => {
    const roleColorMap = {
      'P': theme.roleCategory.goalkeepers,
      'DC': theme.roleCategory.defenders,
      'B': theme.roleCategory.defenders,
      'DD': theme.roleCategory.defenders,
      'DS': theme.roleCategory.defenders,
      'E': theme.roleCategory.midfielders,
      'M': theme.roleCategory.midfielders,
      'C': theme.roleCategory.midfielders,
      'W': theme.roleCategory.wingers,
      'T': theme.roleCategory.wingers,
      'A': theme.roleCategory.attackers,
      'PC': theme.roleCategory.attackers
    };
    return roleColorMap[role] || theme.textMuted;
  };

  // Function to get role info (Italian name and color) - using same mapping as roleColorMapping
  const getRoleInfo = (role) => {
    const roleInfoMap = {
      'P': { italian: 'P', color: theme.roleCategory.goalkeepers },
      'DC': { italian: 'Dc', color: theme.roleCategory.defenders },
      'Dc': { italian: 'Dc', color: theme.roleCategory.defenders }, // Add lowercase version
      'B': { italian: 'B', color: theme.roleCategory.defenders },
      'DD': { italian: 'Dd', color: theme.roleCategory.defenders },
      'Dd': { italian: 'Dd', color: theme.roleCategory.defenders }, // Add lowercase version
      'DS': { italian: 'Ds', color: theme.roleCategory.defenders },
      'Ds': { italian: 'Ds', color: theme.roleCategory.defenders }, // Add lowercase version
      'E': { italian: 'E', color: theme.roleCategory.midfielders },
      'M': { italian: 'M', color: theme.roleCategory.midfielders },
      'C': { italian: 'C', color: theme.roleCategory.midfielders },
      'W': { italian: 'W', color: theme.roleCategory.wingers },
      'T': { italian: 'T', color: theme.roleCategory.wingers },
      'A': { italian: 'A', color: theme.roleCategory.attackers },
      'PC': { italian: 'Pc', color: theme.roleCategory.attackers },
      'Pc': { italian: 'Pc', color: theme.roleCategory.attackers }, // Add lowercase version
      'Dm': { italian: 'Dm', color: theme.roleCategory.midfielders },
      'Cm': { italian: 'Cm', color: theme.roleCategory.midfielders },
      'Am': { italian: 'Am', color: theme.roleCategory.wingers },
      'Al': { italian: 'Al', color: theme.roleCategory.attackers },
      'Ad': { italian: 'Ad', color: theme.roleCategory.attackers },
      'Ac': { italian: 'Ac', color: theme.roleCategory.attackers }
    };
    return roleInfoMap[role] || { italian: role, color: theme.textMuted };
  };

  // Function to get position style with split colors for multiple roles
  const getPositionStyle = (positionData) => {
    const roles = positionData.roles || [positionData.role];
    const colors = roles.map(role => getRoleColor(role));

    // If only one role or all roles have the same color, use solid color
    if (colors.length === 1 || colors.every(color => color === colors[0])) {
      return {
        ...formationPositionStyle,
        backgroundColor: colors[0]
      };
    }

    // For multiple different colors, create a gradient or split effect
    if (colors.length === 2) {
      return {
        ...formationPositionStyle,
        background: `linear-gradient(90deg, ${colors[0]} 50%, ${colors[1]} 50%)`,
        position: 'relative'
      };
    }

    // For 3 colors, create a three-way split
    if (colors.length === 3) {
      return {
        ...formationPositionStyle,
        background: `linear-gradient(90deg, ${colors[0]} 33.33%, ${colors[1]} 33.33%, ${colors[1]} 66.66%, ${colors[2]} 66.66%)`,
        position: 'relative'
      };
    }

    // For more than 3 colors, use the first color as fallback
    return {
      ...formationPositionStyle,
      backgroundColor: colors[0]
    };
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
    const numbers = selectedFormation.split('-').map(num => parseInt(num)).filter(num => !isNaN(num));
    return numbers;
  }, [selectedFormation]);

  // Rows for the formation view, chunked directly off the formation name's own numbers (e.g.
  // "4-3-1-2" -> goalkeeper, then lines of 4/3/1/2) rather than by role category. Positions in
  // mantra_formations_positions.json are authored in this same shape order, so this reproduces
  // the familiar, recognizable "mantra formation" layout (a back-4 reading as one line, a
  // trequartista getting its own line when the formation has one, etc.) instead of a categorical
  // regrouping - the wingers/trequartisti line falls out naturally wherever the formation name
  // already puts it, with no special-casing needed.
  const getFormationDepthRows = useMemo(() => {
    if (!formations[selectedFormation]) return [];

    const positions = formations[selectedFormation].positions;
    const layout = getFormationLayout;
    const rows = [];
    let positionIndex = 0;

    const buildSlot = () => {
      const positionGroup = positions[positionIndex];
      const positionDisplay = positionGroup.length > 1 ? positionGroup.join('/') : positionGroup[0];
      const slot = { role: positionDisplay, roles: positionGroup, positionIndex };
      positionIndex++;
      return slot;
    };

    // Goalkeeper always gets its own single-slot line first.
    if (positions[positionIndex] && positions[positionIndex].some(role => role && role.toLowerCase() === 'p')) {
      rows.push({ key: 'line-gk', slots: [buildSlot()] });
    }

    layout.forEach((slotsInLine, lineIndex) => {
      const slots = [];
      for (let i = 0; i < slotsInLine && positionIndex < positions.length; i++) {
        slots.push(buildSlot());
      }
      if (slots.length > 0) rows.push({ key: `line-${lineIndex}`, slots });
    });

    return rows;
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
    if (!selectedTeam || !selectedTeam.players || !teamPlayers.length) {
      return {};
    }

    // Try to get cached data first
    const cacheKey = `team_${selectedTeam.id}_players_${teamPlayers.length}`;
    const cachedStats = getCachedData(CACHE_CONFIG.FORMATION_STATS, cacheKey);
    if (cachedStats) {
      return cachedStats;
    }

    const stats = {};
    
    // Calculate stats for each formation using the EXACT same logic as getPlayersByFormationRoles
    Object.keys(formations).forEach(formationName => {
      const formation = formations[formationName];
      if (!formation || !formation.positions) {
        stats[formationName] = { occupiedPositions: 0, unassignedPlayers: 0 };
        return;
      }

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
            
            // Check each player role against each formation position. Roles are already
            // Mantra codes matching the formation's own vocabulary - no translation needed
            // (see translateRoleToItalian's comment for why that translation was buggy).
            roles.forEach(role => {
              let roleMatched = false;

              formationPositions.forEach(position => {
                if (position.roles.some(formationRole => formationRole.toLowerCase() === role.toLowerCase())) {
                  roleMatched = true;
                }
              });

              if (roleMatched) {
                possibleRoles.push({
                  role: role,
                  originalRole: role
                });
              } else {
                unusedRoles.push({
                  role: role,
                  originalRole: role
                });
              }
            });
          } catch (error) {
            console.warn('Error parsing Ruolo Mantra for player:', playerDetail.Nome, error);
          }
        } else if (playerDetail.Ruolo) {
          const mappedRole = playerDetail.Ruolo;

          // Check if this role matches any formation position
          let roleMatched = false;
          formationPositions.forEach(position => {
            if (position.roles.some(formationRole => formationRole.toLowerCase() === mappedRole.toLowerCase())) {
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
              const score = playerData.player['FVM'] || 0;
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
      
      
      
      
      
    });
    
    // Cache the calculated stats
    setCachedData(CACHE_CONFIG.FORMATION_STATS, stats, cacheKey);
    
    return stats;
  }, [selectedTeam, teamPlayers, formations, appetibilitaData, players]); // Only recalculate when team players change

  // Get cached formation data for the selected formation (no recalculation needed) - memoized for performance
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
          // Prefer the player's most defensive eligible role for this slot (highest
          // appetibilita) - e.g. a player eligible for both A and Pc defaults to A,
          // keeping the rarer Pc role open for a player who can *only* play Pc.
          const bestRole = applicableRoles.sort((a, b) => b.ranking - a.ranking)[0];
          
          return {
            playerData,
            bestRole,
            appetibilita: bestRole.ranking,
            fpediaScore: parseFloat(playerData.player['FVM'] || 0)
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
    
    
    
    // Calculate occupied positions from actual formation box data (exclude UNUSED)
    const occupiedPositions = Object.keys(playersByRole)
      .filter(role => role !== 'UNUSED')
      .reduce((total, role) => total + (playersByRole[role]?.length || 0), 0);
    
    
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
  }, [selectedTeam, players, getFormationRoles, getPlayerRole, formations, selectedFormation, appetibilitaData, translateRoleToItalian, allFormationStats]);

  // Helper function to get formation stats for any formation - delegates to the shared scoring
  // util (src/utils/formationScoring.js) so this stays in sync with FantamilioniBar's copy.
  const getFormationStats = useCallback((formationName) => {
    return computeFormationStats(selectedTeam, formationName, formations, players, appetibilitaData, getPlayerRole, translateRoleToItalian);
  }, [selectedTeam, formations, players, appetibilitaData, getPlayerRole, translateRoleToItalian]);

  const handleTeamSelection = useCallback((teamId) => {
    setSelectedTeamId(teamId);
  }, []);

  // Compute formation rankings using UI's existing calculation logic (without debug)
  useEffect(() => {
    if (Object.keys(formations).length > 0) {
      // Try to get cached rankings first
      const cacheKey = `team_${selectedTeam?.id || 'none'}_players_${teamPlayers.length}`;
      const cachedRankings = getCachedData(CACHE_CONFIG.FORMATION_RANKINGS, cacheKey);
      if (cachedRankings) {
        setFormationRankings(cachedRankings);
        return;
      }
      // Use the shared scoring util for each formation
      const rankings = Object.keys(formations).map(formationCode => {
        const stats = getFormationStats(formationCode);
        const { score, breakdown } = computeFormationScore(stats);

        return {
          code: formationCode,
          score,
          breakdown: {
            ...breakdown,
            occupiedPositions: stats.occupiedPositions,
            unassignedPlayers: stats.unassignedPlayers,
            cappedReserveCredits: stats.cappedReserveCredits,
            maxReserveCredits: stats.maxReserveCredits
          }
        };
      });
      
      // Sort by score descending
      rankings.sort((a, b) => b.score - a.score);
      
      // Cache the calculated rankings
      setCachedData(CACHE_CONFIG.FORMATION_RANKINGS, rankings, cacheKey);
      
      setFormationRankings(rankings);
    }
  }, [teamPlayers, formations, getFormationStats, selectedTeam?.players?.length, selectedTeam?.id]);

  // Helper function to group formations by their starting number (3 vs 4) and sort by ranking - memoized
  const getGroupedFormations = useMemo(() => {
    const formationsList = Object.keys(formations);
    const formations3 = formationsList.filter(f => f.startsWith('3-'));
    const formations4 = formationsList.filter(f => f.startsWith('4-'));
    
    // Sort by ranking score (highest first)
    const sortByRanking = (formationList) => {
      return formationList.sort((a, b) => {
        const rankingA = formationRankings.find(r => r.code === a);
        const rankingB = formationRankings.find(r => r.code === b);
        
        if (rankingA && rankingB) {
          return rankingB.score - rankingA.score; // Descending order (highest score first)
        } else if (rankingA) {
          return -1; // A has ranking, B doesn't - A comes first
        } else if (rankingB) {
          return 1; // B has ranking, A doesn't - B comes first
        } else {
          return a.localeCompare(b); // Fallback to alphabetical
        }
      });
    };
    
    return {
      formations3: sortByRanking(formations3),
      formations4: sortByRanking(formations4)
    };
  }, [formations, formationRankings]);

  // Helper function to render formation buttons - compact (code + score only) so the whole
  // set fits on one row; occupied/unusable/usable counts move to the hover tooltip instead of
  // a second line, which is what used to force these onto two wrapped rows.
  const renderFormationButtons = useCallback((formationList) => {
    return formationList.map(formation => {
      const stats = getFormationStats(formation);
      const ranking = formationRankings.find(r => r.code === formation);

      return (
        <button
          key={formation}
          onClick={() => setSelectedFormation(formation)}
          style={selectedFormation === formation ? formationButtonActiveStyle : formationButtonStyle}
          title={`${stats.occupiedPositions} occupate · ${stats.unassignedPlayers} non utilizzabili · riserve ${stats.cappedReserveCredits}/${stats.maxReserveCredits}`}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
            <span>{formation}</span>
            {ranking && (
              <span style={{
                fontSize: '0.65rem',
                fontWeight: 'bold',
                color: ranking.score >= SCORE_THRESHOLDS.good ? theme.success : ranking.score >= SCORE_THRESHOLDS.ok ? theme.warning : theme.danger,
                backgroundColor: ranking.score >= SCORE_THRESHOLDS.good ? 'rgba(52, 211, 153, 0.16)' : ranking.score >= SCORE_THRESHOLDS.ok ? 'rgba(251, 191, 36, 0.16)' : 'rgba(248, 113, 113, 0.16)',
                padding: '1px 4px',
                borderRadius: '3px'
              }}>
                {Math.round(ranking.score)}
              </span>
            )}
          </div>
        </button>
      );
    });
  }, [getFormationStats, selectedFormation, formationButtonActiveStyle, formationButtonStyle, formationRankings]);

  // Get reserve players with formation assignment logic (same as main formation but with unassigned players) - memoized
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

          // Check each player role against each formation position. Roles are already Mantra
          // codes matching the formation's vocabulary - no translation needed.
          roles.forEach(mappedRole => {
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
        // Prefer the player's most defensive eligible role for this slot (highest
        // appetibilita) - e.g. a player eligible for both A and Pc defaults to A,
        // keeping the rarer Pc role open for a player who can *only* play Pc.
        const bestRole = applicableRoles.sort((a, b) => b.ranking - a.ranking)[0];
        
        return {
          playerData,
          bestRole,
          appetibilita: bestRole.ranking,
          fpediaScore: parseFloat(playerData.player['FVM'] || 0)
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
  }, [selectedTeam, formations, selectedFormation, getPlayersByFormationRoles, players, appetibilitaData]);

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
                borderColor: isSelected ? theme.pink : colorCoding.colors.border,
                backgroundColor: isSelected ? theme.pinkSoft : colorCoding.colors.background,
                color: isSelected ? theme.pink : colorCoding.colors.text
              };


              return (
                <button
                  key={team.id}
                  onClick={() => handleTeamSelection(team.id)}
                  style={buttonStyle}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <span>{team.name}</span>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem' }}>
                      <span style={{ color: theme.success, fontWeight: 'bold' }}>
                        {playerCount}
                      </span>
                      <span style={{
                        color: remainingBudget <= 0 || playerCount >= maxPlayers ? theme.danger : theme.text,
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
          const { formations3, formations4 } = getGroupedFormations;
          return (
            <div style={groupedFormationSelectorStyle}>
              {renderFormationButtons(formations3)}
              {formations3.length > 0 && formations4.length > 0 && (
                <div style={formationGroupDividerStyle} />
              )}
              {renderFormationButtons(formations4)}
            </div>
          );
        })()}


        <div style={emptyStateStyle}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>😔</div>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: theme.text,
            marginBottom: '1rem'
          }}>
            Nessun giocatore acquistato
          </h2>
          <p style={{
            color: theme.textMuted,
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
              borderColor: isSelected ? theme.pink : colorCoding.colors.border,
              backgroundColor: isSelected ? theme.pinkSoft : colorCoding.colors.background,
              color: isSelected ? theme.pink : colorCoding.colors.text
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
                      <span style={{ color: theme.success, fontWeight: 'bold' }}>
                      {playerCount}
                      </span>
                    <span style={{
                      color: remainingBudget <= 0 || playerCount >= maxPlayers ? theme.danger : theme.text,
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
        const { formations3, formations4 } = getGroupedFormations;
              return (
          <div style={groupedFormationSelectorStyle}>
            {renderFormationButtons(formations3)}
            {formations3.length > 0 && formations4.length > 0 && (
              <div style={formationGroupDividerStyle} />
            )}
            {renderFormationButtons(formations4)}
          </div>
        );
      })()}

        {/* Formation Display: 3-column "eagle eye" layout - Rosa | Formazione | Riserve, so
            the whole squad, the tactical picture and the bench are all visible at once. */}
        {formations[selectedFormation] && (() => {
          const ranking = formationRankings.find(r => r.code === selectedFormation);
          const findAssignedPlayer = (positionIndex) => {
            const assignment = getPlayersByFormationRoles.positionAssignments
              ? Object.values(getPlayersByFormationRoles.positionAssignments).find(a => a.positionIndex === positionIndex)
              : null;
            if (!assignment) return null;
            return getPlayersByFormationRoles.playersByRole[assignment.role]?.find(p => p.positionIndex === positionIndex) || null;
          };

          return (
        <div style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'stretch',
          flexDirection: windowWidth <= 768 ? 'column' : 'row'
        }}>

          {/* Rosa Column - the whole acquired squad at a glance, grouped by role category */}
          <div style={{
            minWidth: windowWidth <= 768 ? '100%' : '200px',
            maxWidth: windowWidth <= 768 ? '100%' : '215px',
            backgroundColor: theme.surface,
            borderRadius: '0.5rem',
            padding: '0.75rem',
            border: `1px solid ${theme.border}`,
            maxHeight: windowWidth <= 768 ? 'none' : '640px',
            overflowY: 'auto'
          }}>
            <h3 style={{ textAlign: 'center', marginBottom: '0.5rem', fontSize: '1rem', fontWeight: '600', color: theme.text }}>
              Rosa ({rosterSorted.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {rosterSorted.length === 0 && (
                <div style={{ textAlign: 'center', color: theme.textFaint, fontSize: '0.8rem', padding: '1rem 0' }}>
                  Nessun giocatore
                </div>
              )}
              {rosterSorted.map(player => {
                let playerRoles = [];
                if (player['Ruolo Mantra']) {
                  try {
                    playerRoles = JSON.parse(player['Ruolo Mantra'].replace(/'/g, '"'));
                  } catch (e) {
                    playerRoles = [player['Ruolo Mantra']];
                  }
                } else if (player.Ruolo) {
                  playerRoles = [player.Ruolo];
                }

                return (
                  <div key={player.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.25rem 0.375rem',
                    backgroundColor: theme.surfaceAlt,
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                      {playerRoles.map((role, idx) => (
                        <span key={idx} style={{
                          backgroundColor: roleColorMapping[role] || theme.textMuted,
                          color: 'white',
                          fontSize: '0.6rem',
                          fontWeight: '700',
                          padding: '1px 4px',
                          borderRadius: '4px'
                        }}>
                          {role}
                        </span>
                      ))}
                    </div>
                    <span
                      onClick={() => navigate(`/player/${player.player_id}`)}
                      title={player.Nome}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        color: theme.blue,
                        fontWeight: '600'
                      }}
                    >
                      {player.Nome}
                    </span>
                    <span style={{ color: theme.textMuted, fontWeight: '600', flexShrink: 0 }}>
                      {player.fantamilioni} FM
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Formation Column - depth chart, one row per role category */}
          <div style={{
            ...formationDisplayStyle,
            flex: 2,
            display: 'flex',
            flexDirection: 'column',
            width: windowWidth <= 768 ? '100%' : 'auto'
          }}>
            <div style={{ marginBottom: '0.75rem' }}>
              <h3 style={{ textAlign: 'center', marginBottom: '0.25rem', fontSize: '1.1rem', fontWeight: '600', color: theme.text }}>
                Formazione {selectedFormation}
                {ranking && (
                  <span style={{
                    marginLeft: '0.5rem',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    color: ranking.score >= SCORE_THRESHOLDS.good ? theme.success : ranking.score >= SCORE_THRESHOLDS.ok ? theme.warning : theme.danger,
                    backgroundColor: ranking.score >= SCORE_THRESHOLDS.good ? 'rgba(52, 211, 153, 0.16)' : ranking.score >= SCORE_THRESHOLDS.ok ? 'rgba(251, 191, 36, 0.16)' : 'rgba(248, 113, 113, 0.16)',
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}>
                    Score: {Math.round(ranking.score)}
                  </span>
                )}
              </h3>
              <div style={{ textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.75rem' }}>
                <span style={{ color: theme.success, fontWeight: 'bold' }}>
                  {getPlayersByFormationRoles.occupiedPositions}/11 occupate
                </span>
                <span style={{ color: theme.danger, fontWeight: 'bold' }}>
                  {getPlayersByFormationRoles.unassignedPlayers} non utilizzabili
                </span>
                <span style={{ color: theme.text, fontWeight: 'bold' }}>
                  {getPlayersByFormationRoles.totalUsablePlayers} utilizzabili
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {getFormationDepthRows.map(row => (
                <div key={row.key} style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '0.625rem' }}>
                  {row.slots.map(slot => {
                    const assignedPlayer = findAssignedPlayer(slot.positionIndex);
                    return (
                      <div key={slot.positionIndex} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={getPositionStyle(slot)}>{slot.role}</span>
                        <div style={{
                          padding: '0.2rem 0.4rem',
                          backgroundColor: theme.surfaceAlt,
                          border: `1px solid ${theme.border}`,
                          borderRadius: '0.375rem',
                          fontSize: '0.7rem',
                          textAlign: 'center',
                          minWidth: '64px',
                          maxWidth: '104px',
                          minHeight: '1.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {assignedPlayer ? (
                            <span
                              onClick={() => navigate(`/player/${assignedPlayer.player_id}`)}
                              title="Click to view player details"
                              style={{ cursor: 'pointer', color: theme.blue, fontWeight: '600' }}
                            >
                              {assignedPlayer.Nome} <span style={{ color: theme.textFaint, fontWeight: '400' }}>({assignedPlayer.fantamilioni} FM)</span>
                            </span>
                          ) : (
                            <span style={{ color: theme.textFaint, fontStyle: 'italic' }}>vuoto</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Riserve Column */}
          <div style={{
            minWidth: windowWidth <= 768 ? '100%' : '225px',
            maxWidth: windowWidth <= 768 ? '100%' : '240px',
            backgroundColor: theme.surface,
            borderRadius: '0.5rem',
            padding: '0.75rem',
            border: `1px solid ${theme.border}`,
            maxHeight: windowWidth <= 768 ? 'none' : '640px',
            overflowY: 'auto'
          }}>
            <h3 style={{
              textAlign: 'center',
              marginBottom: '0.5rem',
              fontSize: '1rem',
              fontWeight: '600',
              color: theme.text
            }}>
              Riserve ({(() => {
                const currentFormation = formations[selectedFormation];
                if (!currentFormation || !currentFormation.positions) return '0/11';

                const reservePlayersByRole = getReservePlayers.playersByRole || {};
                const assignedPlayerIds = new Set();
                currentFormation.positions.forEach(positionRoles => {
                  positionRoles.forEach(role => {
                    if (reservePlayersByRole[role]) {
                      reservePlayersByRole[role].forEach(player => {
                        assignedPlayerIds.add(player.id);
                      });
                    }
                  });
                });

                return `${assignedPlayerIds.size}/11`;
              })()})
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {(() => {
                const currentFormation = formations[selectedFormation];
                if (!currentFormation || !currentFormation.positions) {
                  return (
                    <div style={{ textAlign: 'center', color: theme.textMuted, fontSize: '0.8rem', padding: '1.5rem 0.5rem' }}>
                      Nessuna formazione selezionata
                    </div>
                  );
                }

                const reservePlayersByRole = getReservePlayers.playersByRole || {};
                const assignedPlayerIds = new Set();

                return currentFormation.positions.map((positionRoles, positionIndex) => {
                  const playersInPosition = [];
                  positionRoles.forEach(role => {
                    if (reservePlayersByRole[role]) {
                      reservePlayersByRole[role].forEach(player => {
                        if (!assignedPlayerIds.has(player.id)) {
                          playersInPosition.push(player);
                          assignedPlayerIds.add(player.id);
                        }
                      });
                    }
                  });

                  return (
                    <div key={`position-${positionIndex}`} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      padding: '0.25rem 0.375rem',
                      backgroundColor: theme.surfaceAlt,
                      borderRadius: '0.25rem',
                      fontSize: '0.7rem'
                    }}>
                      <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                        {positionRoles.map((role, roleIndex) => {
                          const roleInfoForRole = getRoleInfo(role);
                          return (
                            <span key={roleIndex} style={{
                              padding: '1px 4px',
                              backgroundColor: roleInfoForRole.color,
                              color: 'white',
                              borderRadius: '4px',
                              fontSize: '0.6rem',
                              fontWeight: '700'
                            }}>
                              {roleInfoForRole.italian}
                            </span>
                          );
                        })}
                      </div>
                      {playersInPosition.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                          {playersInPosition.map((player, playerIndex) => (
                            <span
                              key={`${positionIndex}-${playerIndex}`}
                              onClick={() => navigate(`/player/${player.player_id}`)}
                              title="Click to view player details"
                              style={{
                                fontWeight: '600',
                                color: theme.blue,
                                cursor: 'pointer',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {player.Nome}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: theme.textFaint, fontStyle: 'italic' }}>Nessun giocatore</span>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
          );
        })()}

      {/* Unused Roles Box - Outside Formation Display */}
      {formations[selectedFormation] && getPlayersByFormationRoles.playersByRole && getPlayersByFormationRoles.playersByRole['UNUSED'] &&
           getPlayersByFormationRoles.playersByRole['UNUSED'].length > 0 && (
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem 1rem',
          backgroundColor: 'rgba(248, 113, 113, 0.08)',
          borderRadius: '0.5rem',
          border: `1px solid ${theme.danger}`
        }}>
          <div style={{
            fontSize: '0.8rem',
            fontWeight: '600',
            color: theme.danger,
            marginBottom: '0.5rem',
            textAlign: 'center'
          }}>
            Giocatori con ruoli non utilizzati in questa formazione
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            justifyContent: 'center'
          }}>
            {getPlayersByFormationRoles.playersByRole['UNUSED'].map((player, index) => (
              <div
                key={index}
                style={{
                  padding: '0.25rem 0.625rem',
                  backgroundColor: theme.surface,
                  borderRadius: '999px',
                  border: `1px solid ${theme.danger}`,
                  cursor: 'pointer',
                  color: theme.blue,
                  fontSize: '0.8rem'
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
            color: theme.text,
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
                  border: `1px solid ${theme.border}`,
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  minWidth: '200px',
                  backgroundColor: theme.surfaceAlt,
                  color: theme.text
                }}
              />
            </div>

            {/* Role Filter Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
              {availableRolesForFilter.map(role => {
                const isSelected = selectedRoles.includes(role);
                const roleColor = roleColorMapping[role] || theme.textMuted;

                return (
                  <button
                    key={role}
                    onClick={() => toggleRole(role)}
                    style={{
                      padding: '0.5rem 1rem',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      border: `2px solid ${roleColor}`,
                      borderRadius: '0.375rem',
                      backgroundColor: isSelected ? roleColor : 'transparent',
                      color: isSelected ? 'white' : roleColor,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      minWidth: '40px',
                      textAlign: 'center'
                    }}
                    title={role}
                  >
                    {role}
                  </button>
                );
              })}
              <span style={{ fontSize: '0.875rem', color: theme.textMuted, marginLeft: '1rem' }}>
                {filteredTeamPlayers.length} giocatori trovati
              </span>
                </div>
              </div>

          {/* Table - header stays pinned (position: sticky) while the list scrolls. The inner
              scroll div is what makes that work: without a bounded height + overflowY: 'auto'
              here, this would just be an unbounded box the page scrolls past, and the sticky
              header would have nothing to actually stick within. */}
          <div style={{
            backgroundColor: theme.surface,
            borderRadius: '0.5rem',
            border: `1px solid ${theme.border}`,
            overflow: 'hidden'
          }}>
            <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: theme.surfaceAlt }}>
                  {windowWidth > 768 && (
                  <th style={{
                    padding: '0.75rem',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: theme.text,
                    borderBottom: `1px solid ${theme.border}`,
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                    backgroundColor: theme.surfaceAlt
                  }}>
                    Azioni
                  </th>
                  )}
                  <th style={{
                    padding: windowWidth <= 768 ? '0.5rem' : '0.75rem',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: theme.text,
                    borderBottom: `1px solid ${theme.border}`,
                    fontSize: windowWidth <= 768 ? '0.75rem' : '1rem',
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                    backgroundColor: theme.surfaceAlt
                  }}>
                    Nome
                  </th>
                  {windowWidth > 768 && (
                  <th
                    style={{
                      padding: '0.75rem',
                      textAlign: 'left',
                      fontWeight: '600',
                      color: theme.text,
                      borderBottom: `1px solid ${theme.border}`,
                      cursor: 'pointer',
                      userSelect: 'none',
                      position: 'sticky',
                      top: 0,
                      zIndex: 2,
                      backgroundColor: theme.surfaceAlt
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
                      color: theme.text,
                      borderBottom: `1px solid ${theme.border}`,
                      cursor: 'pointer',
                      userSelect: 'none',
                      fontSize: windowWidth <= 768 ? '0.75rem' : '1rem',
                      position: 'sticky',
                      top: 0,
                      zIndex: 2,
                      backgroundColor: theme.surfaceAlt
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
                      textAlign: 'right',
                      fontWeight: '600',
                      color: theme.text,
                      borderBottom: `1px solid ${theme.border}`,
                      position: 'sticky',
                      top: 0,
                      zIndex: 2,
                      backgroundColor: theme.surfaceAlt
                    }}
                  >
                    FVM
                  </th>
                  )}
                  <th
                    style={{
                      padding: windowWidth <= 768 ? '0.5rem' : '0.75rem',
                      textAlign: 'right',
                      fontWeight: '600',
                      color: theme.text,
                      borderBottom: `1px solid ${theme.border}`,
                      cursor: 'pointer',
                      userSelect: 'none',
                      fontSize: windowWidth <= 768 ? '0.75rem' : '1rem',
                      position: 'sticky',
                      top: 0,
                      zIndex: 2,
                      backgroundColor: theme.surfaceAlt
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
                      borderBottom: index === filteredTeamPlayers.length - 1 ? 'none' : `1px solid ${theme.borderSoft}`
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme.surfaceHover;
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
                          border: `1px solid ${theme.danger}`,
                          borderRadius: '0.25rem',
                          color: theme.danger,
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = theme.danger;
                          e.target.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = 'transparent';
                          e.target.style.color = theme.danger;
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
                      color: theme.blue,
                      fontSize: windowWidth <= 768 ? '0.75rem' : '1rem',
                      cursor: 'pointer'
                    }}
                    onClick={() => navigate(`/player/${player.player_id}`)}
                    title="Click to view player details">
                      {player.Nome}
                    </td>
                    {windowWidth > 768 && (
                    <td style={{ padding: '0.75rem', color: theme.textMuted }}>
                      {player.Squadra}
                    </td>
                    )}
                    <td style={{ 
                      padding: windowWidth <= 768 ? '0.5rem' : '0.75rem'
                    }}>
                        {(() => {
                        // Parse the Ruolo Mantra field for display - EXACT COPY FROM GIOCATORI TAB
                        let roles = [];
                          if (player['Ruolo Mantra']) {
                            if (Array.isArray(player['Ruolo Mantra'])) {
                            roles = player['Ruolo Mantra'];
                            } else if (typeof player['Ruolo Mantra'] === 'string') {
                              try {
                                const jsonString = player['Ruolo Mantra'].replace(/'/g, '"');
                              roles = JSON.parse(jsonString);
                              } catch (e) {
                              roles = [player['Ruolo Mantra']];
                              }
                            } else {
                            roles = [player['Ruolo Mantra']];
                          }
                        } else if (player.Ruolo) {
                          // Fallback to regular Ruolo field if Ruolo Mantra is not available
                          roles = [player.Ruolo];
                        }
                        
                        return roles.length > 0 ? (
                          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                            {roles.map((role, idx) => (
                              <span key={idx} style={{
                                padding: '0.125rem 0.375rem',
                                backgroundColor: roleColorMapping[role] || theme.textMuted,
                                borderRadius: '0.25rem',
                                fontSize: '0.75rem',
                                color: 'white',
                                fontWeight: '600'
                              }}>
                                {role}
                              </span>
                            ))}
                    </div>
                        ) : (
                          <span style={{ color: theme.textFaint }}>-</span>
                        );
                      })()}
                    </td>
                    {windowWidth > 768 && (
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: theme.text }}>
                      {player.FVM ?? '-'}
                    </td>
                    )}
                    <td style={{
                      padding: windowWidth <= 768 ? '0.5rem' : '0.75rem',
                      textAlign: 'right',
                      fontWeight: '500',
                      color: theme.text,
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
            </div>
      )}
    </div>
  );
};

export default React.memo(RosaAcquistata);
