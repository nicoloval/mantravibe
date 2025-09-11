import React, { useState, useMemo } from 'react';

const MantraGiocatoriTab = ({ players = [], playerStatus = {}, onPlayerStatusChange, onPlayerAcquire, roles = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoles, setSelectedRoles] = useState(() => {
    // Try to load from localStorage first
    const savedRoles = localStorage.getItem('giocatoriSelectedRoles');
    if (savedRoles) {
      try {
        return JSON.parse(savedRoles);
      } catch (error) {
        console.error('Error parsing saved roles:', error);
      }
    }
    return [];
  });
  const [selectedSkills, setSelectedSkills] = useState(() => {
    // Try to load from localStorage first
    const savedSkills = localStorage.getItem('giocatoriSelectedSkills');
    if (savedSkills) {
      try {
        return JSON.parse(savedSkills);
      } catch (error) {
        console.error('Error parsing saved skills:', error);
      }
    }
    return [];
  });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [hideAcquired, setHideAcquired] = useState(() => {
    // Try to load from localStorage first
    const savedHideAcquired = localStorage.getItem('giocatoriHideAcquired');
    if (savedHideAcquired !== null) {
      try {
        return JSON.parse(savedHideAcquired);
      } catch (error) {
        console.error('Error parsing saved hideAcquired:', error);
      }
    }
    return false;
  });
  
  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState(() => {
    // Try to load from localStorage first
    const savedColumns = localStorage.getItem('giocatoriVisibleColumns');
    if (savedColumns) {
      try {
        return new Set(JSON.parse(savedColumns));
      } catch (error) {
        console.error('Error parsing saved columns:', error);
      }
    }
    // Default: only Name, Squadra and Ruolo Mantra visible (minimum configuration)
    const defaultVisible = new Set(['Nome', 'Squadra', 'Ruolo Mantra']);
    return defaultVisible;
  });
  
  // Column controls visibility state
  const [showColumnControls, setShowColumnControls] = useState(false);
  
  // Tooltip visibility state
  const [visibleTooltip, setVisibleTooltip] = useState(null);

  // Create role mapping from roles.csv
  const roleMapping = useMemo(() => {
    const mapping = {};
    roles.forEach(role => {
      mapping[role.Role] = role.Ruolo;
    });
    return mapping;
  }, [roles]);

  // Create role color mapping from roles.csv
  const roleColorMapping = useMemo(() => {
    const colorNameToHex = {
      'Orange': '#f97316',
      'Green': '#22c55e', 
      'Blue': '#3b82f6',
      'Purple': '#a855f7',
      'Red': '#ef4444'
    };
    
    const mapping = {};
    
    // Map roles.csv roles using Italian role names (Ruolo column)
    roles.forEach(role => {
      console.log('🔍 Raw role object:', role);
      const hexColor = colorNameToHex[role.Color] || '#6b7280';
      mapping[role.Ruolo] = hexColor; // Use Italian role name as key
      console.log(`🎨 Role ${role.Role} (${role.Ruolo}): "${role.Color}" -> ${hexColor}`);
    });
    
    // Fallback mapping based on roles.csv structure when Color field is empty
    if (Object.values(mapping).every(color => color === '#6b7280')) {
      console.log('🎨 Using fallback color mapping due to empty Color fields');
      const fallbackMapping = {
        'P': '#f97316',    // G -> Orange
        'Dc': '#22c55e',   // CB -> Green
        'B': '#22c55e',    // LA -> Green
        'Dd': '#22c55e',   // RB -> Green
        'Ds': '#22c55e',   // LB -> Green
        'E': '#3b82f6',    // E -> Blue
        'M': '#3b82f6',    // DM -> Blue
        'C': '#3b82f6',    // M -> Blue
        'W': '#a855f7',    // W -> Purple
        'T': '#a855f7',    // OM -> Purple
        'A': '#ef4444',    // F -> Red
        'Pc': '#ef4444'    // CF -> Red
      };
      
      // Apply fallback mapping
      Object.keys(fallbackMapping).forEach(italianRole => {
        mapping[italianRole] = fallbackMapping[italianRole];
      });
    }
    
    console.log('🎨 Final role color mapping (Italian keys):', mapping);
    return mapping;
  }, [roles]);

  // Enhanced role mapping that includes formation roles
  const enhancedRoleMapping = useMemo(() => {
    const mapping = {};
    roles.forEach(role => {
      mapping[role.Role] = role.Ruolo;
    });
    return mapping;
  }, [roles]);

  // Get all available roles from roles.csv (first column) in CSV order
  const availableRoles = useMemo(() => {
    // Use all roles from the roles.csv file (first column) in the order they appear in CSV
    return roles.map(role => role.Role);
  }, [roles]);

  // Get all available skills from players data
  const availableSkills = useMemo(() => {
    const skillsSet = new Set();
    players.forEach(player => {
      if (player.Skills) {
        let skills = [];
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
        skills.forEach(skill => skillsSet.add(skill));
      }
    });
    
    const skillsArray = Array.from(skillsSet).sort();
    console.log('🎯 Available skills found:', skillsArray);
    return skillsArray;
  }, [players]);

  // Toggle role selection
  const toggleRole = (role) => {
    setSelectedRoles(prev => {
      let newRoles;
      if (prev.includes(role)) {
        newRoles = prev.filter(r => r !== role);
      } else {
        newRoles = [...prev, role];
      }
      // Save to localStorage
      localStorage.setItem('giocatoriSelectedRoles', JSON.stringify(newRoles));
      return newRoles;
    });
  };

  // Toggle skill selection
  const toggleSkill = (skill) => {
    setSelectedSkills(prev => {
      let newSkills;
      if (prev.includes(skill)) {
        newSkills = prev.filter(s => s !== skill);
      } else {
        newSkills = [...prev, skill];
      }
      // Save to localStorage
      localStorage.setItem('giocatoriSelectedSkills', JSON.stringify(newSkills));
      return newSkills;
    });
  };

  // Filter and sort players
  const filteredAndSortedPlayers = useMemo(() => {
    // Debug logging for playerStatus
    if (hideAcquired) {
      console.log('🔍 DEBUG: playerStatus object:', playerStatus);
      console.log('🔍 DEBUG: hideAcquired is:', hideAcquired);
    }
    
    let filtered = players.filter(player => {
      const matchesSearch = !searchTerm || 
        player.Nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.Squadra?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = selectedRoles.length === 0 || (() => {
        // Parse the Ruolo Mantra field for filtering
        let roles = [];
        if (player['Ruolo Mantra']) {
          if (Array.isArray(player['Ruolo Mantra'])) {
            // It's already an array
            roles = player['Ruolo Mantra'];
          } else if (typeof player['Ruolo Mantra'] === 'string') {
            // It's a string that needs to be parsed, replace single quotes with double quotes
            try {
              const jsonString = player['Ruolo Mantra'].replace(/'/g, '"');
              roles = JSON.parse(jsonString);
            } catch (e) {
              console.warn('Failed to parse Ruolo Mantra string after quote replacement:', player['Ruolo Mantra'], e);
              roles = [player['Ruolo Mantra']]; // Fallback
            }
          } else {
            // Fallback for other types
            roles = [player['Ruolo Mantra']];
          }
        }
        
        // Check if player has ALL of the selected roles (intersection)
        return selectedRoles.every(selectedRole => roles.includes(selectedRole));
      })();

      const matchesSkills = selectedSkills.length === 0 || (() => {
        // Parse the Skills field for filtering
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
        
        // Check if player has any of the selected skills
        return selectedSkills.every(selectedSkill => skills.includes(selectedSkill));
      })();
      
      // Filter out acquired players if hideAcquired is true
      const playerStatusValue = playerStatus[player.player_id];
      const isNotAcquired = !hideAcquired || !playerStatusValue || (playerStatusValue && playerStatusValue.status !== 'acquired');
      
      // Debug logging
      if (hideAcquired) {
        console.log('🔍 DEBUG: Player:', player.Nome, 'ID:', player.player_id, 'Status:', playerStatusValue, 'Will show:', isNotAcquired);
      }
      
      return matchesSearch && matchesRole && matchesSkills && isNotAcquired;
    });
    

    // Sort players
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        // Handle different data types
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        } else if (typeof aVal === 'number' && typeof bVal === 'number') {
          // Numbers are fine as is
        } else {
          // Convert to string for comparison, handle null/undefined values
          aVal = String(aVal || '');
          bVal = String(bVal || '');
        }

        if (aVal < bVal) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [players, searchTerm, selectedRoles, selectedSkills, sortConfig, hideAcquired, playerStatus]);

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };



  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const getPlayerStatus = (playerId) => {
    return playerStatus[playerId]?.status || 'available';
  };

  const getPlayerFantamilioni = (playerId) => {
    return playerStatus[playerId]?.fantamilioni || null;
  };

  const handleStatusChange = (playerId, status) => {
    onPlayerStatusChange(playerId, status);
  };

  const handleAcquire = (player) => {
    onPlayerAcquire(player);
  };

  // Function to create acronyms for column names
  const getColumnAcronym = (columnName) => {
    const acronyms = {
      'Nome': 'Nome',
      'Squadra': 'Squadra',
      'Ruolo Mantra': 'Ruolo',
      'Fantamedia 2025-2026': 'FM25',
      'Media 2025-2026': 'M25',
      'Punteggio FPEDIA': 'FP',
      'Convenienza Potenziale FPEDIA': 'CPF',
      'Convenienza FPEDIA': 'CF',
      'Trend': 'Trend',
      'Skills': 'Skills',
      'Buon Investimento': 'BI',
      'Resistenza Infortuni': 'RI',
      'Infortunato': 'Inf',
      'Presenze Previste': 'PP',
      'Gol Previsti': 'GP',
      'Assist Previsti': 'AP',
      'Nuovo Acquisto': 'NA',
      'Convenienza Potenziale FSTATS 2025-2026': 'CPF25',
      'Convenienza FSTATS 2025-2026': 'CF25',
      'Fantaindex  2025-2026': 'FI25',
      'Presenze 2025-2026': 'P25',
      'Minuti Giocati 2025-2026': 'MG25',
      'Gol 2025-2026': 'G25',
      'Assist 2025-2026': 'A25',
      'Goals90min 2025-2026': 'G90',
      'Goals From Open Plays 2025-2026': 'GOP',
      'Rigori 2025-2026': 'R25',
      'GK Penalties Saved 2025-2026': 'GPS',
      'GK Clean Sheets 2025-2026': 'GCS',
      'GK Conceded Goals 2025-2026': 'GCG',
      'Matches With Grade 2025-2026': 'MWG',
      'xA 2025-2026': 'xA25',
      'xG From Open Plays 2025-2026': 'xGOP',
      'xG From Open Plays/90min 2025-2026': 'xG90',
      'xA90min 2025-2026': 'xA90',
      'Ammonizioni 2025-2026': 'Amm',
      'Espulsioni 2025-2026': 'Esp',
      'Fantamedia 2024-2025': 'FM24',
      'Media 2024-2025': 'M24',
      'Presenze 2024-2025': 'P24',
      'Minuti Giocati 2024-2025': 'MG24',
      'Gol 2024': 'G24',
      'Assist 2024-2025': 'A24',
      'Goals90min 2024-2025': 'G90_24',
      'Goals From Open Plays 2024-2025': 'GOP24',
      'Rigori 2024-2025': 'R24',
      'GK Penalties Saved 2024-2025': 'GPS24',
      'GK Clean Sheets 2024-2025': 'GCS24',
      'GK Conceded Goals 2024-2025': 'GCG24',
      'Matches With Grade 2024-2025': 'MWG24',
      'xA 2024-2025': 'xA24',
      'xG From Open Plays 2024-2025': 'xGOP24',
      'xG From Open Plays/90min 2024-2025': 'xG90_24',
      'xA90min 2024-2025': 'xA90_24',
      'Ammonizioni 2024-2025': 'Amm24',
      'Espulsioni 2024-2025': 'Esp24'
    };
    
    return acronyms[columnName] || columnName.substring(0, 8);
  };

  // Helper function to check if data is missing (-1.00)
  const isMissingData = (value) => {
    return typeof value === 'number' && value === -1.00;
  };

  // Simple Tooltip component
  const Tooltip = ({ children, content, columnName }) => {
    const isVisible = visibleTooltip === columnName;
    
    return (
      <div 
        style={tooltipContainerStyle}
        onMouseEnter={() => setVisibleTooltip(columnName)}
        onMouseLeave={() => setVisibleTooltip(null)}
      >
        {children}
        {content && (
          <div style={isVisible ? tooltipVisibleStyle : tooltipStyle}>
            {content}
          </div>
        )}
      </div>
    );
  };

  // Column visibility control functions
  const toggleColumn = (columnName) => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnName)) {
        newSet.delete(columnName);
      } else {
        newSet.add(columnName);
      }
      // Save to localStorage
      localStorage.setItem('giocatoriVisibleColumns', JSON.stringify(Array.from(newSet)));
      return newSet;
    });
  };

  const toggleAllColumns = () => {
    const allColumns = getColumns();
    const allVisible = allColumns.every(col => visibleColumns.has(col));
    
    let newColumns;
    if (allVisible) {
      // If all are visible, set to minimum configuration
      newColumns = new Set(['Nome', 'Squadra', 'Ruolo Mantra']);
    } else {
      // If not all are visible, show all
      newColumns = new Set(allColumns);
    }
    setVisibleColumns(newColumns);
    // Save to localStorage
    localStorage.setItem('giocatoriVisibleColumns', JSON.stringify(Array.from(newColumns)));
  };

  const hideAllColumns = () => {
    // Hide all columns except the essential ones
    const essentialColumns = new Set(['Nome', 'Squadra', 'Ruolo Mantra']);
    setVisibleColumns(essentialColumns);
    // Save to localStorage
    localStorage.setItem('giocatoriVisibleColumns', JSON.stringify(Array.from(essentialColumns)));
  };

  // Get all possible columns from the first player
  const getColumns = () => {
    if (players.length === 0) return [];
    
    const firstPlayer = players[0];
    const excludeColumns = ['Ruolo Mantra', 'player_id']; // We'll handle these separately
    
    // MANUALLY DEFINE THE FIELDS TO DISPLAY HERE
    // You can customize this array to show only the fields you want
    const customFields = [
      'Nome',
      'Squadra', 
      'Fantamedia 2025-2026',
      'Media 2025-2026',
      'Punteggio FPEDIA',
      'Convenienza Potenziale FPEDIA',
      'Convenienza FPEDIA',
      'Trend',
      'Skills',
      'Buon Investimento',
      'Resistenza Infortuni',
      'Infortunato',
      'Presenze Previste',
      'Gol Previsti',
      'Assist Previsti',
      'Nuovo Acquisto',
      'Convenienza Potenziale FSTATS 2025-2026',
      'Convenienza FSTATS 2025-2026',
      'Fantaindex  2025-2026',
      'Presenze 2025-2026',
      'Minuti Giocati 2025-2026',
      'Gol 2025-2026',
      'Assist 2025-2026',
      'Goals90min 2025-2026',
      'Goals From Open Plays 2025-2026',
      'Rigori 2025-2026',
      'GK Penalties Saved 2025-2026',
      'GK Clean Sheets 2025-2026',
      'GK Conceded Goals 2025-2026',
      'Matches With Grade 2025-2026',
      'xA 2025-2026',
      'xG From Open Plays 2025-2026',
      'xG From Open Plays/90min 2025-2026',
      'xA90min 2025-2026',
      'Ammonizioni 2025-2026',
      'Espulsioni 2025-2026',
      'Fantamedia 2024-2025',
      'Media 2024-2025',
      'Presenze 2024-2025',
      'Minuti Giocati 2024-2025',
      'Gol 2024',
      'Assist 2024-2025',
      'Goals90min 2024-2025',
      'Goals From Open Plays 2024-2025',
      'Rigori 2024-2025',
      'GK Penalties Saved 2024-2025',
      'GK Clean Sheets 2024-2025',
      'GK Conceded Goals 2024-2025',
      'Matches With Grade 2024-2025',
      'xA 2024-2025',
      'xG From Open Plays 2024-2025',
      'xG From Open Plays/90min 2024-2025',
      'xA90min 2024-2025',
      'Ammonizioni 2024-2025',
      'Espulsioni 2024-2025'
    ];
    
    // Filter to only show fields that exist in the data and are in our custom list
    const filteredFields = customFields.filter(field => 
      firstPlayer.hasOwnProperty(field) && !excludeColumns.includes(field)
    );
    
    // Add 'Ruolo Mantra' to the available columns (but display as 'Ruolo')
    return ['Ruolo Mantra', ...filteredFields];
  };

  const columns = getColumns();

  // Stili
  const containerStyle = {
    padding: '2rem',
    maxWidth: '1400px',
    margin: '0 auto'
  };

  const filtersStyle = {
    display: 'flex',
    gap: '1rem',
    marginBottom: '2rem',
    alignItems: 'center',
    flexWrap: 'wrap'
  };

  const inputStyle = {
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    minWidth: '200px'
  };

  const selectStyle = {
    ...inputStyle,
    minWidth: '150px'
  };

  const tableContainerStyle = {
    backgroundColor: 'white',
    borderRadius: '0.5rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    overflow: 'visible',
    maxWidth: '100%',
    position: 'relative',
    zIndex: 1,
    paddingTop: '50px' // Add space at top for tooltips
  };

  const tableWrapperStyle = {
    overflowX: 'auto',
    overflowY: 'visible',
    maxWidth: '100%'
  };

  const tableStyle = {
    width: '100%',
    minWidth: '800px', // Much more compact table
    borderCollapse: 'collapse'
  };

  const thStyle = {
    backgroundColor: '#f8fafc',
    padding: '0.5rem 0.375rem',
    textAlign: 'left',
    fontWeight: '600',
    color: '#374151',
    borderBottom: '1px solid #e5e7eb',
    cursor: 'pointer',
    userSelect: 'none',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    minWidth: '60px', // Much smaller minimum width
    whiteSpace: 'nowrap',
    fontSize: '0.75rem'
  };

  const tdStyle = {
    padding: '0.5rem 0.375rem',
    borderBottom: '1px solid #f3f4f6',
    fontSize: '0.75rem',
    minWidth: '60px', // Much smaller minimum width
    whiteSpace: 'nowrap'
  };

  // Special styles for name column (wider)
  const nameThStyle = {
    ...thStyle,
    minWidth: '180px',
    fontSize: '0.875rem'
  };

  const nameTdStyle = {
    ...tdStyle,
    minWidth: '180px',
    fontSize: '0.875rem'
  };

  // Style for missing data cells (-1.00 values)
  const missingDataTdStyle = {
    ...tdStyle,
    backgroundColor: '#fef2f2', // Light red background
    color: '#dc2626' // Darker red text
  };

  // Simple tooltip styles
  const tooltipContainerStyle = {
    position: 'relative',
    display: 'inline-block',
    zIndex: 1
  };

  const tooltipStyle = {
    visibility: 'hidden',
    width: 'max-content',
    maxWidth: '250px',
    backgroundColor: '#1f2937',
    color: '#fff',
    textAlign: 'center',
    borderRadius: '4px',
    padding: '6px 10px',
    position: 'absolute',
    zIndex: 99999,
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginBottom: '5px',
    fontSize: '0.7rem',
    fontWeight: '500',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
    opacity: 0,
    transition: 'opacity 0.2s, visibility 0.2s',
    pointerEvents: 'none',
    whiteSpace: 'nowrap'
  };

  const tooltipVisibleStyle = {
    ...tooltipStyle,
    visibility: 'visible',
    opacity: 1
  };

  const playerNameStyle = {
    fontWeight: '600',
    color: '#1f2937'
  };

  const squadraStyle = {
    color: '#6b7280',
    fontSize: '0.8rem'
  };

  const actionsStyle = {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center'
  };

  const buttonStyle = {
    padding: '0.25rem 0.5rem',
    borderRadius: '0.25rem',
    border: '1px solid #d1d5db',
    backgroundColor: 'white',
    fontSize: '0.75rem',
    cursor: 'pointer',
    transition: 'all 0.2s'
  };

  const buyButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#3b82f6',
    color: 'white',
    borderColor: '#3b82f6'
  };

  const unavailableButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#ef4444',
    color: 'white',
    borderColor: '#ef4444'
  };

  const resetButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#6b7280',
    color: 'white',
    borderColor: '#6b7280'
  };

  const statusStyle = {
    padding: '0.25rem 0.5rem',
    borderRadius: '0.25rem',
    fontSize: '0.75rem',
    fontWeight: '500'
  };

  const acquiredStatusStyle = {
    ...statusStyle,
    backgroundColor: '#dcfce7',
    color: '#166534'
  };

  const unavailableStatusStyle = {
    ...statusStyle,
    backgroundColor: '#fef2f2',
    color: '#dc2626'
  };

  return (
    <div style={containerStyle}>
      {/* Filtri */}
      <div style={{ 
        ...filtersStyle,
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        alignItems: 'center'
      }}>
        {/* First Line: Search and Hide Acquired */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <input
            type="text"
            placeholder="Cerca giocatore o squadra..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={inputStyle}
          />
          
          {/* Toggle for hiding acquired players */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            color: '#374151',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={hideAcquired}
              onChange={(e) => {
                console.log('🔍 DEBUG: Toggle changed to:', e.target.checked);
                setHideAcquired(e.target.checked);
                // Save to localStorage
                localStorage.setItem('giocatoriHideAcquired', JSON.stringify(e.target.checked));
              }}
              style={{
                width: '1rem',
                height: '1rem',
                cursor: 'pointer'
              }}
            />
            Nascondi acquistati
          </label>
        </div>
        
        {/* Second Line: Role Filter Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
          {availableRoles.map(englishRole => {
            const isSelected = selectedRoles.includes(englishRole);
            const italianRole = enhancedRoleMapping[englishRole] || englishRole;
            const roleColor = roleColorMapping[italianRole] || '#6b7280';
            
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
        </div>

        {/* Third Line: Skill Filter Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
          {availableSkills.map(skill => {
            const isSelected = selectedSkills.includes(skill);
            const getSkillColor = (skill) => {
              // Categorical color scheme for skills
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
              const color = skillColorMap[skill] || '#6b7280';
              console.log(`🎨 Skill "${skill}" -> ${color}`);
              return color;
            };
            
            return (
              <button
                key={skill}
                onClick={() => toggleSkill(skill)}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  border: `2px solid ${getSkillColor(skill)}`,
                  borderRadius: '0.375rem',
                  backgroundColor: isSelected ? getSkillColor(skill) : 'white',
                  color: isSelected ? 'white' : getSkillColor(skill),
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                title={`Filter by ${skill}`}
              >
                {skill}
              </button>
            );
          })}
        </div>

        <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          {filteredAndSortedPlayers.length} giocatori trovati
        </div>
        
        {/* Toggle Column Controls Button */}
        <button
          onClick={() => setShowColumnControls(!showColumnControls)}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            backgroundColor: showColumnControls ? '#3b82f6' : '#f3f4f6',
            color: showColumnControls ? 'white' : '#374151',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          title={showColumnControls ? 'Nascondi controlli colonne' : 'Mostra controlli colonne'}
        >
          {showColumnControls ? 'Nascondi Colonne' : 'Mostra Colonne'}
        </button>
      </div>

      {/* Column Visibility Controls */}
      {showColumnControls && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            flexWrap: 'wrap', 
            alignItems: 'center',
            marginBottom: '0.5rem'
          }}>
            <span style={{ 
              fontSize: '0.875rem', 
              fontWeight: '600', 
              color: '#374151',
              marginRight: '0.5rem'
            }}>
              Colonne:
            </span>
            
            {/* ALL and Hide All buttons */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={toggleAllColumns}
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.25rem',
                  backgroundColor: visibleColumns.size === getColumns().length ? '#3b82f6' : '#f3f4f6',
                  color: visibleColumns.size === getColumns().length ? 'white' : '#374151',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                title="Seleziona/Deseleziona tutte le colonne"
              >
                ALL
              </button>
              
              <button
                onClick={hideAllColumns}
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.25rem',
                  backgroundColor: visibleColumns.size === 3 ? '#dc2626' : '#f3f4f6',
                  color: visibleColumns.size === 3 ? 'white' : '#374151',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                title="Nascondi tutte le colonne tranne Nome, Squadra e Ruolo Mantra"
              >
                Hide All
              </button>
            </div>
            
          </div>
          
          {/* Sectioned Column Controls */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1rem',
            marginTop: '1rem'
          }}>
            {/* 2025-2026 Section */}
            <div>
              <div style={{ 
                fontSize: '0.875rem', 
                fontWeight: '600', 
                color: '#1f2937',
                marginBottom: '0.5rem',
                padding: '0.25rem 0.5rem',
                backgroundColor: '#dbeafe',
                borderRadius: '0.25rem',
                border: '1px solid #3b82f6'
              }}>
                2025-2026
              </div>
              <div style={{ 
                display: 'flex', 
                gap: '0.5rem', 
                flexWrap: 'wrap', 
                alignItems: 'center'
              }}>
                {getColumns().filter(column => 
                  column.includes('2025-2026') && 
                  !column.includes('Convenienza Potenziale FSTATS') &&
                  !column.includes('Convenienza FSTATS') &&
                  !column.includes('Fantaindex')
                ).map(column => (
                  <button
                    key={column}
                    onClick={() => toggleColumn(column)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.25rem',
                      backgroundColor: visibleColumns.has(column) ? '#10b981' : '#f3f4f6',
                      color: visibleColumns.has(column) ? 'white' : '#374151',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    title={`Toggle ${column}`}
                  >
                    {column.replace(' 2025-2026', '')}
                  </button>
                ))}
              </div>
            </div>

            {/* 2024-2025 Section */}
            <div>
              <div style={{ 
                fontSize: '0.875rem', 
                fontWeight: '600', 
                color: '#1f2937',
                marginBottom: '0.5rem',
                padding: '0.25rem 0.5rem',
                backgroundColor: '#fef3c7',
                borderRadius: '0.25rem',
                border: '1px solid #f59e0b'
              }}>
                2024-2025
              </div>
              <div style={{ 
                display: 'flex', 
                gap: '0.5rem', 
                flexWrap: 'wrap', 
                alignItems: 'center'
              }}>
                {getColumns().filter(column => column.includes('2024-2025') || column === 'Gol 2024').map(column => (
                  <button
                    key={column}
                    onClick={() => toggleColumn(column)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.25rem',
                      backgroundColor: visibleColumns.has(column) ? '#10b981' : '#f3f4f6',
                      color: visibleColumns.has(column) ? 'white' : '#374151',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    title={`Toggle ${column}`}
                  >
                    {column === 'Gol 2024' ? 'Gol' : column.replace(' 2024-2025', '')}
                  </button>
                ))}
              </div>
            </div>

            {/* Prediction Section */}
            <div>
              <div style={{ 
                fontSize: '0.875rem', 
                fontWeight: '600', 
                color: '#1f2937',
                marginBottom: '0.5rem',
                padding: '0.25rem 0.5rem',
                backgroundColor: '#d1fae5',
                borderRadius: '0.25rem',
                border: '1px solid #10b981'
              }}>
                Prediction
              </div>
              
              {/* FPEDIA Line */}
              <div style={{ marginBottom: '0.5rem' }}>
                <div style={{ 
                  fontSize: '0.75rem', 
                  fontWeight: '500', 
                  color: '#059669',
                  marginBottom: '0.25rem'
                }}>
                  FPEDIA:
                </div>
                <div style={{ 
                  display: 'flex', 
                  gap: '0.5rem', 
                  flexWrap: 'wrap', 
                  alignItems: 'center'
                }}>
                  {getColumns().filter(column => 
                    column.includes('Punteggio FPEDIA') ||
                    column.includes('Convenienza Potenziale FPEDIA') ||
                    column.includes('Convenienza FPEDIA')
                  ).map(column => (
                    <button
                      key={column}
                      onClick={() => toggleColumn(column)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.25rem',
                        backgroundColor: visibleColumns.has(column) ? '#10b981' : '#f3f4f6',
                        color: visibleColumns.has(column) ? 'white' : '#374151',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      title={`Toggle ${column}`}
                    >
                      {column}
                    </button>
                  ))}
                </div>
              </div>

              {/* FSTATS Line */}
              <div style={{ marginBottom: '0.5rem' }}>
                <div style={{ 
                  fontSize: '0.75rem', 
                  fontWeight: '500', 
                  color: '#059669',
                  marginBottom: '0.25rem'
                }}>
                  FSTATS:
                </div>
                <div style={{ 
                  display: 'flex', 
                  gap: '0.5rem', 
                  flexWrap: 'wrap', 
                  alignItems: 'center'
                }}>
                  {getColumns().filter(column => 
                    column.includes('Convenienza Potenziale FSTATS') ||
                    column.includes('Convenienza FSTATS') ||
                    column.includes('Fantaindex')
                  ).map(column => (
                    <button
                      key={column}
                      onClick={() => toggleColumn(column)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.25rem',
                        backgroundColor: visibleColumns.has(column) ? '#10b981' : '#f3f4f6',
                        color: visibleColumns.has(column) ? 'white' : '#374151',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      title={`Toggle ${column}`}
                    >
                      {column}
                    </button>
                  ))}
                </div>
              </div>

              {/* Predicted Stats Line */}
              <div>
                <div style={{ 
                  fontSize: '0.75rem', 
                  fontWeight: '500', 
                  color: '#059669',
                  marginBottom: '0.25rem'
                }}>
                  Predicted Stats:
                </div>
                <div style={{ 
                  display: 'flex', 
                  gap: '0.5rem', 
                  flexWrap: 'wrap', 
                  alignItems: 'center'
                }}>
                  {getColumns().filter(column => 
                    column.includes('Previst')
                  ).map(column => (
                    <button
                      key={column}
                      onClick={() => toggleColumn(column)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.25rem',
                        backgroundColor: visibleColumns.has(column) ? '#10b981' : '#f3f4f6',
                        color: visibleColumns.has(column) ? 'white' : '#374151',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      title={`Toggle ${column}`}
                    >
                      {column}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Qualitative Section */}
            <div>
              <div style={{ 
                fontSize: '0.875rem', 
                fontWeight: '600', 
                color: '#1f2937',
                marginBottom: '0.5rem',
                padding: '0.25rem 0.5rem',
                backgroundColor: '#e0e7ff',
                borderRadius: '0.25rem',
                border: '1px solid #6366f1'
              }}>
                Qualitative
              </div>
              <div style={{ 
                display: 'flex', 
                gap: '0.5rem', 
                flexWrap: 'wrap', 
                alignItems: 'center'
              }}>
                {getColumns().filter(column => 
                  column.includes('Trend') ||
                  column.includes('Skills') ||
                  column.includes('Buon Investimento') ||
                  column.includes('Resistenza Infortuni') ||
                  column.includes('Infortunato') ||
                  column.includes('Nuovo Acquisto')
                ).map(column => (
                  <button
                    key={column}
                    onClick={() => toggleColumn(column)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.25rem',
                      backgroundColor: visibleColumns.has(column) ? '#10b981' : '#f3f4f6',
                      color: visibleColumns.has(column) ? 'white' : '#374151',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    title={`Toggle ${column}`}
                  >
                    {column}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabella */}
      <div style={tableContainerStyle}>
        <div style={tableWrapperStyle}>
          <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>
                <Tooltip content="Azioni" columnName="Azioni">
                  Azioni
                </Tooltip>
              </th>
              {visibleColumns.has('Nome') && (
                <th style={nameThStyle} onClick={() => handleSort('Nome')}>
                  <Tooltip content="Nome" columnName="Nome">
                    Nome {getSortIcon('Nome')}
                  </Tooltip>
                </th>
              )}
              {visibleColumns.has('Squadra') && (
                <th style={thStyle} onClick={() => handleSort('Squadra')}>
                  <Tooltip content="Squadra" columnName="Squadra">
                    Squadra {getSortIcon('Squadra')}
                  </Tooltip>
                </th>
              )}
              {visibleColumns.has('Ruolo Mantra') && (
                <th style={thStyle}>
                  <Tooltip content="Ruolo" columnName="Ruolo">
                    Ruolo
                  </Tooltip>
                </th>
              )}
              {visibleColumns.has('Skills') && (
                <th style={thStyle}>
                  <Tooltip content="Skills" columnName="Skills">
                    Skills
                  </Tooltip>
                </th>
              )}
              {columns.filter(column => visibleColumns.has(column) && column !== 'Nome' && column !== 'Squadra' && column !== 'Ruolo Mantra' && column !== 'Skills').map(column => (
                <th key={column} style={thStyle} onClick={() => handleSort(column)}>
                  <Tooltip content={column} columnName={column}>
                    {getColumnAcronym(column)} {getSortIcon(column)}
                  </Tooltip>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedPlayers.map((player, index) => {
              const playerId = player.id;
              const status = getPlayerStatus(playerId);
              const fantamilioni = getPlayerFantamilioni(playerId);
              
              return (
                <tr key={index}>
                  <td style={tdStyle}>
                    <div style={actionsStyle}>
                      {status === 'acquired' && (
                        <span style={acquiredStatusStyle}>Acquistato</span>
                      )}
                      {status === 'unavailable' && (
                        <span style={unavailableStatusStyle}>Non Disp.</span>
                      )}
                      {status === 'available' && (
                        <button
                          onClick={() => handleAcquire(player)}
                          style={buyButtonStyle}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#2563eb';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = '#3b82f6';
                          }}
                        >
                          Compra
                        </button>
                      )}
                      {status !== 'available' && (
                        <button
                          onClick={() => handleStatusChange(playerId, 'available')}
                          style={resetButtonStyle}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#4b5563';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = '#6b7280';
                          }}
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </td>
                  {visibleColumns.has('Nome') && (
                    <td style={nameTdStyle}>
                      <div style={playerNameStyle}>{player.Nome}</div>
                      {fantamilioni && (
                        <div style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: '500' }}>
                          {fantamilioni} FM
                        </div>
                      )}
                    </td>
                  )}
                  {visibleColumns.has('Squadra') && (
                    <td style={tdStyle}>
                      <div style={squadraStyle}>{player.Squadra}</div>
                    </td>
                  )}
                  {visibleColumns.has('Ruolo Mantra') && (
                    <td style={tdStyle}>
                    {(() => {
                      // Parse the Ruolo Mantra field for display
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
                      }
                      
                      return roles.length > 0 ? (
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                          {roles.map((role, idx) => {
                            // Get role color
                            const getRoleColor = (role) => {
                              const roleColorMap = {
                                'G': '#f97316',    // Orange
                                'CB': '#22c55e',   // Green
                                'LA': '#22c55e',   // Green
                                'RB': '#22c55e',   // Green
                                'LB': '#22c55e',   // Green (updated from Blue)
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
                            
                            return (
                              <span key={idx} style={{
                                padding: '0.125rem 0.375rem',
                                backgroundColor: getRoleColor(role),
                                borderRadius: '0.25rem',
                                fontSize: '0.75rem',
                                color: 'white',
                                fontWeight: '600'
                              }}>
                                {roleMapping[role] || role}
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
                  {visibleColumns.has('Skills') && (
                    <td style={tdStyle}>
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
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                          {skills.map((skill, idx) => {
                            // Define skill colors
                            const getSkillColor = (skill) => {
                              const skillColorMap = {
                                'Outsider': '#f59e0b',      // Orange
                                'Titolare': '#10b981',      // Green
                                'Buona Media': '#3b82f6',   // Blue
                                'Assistman': '#8b5cf6',     // Purple
                                'Goleador': '#ef4444',      // Red
                                'Difensore': '#6b7280',     // Gray
                                'Portiere': '#f97316',      // Orange
                                'Centrocampista': '#06b6d4', // Cyan
                                'Attaccante': '#ec4899'     // Pink
                              };
                              return skillColorMap[skill] || '#6b7280';
                            };
                            
                            return (
                              <span key={idx} style={{
                                padding: '0.125rem 0.375rem',
                                backgroundColor: getSkillColor(skill),
                                borderRadius: '0.25rem',
                                fontSize: '0.75rem',
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
                  {columns.filter(column => visibleColumns.has(column) && column !== 'Nome' && column !== 'Squadra' && column !== 'Ruolo Mantra' && column !== 'Skills').map(column => {
                    const value = player[column];
                    const isMissing = isMissingData(value);
                    const cellStyle = isMissing ? missingDataTdStyle : tdStyle;
                    
                    return (
                      <td key={column} style={cellStyle}>
                        {typeof value === 'number' ? 
                          value.toFixed(2) : 
                          String(value || '-')
                        }
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};

export default MantraGiocatoriTab;
