import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCachedData, setCachedData, CACHE_CONFIG } from '../utils/cache';
import { getSeasonLabels } from '../utils/dataUtils';
import { theme } from '../theme';

// Tiny 2-point trend line (previous season -> current season) for a single stat.
const Sparkline = ({ prev, cur, width = 46, height = 18 }) => {
  if (typeof prev !== 'number' || typeof cur !== 'number' || prev < 0 || cur < 0) return null;
  const max = Math.max(prev, cur, 0);
  const min = Math.min(prev, cur, 0);
  const range = (max - min) || 1;
  const y = (v) => height - 3 - ((v - min) / range) * (height - 6);
  const x0 = 3;
  const x1 = width - 3;
  const trendColor = cur > prev ? theme.success : cur < prev ? theme.danger : theme.textFaint;
  return (
    <svg width={width} height={height} style={{ display: 'block', flexShrink: 0 }}>
      <line x1={x0} y1={y(prev)} x2={x1} y2={y(cur)} stroke={trendColor} strokeWidth="2" strokeLinecap="round" />
      <circle cx={x0} cy={y(prev)} r="2" fill={theme.textFaint} />
      <circle cx={x1} cy={y(cur)} r="2.5" fill={trendColor} />
    </svg>
  );
};

const MantraGiocatoriTab = ({ players = [], playerStatus = {}, onPlayerStatusChange, onPlayerAcquire, roles = [] }) => {
  const navigate = useNavigate();
  // Derived from the data itself (see data-pipeline/config.py) - never hardcode season strings below.
  const { current: CUR_SEASON, previous: PREV_SEASON } = useMemo(() => getSeasonLabels(players), [players]);
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
        const saved = new Set(JSON.parse(savedColumns));
        // Current-season columns (e.g. "Gol 2026-2027") are new field names that didn't
        // exist under any previous season - a saved set predating them isn't a deliberate
        // "hide this column" choice, just an outdated list. Show them by default so a
        // season rollover doesn't silently disappear from the table for existing users.
        ['Presenze', 'Minuti Giocati', 'Gol', 'Assist', 'xG', 'xA', 'Ammonizioni', 'Espulsioni']
          .forEach(base => saved.add(`${base} ${CUR_SEASON}`));
        return saved;
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

  // On mobile, role filters / column & sort controls collapse behind a "Filtri" toggle so the
  // player list isn't pushed hundreds of pixels down by controls most visits don't need.
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  // Display mode state (table or cards) - defaults to cards on mobile, table on desktop,
  // unless the user has already picked one explicitly.
  const [displayMode, setDisplayMode] = useState(() => {
    const savedMode = localStorage.getItem('giocatoriDisplayMode');
    if (savedMode) return savedMode;
    return window.innerWidth <= 768 ? 'cards' : 'table';
  });

  // Window width, tracked for mobile-responsive layout (card grid columns, toolbar, etc.)
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const isMobile = windowWidth <= 768;
  
  // Card sorting state
  const [cardSortConfig, setCardSortConfig] = useState(() => {
    const savedSort = localStorage.getItem('giocatoriCardSort');
    if (savedSort) {
      try {
        return JSON.parse(savedSort);
      } catch (error) {
        console.error('Error parsing saved card sort:', error);
      }
    }
    return { key: 'fvm', direction: 'desc' };
  });
  
  // Card details visibility state
  const [showCardDetails, setShowCardDetails] = useState(() => {
    const savedDetails = localStorage.getItem('giocatoriShowCardDetails');
    return savedDetails === 'true';
  });

  // Tooltip visibility state
  const [hoveredColumn, setHoveredColumn] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Global mouse tracking to hide tooltip when mouse leaves table area
  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
      
      // Check if mouse is over any table header
      const target = e.target;
      const isOverTableHeader = target.closest('th');
      
      if (!isOverTableHeader && hoveredColumn) {
        setHoveredColumn(null);
      }
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [hoveredColumn]);

  // Create role color mapping from roles.csv
  const roleColorMapping = useMemo(() => {
    // Try to get cached role mapping first
    const cachedMapping = getCachedData(CACHE_CONFIG.ROLE_MAPPING, 'color_mapping');
    if (cachedMapping) {
      return cachedMapping;
    }

    const colorNameToHex = {
      'Orange': theme.roleCategory.goalkeepers,
      'Green': theme.roleCategory.defenders,
      'Blue': theme.roleCategory.midfielders,
      'Purple': theme.roleCategory.wingers,
      'Red': theme.roleCategory.attackers
    };

    const mapping = {};

    // Map roles.csv roles using Italian role names (Ruolo column)
    roles.forEach(role => {
      const hexColor = colorNameToHex[role.Color] || theme.textMuted;
      mapping[role.Ruolo] = hexColor; // Use Italian role name as key
    });

    // Fallback mapping based on roles.csv structure when Color field is empty
    if (Object.values(mapping).every(color => color === theme.textMuted)) {
      const fallbackMapping = {
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
      
      // Apply fallback mapping
      Object.keys(fallbackMapping).forEach(italianRole => {
        mapping[italianRole] = fallbackMapping[italianRole];
      });
    }
    
    // Cache the calculated role mapping
    setCachedData(CACHE_CONFIG.ROLE_MAPPING, mapping, 'color_mapping');
    
    return mapping;
  }, [roles]);

  // Get all available roles from roles.csv's Ruolo column, in CSV order. This is the same
  // Mantra-code vocabulary (P, Dc, Dd, Ds, B, E, M, C, W, T, A, Pc) player['Ruolo Mantra']
  // uses, so selectedRoles can be compared to it directly - no translation needed.
  const availableRoles = useMemo(() => {
    return roles.map(role => role.Ruolo);
  }, [roles]);

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

  // Helper function to check if data is missing (negative values)
  const isMissingData = (value) => {
    // Unmatched players (no Understat data) simply omit the field (undefined/null) rather
    // than carrying a negative sentinel - both must count as missing, or sort comparators
    // that do `!isMissingData(x) ? x : -Infinity` end up comparing undefined values (NaN),
    // which silently corrupts the whole sort order.
    if (value === undefined || value === null) return true;
    return typeof value === 'number' && value < 0;
  };

  // Filter and sort players - memoized for performance
  const filteredAndSortedPlayers = useMemo(() => {
    // Debug logging for playerStatus
    
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

      // Filter out acquired players if hideAcquired is true
      const playerStatusValue = playerStatus[player.player_id];
      const isNotAcquired = !hideAcquired || !playerStatusValue || (playerStatusValue && playerStatusValue.status !== 'acquired');

      return matchesSearch && matchesRole && isNotAcquired;
    });
    

    // Sort players
    if (displayMode === 'cards') {
      // For card display mode, use the selected card sort configuration
      filtered.sort((a, b) => {
        let aVal, bVal;
        
        switch (cardSortConfig.key) {
          case 'fvm':
            aVal = !isMissingData(a['FVM']) ? a['FVM'] : -Infinity;
            bVal = !isMissingData(b['FVM']) ? b['FVM'] : -Infinity;
            break;
          case 'qta':
            aVal = !isMissingData(a['QtA']) ? a['QtA'] : -Infinity;
            bVal = !isMissingData(b['QtA']) ? b['QtA'] : -Infinity;
            break;
          case 'nome':
            aVal = a.Nome || '';
            bVal = b.Nome || '';
            break;
          case 'squadra':
            aVal = a.Squadra || '';
            bVal = b.Squadra || '';
            break;
          case 'prezzo':
            aVal = typeof a.Prezzo === 'number' ? a.Prezzo : 0;
            bVal = typeof b.Prezzo === 'number' ? b.Prezzo : 0;
            break;
          case 'appetibilita':
            aVal = typeof a.Appetibilità === 'number' ? a.Appetibilità : 0;
            bVal = typeof b.Appetibilità === 'number' ? b.Appetibilità : 0;
            break;
          case 'presenze':
            aVal = !isMissingData(a[`Presenze ${CUR_SEASON}`]) ? a[`Presenze ${CUR_SEASON}`] : -Infinity;
            bVal = !isMissingData(b[`Presenze ${CUR_SEASON}`]) ? b[`Presenze ${CUR_SEASON}`] : -Infinity;
            break;
          case 'minutiGiocati':
            aVal = !isMissingData(a[`Minuti Giocati ${CUR_SEASON}`]) ? a[`Minuti Giocati ${CUR_SEASON}`] : -Infinity;
            bVal = !isMissingData(b[`Minuti Giocati ${CUR_SEASON}`]) ? b[`Minuti Giocati ${CUR_SEASON}`] : -Infinity;
            break;
          case 'gol':
            aVal = !isMissingData(a[`Gol ${CUR_SEASON}`]) ? a[`Gol ${CUR_SEASON}`] : -Infinity;
            bVal = !isMissingData(b[`Gol ${CUR_SEASON}`]) ? b[`Gol ${CUR_SEASON}`] : -Infinity;
            break;
          case 'assist':
            aVal = !isMissingData(a[`Assist ${CUR_SEASON}`]) ? a[`Assist ${CUR_SEASON}`] : -Infinity;
            bVal = !isMissingData(b[`Assist ${CUR_SEASON}`]) ? b[`Assist ${CUR_SEASON}`] : -Infinity;
            break;
          case 'xG':
            aVal = !isMissingData(a[`xG ${CUR_SEASON}`]) ? a[`xG ${CUR_SEASON}`] : -Infinity;
            bVal = !isMissingData(b[`xG ${CUR_SEASON}`]) ? b[`xG ${CUR_SEASON}`] : -Infinity;
            break;
          case 'xA':
            aVal = !isMissingData(a[`xA ${CUR_SEASON}`]) ? a[`xA ${CUR_SEASON}`] : -Infinity;
            bVal = !isMissingData(b[`xA ${CUR_SEASON}`]) ? b[`xA ${CUR_SEASON}`] : -Infinity;
            break;
          case 'ammonizioni':
            aVal = !isMissingData(a[`Ammonizioni ${CUR_SEASON}`]) ? a[`Ammonizioni ${CUR_SEASON}`] : -Infinity;
            bVal = !isMissingData(b[`Ammonizioni ${CUR_SEASON}`]) ? b[`Ammonizioni ${CUR_SEASON}`] : -Infinity;
            break;
          case 'espulsioni':
            aVal = !isMissingData(a[`Espulsioni ${CUR_SEASON}`]) ? a[`Espulsioni ${CUR_SEASON}`] : -Infinity;
            bVal = !isMissingData(b[`Espulsioni ${CUR_SEASON}`]) ? b[`Espulsioni ${CUR_SEASON}`] : -Infinity;
            break;
          // previous season data
          case 'presenze2025':
            aVal = !isMissingData(a[`Presenze ${PREV_SEASON}`]) ? a[`Presenze ${PREV_SEASON}`] : -Infinity;
            bVal = !isMissingData(b[`Presenze ${PREV_SEASON}`]) ? b[`Presenze ${PREV_SEASON}`] : -Infinity;
            break;
          case 'minutiGiocati2025':
            aVal = !isMissingData(a[`Minuti Giocati ${PREV_SEASON}`]) ? a[`Minuti Giocati ${PREV_SEASON}`] : -Infinity;
            bVal = !isMissingData(b[`Minuti Giocati ${PREV_SEASON}`]) ? b[`Minuti Giocati ${PREV_SEASON}`] : -Infinity;
            break;
          case 'gol2025':
            aVal = !isMissingData(a[`Gol ${PREV_SEASON}`]) ? a[`Gol ${PREV_SEASON}`] : -Infinity;
            bVal = !isMissingData(b[`Gol ${PREV_SEASON}`]) ? b[`Gol ${PREV_SEASON}`] : -Infinity;
            break;
          case 'assist2025':
            aVal = !isMissingData(a[`Assist ${PREV_SEASON}`]) ? a[`Assist ${PREV_SEASON}`] : -Infinity;
            bVal = !isMissingData(b[`Assist ${PREV_SEASON}`]) ? b[`Assist ${PREV_SEASON}`] : -Infinity;
            break;
          case 'xG2025':
            aVal = !isMissingData(a[`xG ${PREV_SEASON}`]) ? a[`xG ${PREV_SEASON}`] : -Infinity;
            bVal = !isMissingData(b[`xG ${PREV_SEASON}`]) ? b[`xG ${PREV_SEASON}`] : -Infinity;
            break;
          case 'xA2025':
            aVal = !isMissingData(a[`xA ${PREV_SEASON}`]) ? a[`xA ${PREV_SEASON}`] : -Infinity;
            bVal = !isMissingData(b[`xA ${PREV_SEASON}`]) ? b[`xA ${PREV_SEASON}`] : -Infinity;
            break;
          case 'ammonizioni2025':
            aVal = !isMissingData(a[`Ammonizioni ${PREV_SEASON}`]) ? a[`Ammonizioni ${PREV_SEASON}`] : -Infinity;
            bVal = !isMissingData(b[`Ammonizioni ${PREV_SEASON}`]) ? b[`Ammonizioni ${PREV_SEASON}`] : -Infinity;
            break;
          case 'espulsioni2025':
            aVal = !isMissingData(a[`Espulsioni ${PREV_SEASON}`]) ? a[`Espulsioni ${PREV_SEASON}`] : -Infinity;
            bVal = !isMissingData(b[`Espulsioni ${PREV_SEASON}`]) ? b[`Espulsioni ${PREV_SEASON}`] : -Infinity;
            break;
          default:
            aVal = 0;
            bVal = 0;
        }
        
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return cardSortConfig.direction === 'asc' 
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        } else {
          return cardSortConfig.direction === 'asc' 
            ? aVal - bVal
            : bVal - aVal;
        }
      });
    } else if (sortConfig.key) {
      // For table mode, use the selected sort column
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
  }, [players, searchTerm, selectedRoles, sortConfig, hideAcquired, playerStatus, displayMode, cardSortConfig, CUR_SEASON, PREV_SEASON]);

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
    // The acquisition bar renders at the top of the page - scroll there so it's visible
    // even if the player was found further down a long list.
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Function to create acronyms for column names. Season-specific columns are recognized by
  // stripping CUR_SEASON/PREV_SEASON off the end, so this never needs updating when the
  // season rolls over (see data-pipeline/config.py).
  const getColumnAcronym = (columnName) => {
    const baseAcronyms = {
      'Nome': 'Nome',
      'Squadra': 'Squadra',
      'Ruolo Mantra': 'Ruolo',
      'QtA': 'QtA',
      'FVM': 'FVM',
      'Presenze': 'P',
      'Minuti Giocati': 'MG',
      'Gol': 'G',
      'Assist': 'A',
      'xG': 'xG',
      'xA': 'xA',
      'Ammonizioni': 'Amm',
      'Espulsioni': 'Esp'
    };

    if (baseAcronyms[columnName]) return baseAcronyms[columnName];

    const seasonSuffix = (season) => season.slice(2, 4); // '2026-2027' -> '26'
    if (columnName.endsWith(` ${CUR_SEASON}`)) {
      const base = columnName.slice(0, -(CUR_SEASON.length + 1));
      return (baseAcronyms[base] || base) + seasonSuffix(CUR_SEASON);
    }
    if (columnName.endsWith(` ${PREV_SEASON}`)) {
      const base = columnName.slice(0, -(PREV_SEASON.length + 1));
      return (baseAcronyms[base] || base) + seasonSuffix(PREV_SEASON);
    }

    return columnName.substring(0, 8);
  };

  // Helper function to get trend emoji
  const getTrendEmoji = (trend) => {
    if (!trend) return '=';
    const trendLower = trend.toLowerCase();
    if (trendLower.includes('up') || trendLower.includes('crescita') || trendLower.includes('positivo')) {
      return '📈';
    } else if (trendLower.includes('down') || trendLower.includes('calo') || trendLower.includes('negativo')) {
      return '📉';
    }
    return '=';
  };

  // Helper function to get role color. Keyed by the Mantra role codes used directly in
  // player['Ruolo Mantra'] (P, Dc, Dd, Ds, B, E, M, C, W, T, A, Pc) - same vocabulary as
  // roles.csv's Ruolo column, see roleColorMapping above for the roles.csv-driven version.
  const getRoleColor = (role) => {
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
  };

  // Helper function to get role display info. `role` is already the display-ready Mantra
  // code, so this just attaches a color - no translation needed.
  const getRoleInfo = (role) => {
    return { italian: role, color: getRoleColor(role) };
  };

  // Helper function to format values (int vs float) - memoized for performance
  const formatValue = useCallback((value, fieldName = '') => {
    if (typeof value === 'number') {
      if (isMissingData(value)) return 'N/A';
      
      // Fields that should always be displayed as integers
      // All our fields are either whole numbers (QtA, FVM, Presenze, Gol, ...) or already
      // rounded floats (xG, xA) - Number.isInteger is enough to tell them apart.
      if (Number.isInteger(value)) {
        return value.toString();
      } else {
        return value.toFixed(2);
      }
    }
    return String(value || '-');
  }, []);

  // Per-match averages (goals/assists/xG/xA/minutes divided by appearances) for the card
  // detail view's prev->cur trend. Raw per-season totals aren't comparable between a season
  // that's only a few matches old and a full previous season, so the sparkline there was
  // mostly showing "current season hasn't happened yet" rather than an actual trend - dividing
  // by Presenze keeps both seasons on the same (per-appearance) scale.
  const PER_MATCH_BASES = ['Minuti Giocati', 'Gol', 'Assist', 'xG', 'xA'];
  const PER_MATCH_LABELS = {
    'Minuti Giocati': 'Min/Partita',
    'Gol': 'Gol/Partita',
    'Assist': 'Assist/Partita',
    'xG': 'xG/Partita',
    'xA': 'xA/Partita'
  };

  const getPerMatchAverage = (player, base, season) => {
    const presenze = player[`Presenze ${season}`];
    const raw = player[`${base} ${season}`];
    if (isMissingData(presenze) || isMissingData(raw) || presenze <= 0) return undefined;
    return raw / presenze;
  };

  const formatPerMatchValue = (value, base) => {
    if (typeof value !== 'number') return '-';
    // Minutes-per-appearance reads as a whole number (e.g. "68"), like the raw minutes
    // field does; goals/assists/xG/xA per appearance are fractional, so keep 2 decimals.
    return base === 'Minuti Giocati' ? Math.round(value).toString() : value.toFixed(2);
  };

  // Simple Column Header component with tooltip
  const ColumnHeader = ({ children, content, columnName, onClick }) => {
    const handleMouseEnter = (e) => {
      setHoveredColumn(columnName);
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    
    return (
      <th 
        style={thStyle} 
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
      >
        {children}
      </th>
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
    const seasonStatBases = ['Presenze', 'Minuti Giocati', 'Gol', 'Assist', 'xG', 'xA', 'Ammonizioni', 'Espulsioni'];
    const customFields = [
      'Nome',
      'Squadra',
      'QtA',
      'FVM',
      ...seasonStatBases.map(base => `${base} ${CUR_SEASON}`),
      ...seasonStatBases.map(base => `${base} ${PREV_SEASON}`)
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
    padding: isMobile ? '1rem' : '2rem',
    maxWidth: '1400px',
    margin: '0 auto',
    position: 'relative'
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
    border: `1px solid ${theme.border}`,
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    minWidth: '200px',
    backgroundColor: theme.surfaceAlt,
    color: theme.text
  };


  const tableContainerStyle = {
    backgroundColor: theme.surface,
    borderRadius: '0.5rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
    border: `1px solid ${theme.border}`,
    overflow: 'visible',
    maxWidth: '100%',
    position: 'relative',
    zIndex: 1
  };

  // overflowX: 'auto' here implicitly forces overflow-y to a non-'visible' value too (per the
  // CSS overflow spec), turning this div into a scroll container - position: sticky on the
  // header row only works while it's scrolling in a *real* scroll container. Since the div's
  // height was previously unbounded (grows to fit content), it never scrolled internally, so
  // the "scroll container" it silently became had nothing to stick within, and the header just
  // scrolled away with the rest of the page. Bounding the height and making the y-overflow
  // scrollable makes that scroll container real, so the sticky header actually stays put.
  const tableWrapperStyle = {
    overflowX: 'auto',
    overflowY: 'auto',
    maxHeight: '75vh',
    maxWidth: '100%'
  };

  const tableStyle = {
    width: '100%',
    minWidth: '800px', // Much more compact table
    borderCollapse: 'collapse'
  };

  // Sticky header: stays pinned while scrolling a long player list, so column labels
  // (and the click-to-sort affordance) remain visible without scrolling back up.
  const thStyle = {
    backgroundColor: theme.surfaceAlt,
    padding: '0.5rem 0.375rem',
    textAlign: 'left',
    fontWeight: '600',
    color: theme.text,
    borderBottom: `1px solid ${theme.border}`,
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
    borderBottom: `1px solid ${theme.borderSoft}`,
    fontSize: '0.75rem',
    minWidth: '60px', // Much smaller minimum width
    whiteSpace: 'nowrap',
    color: theme.text
  };


  const nameTdStyle = {
    ...tdStyle,
    minWidth: '180px',
    fontSize: '0.875rem'
  };

  // Style for missing data cells (-1.00 values)
  const missingDataTdStyle = {
    ...tdStyle,
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    color: theme.danger
  };

  // Tooltip styles
  const tooltipStyle = {
    position: 'fixed',
    backgroundColor: theme.surfaceAlt,
    color: theme.text,
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: '500',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
    zIndex: 999999,
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
    maxWidth: '300px',
    textAlign: 'center',
    border: `1px solid ${theme.border}`
  };

  const playerNameStyle = {
    fontWeight: '600',
    color: theme.text
  };

  const squadraStyle = {
    color: theme.textMuted,
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
    border: `1px solid ${theme.border}`,
    backgroundColor: theme.surfaceAlt,
    color: theme.text,
    fontSize: '0.75rem',
    cursor: 'pointer',
    transition: 'all 0.2s'
  };

  const buyButtonStyle = {
    ...buttonStyle,
    backgroundColor: theme.pink,
    color: 'white',
    borderColor: theme.pink
  };


  const resetButtonStyle = {
    ...buttonStyle,
    backgroundColor: theme.textFaint,
    color: 'white',
    borderColor: theme.textFaint
  };

  const statusStyle = {
    padding: '0.25rem 0.5rem',
    borderRadius: '0.25rem',
    fontSize: '0.75rem',
    fontWeight: '500'
  };

  const acquiredStatusStyle = {
    ...statusStyle,
    backgroundColor: 'rgba(52, 211, 153, 0.16)',
    color: theme.success
  };

  const unavailableStatusStyle = {
    ...statusStyle,
    backgroundColor: 'rgba(248, 113, 113, 0.16)',
    color: theme.danger
  };

  // Card display styles
  const cardsContainerStyle = {
    display: 'grid',
    // minmax(0, 1fr) rather than a bare 1fr: a grid track's default min size is the content's
    // min-content width, which lets a card with long text/many inline badges force the whole
    // track (and page) wider than the viewport instead of wrapping/truncating internally.
    gridTemplateColumns: windowWidth <= 480 ? 'minmax(0, 1fr)' : windowWidth <= 768 ? 'repeat(2, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))',
    gap: '1rem',
    padding: '1rem 0'
  };

  const playerCardStyle = {
    backgroundColor: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: '0.5rem',
    padding: '1rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
    transition: 'all 0.2s',
    cursor: 'pointer'
  };

  const playerCardHoverStyle = {
    ...playerCardStyle,
    borderColor: theme.pink,
    boxShadow: '0 4px 12px rgba(236, 72, 153, 0.2)'
  };


  const cardTitleStyle = {
    fontSize: '1rem',
    fontWeight: '600',
    color: theme.text,
    flex: 1,
    minWidth: 0
  };

  const cardSquadraStyle = {
    fontSize: '0.875rem',
    color: theme.textMuted,
    marginBottom: '0.75rem'
  };

  const cardStatsGrid2Style = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.5rem',
    marginBottom: '1rem'
  };

  const statItemStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '0.5rem',
    backgroundColor: theme.surfaceAlt,
    borderRadius: '0.25rem',
    fontSize: '0.75rem'
  };

  const statValueStyle = {
    fontWeight: '700',
    color: theme.text,
    marginBottom: '0.25rem',
    fontSize: '1.1rem'
  };

  const statLabelStyle = {
    color: theme.textMuted,
    fontSize: '0.85rem',
    textAlign: 'center',
    lineHeight: '1.2',
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    hyphens: 'auto',
    fontWeight: '500'
  };





  // Mobile collapses role filters + column/sort controls behind the "Filtri" toggle;
  // desktop always shows them (nothing to reclaim vertical space for).
  const showExtraControls = !isMobile || showMobileFilters;

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
        {/* First Line: Search, Hide Acquired, Display Mode Toggle */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap'
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
            color: theme.text,
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={hideAcquired}
              onChange={(e) => {
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

          {/* Display mode toggle - lives in the normal flow now (used to be position:absolute
              in the tab's top-right corner, where it overlapped the checkbox label on mobile) */}
          <button
            onClick={() => {
              const newMode = displayMode === 'table' ? 'cards' : 'table';
              setDisplayMode(newMode);
              localStorage.setItem('giocatoriDisplayMode', newMode);
            }}
            style={{
              padding: '0.375rem 0.75rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              border: `1px solid ${theme.pink}`,
              borderRadius: '0.375rem',
              backgroundColor: theme.pink,
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              minWidth: '100px',
              justifyContent: 'center'
            }}
          >
            {displayMode === 'table' ? '🃏 Carte' : '📊 Tabella'}
          </button>
        </div>

        <div style={{ color: theme.textMuted, fontSize: '0.875rem' }}>
          {filteredAndSortedPlayers.length} giocatori trovati
        </div>

        {/* Filtri toggle - mobile only. Everything below (role chips, column/sort controls)
            hides behind it so the list doesn't start half a screen down. */}
        {isMobile && (
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              border: `1px solid ${theme.pink}`,
              borderRadius: '0.375rem',
              backgroundColor: showMobileFilters ? theme.pink : 'transparent',
              color: showMobileFilters ? 'white' : theme.pink,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {showMobileFilters ? '▲ Nascondi filtri' : `▼ Filtri${selectedRoles.length ? ` (${selectedRoles.length})` : ''}`}
          </button>
        )}

        {/* Second Line: Role Filter Buttons */}
        {showExtraControls && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
          {availableRoles.map(role => {
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
        </div>
        )}

        {/* Toggle Column Controls Button - Only show in table mode */}
        {showExtraControls && displayMode === 'table' && (
        <button
          onClick={() => setShowColumnControls(!showColumnControls)}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            border: `1px solid ${theme.border}`,
            borderRadius: '0.375rem',
            backgroundColor: showColumnControls ? theme.pink : theme.surfaceAlt,
            color: showColumnControls ? 'white' : theme.text,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          title={showColumnControls ? 'Nascondi controlli colonne' : 'Mostra controlli colonne'}
        >
          {showColumnControls ? 'Nascondi Colonne' : 'Mostra Colonne'}
        </button>
        )}

        {/* Toggle Card Details Button - Only show in card mode */}
        {showExtraControls && displayMode === 'cards' && (
          <button
            onClick={() => {
              setShowCardDetails(!showCardDetails);
              localStorage.setItem('giocatoriShowCardDetails', (!showCardDetails).toString());
            }}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              border: `1px solid ${theme.border}`,
              borderRadius: '0.375rem',
              backgroundColor: showCardDetails ? theme.pink : theme.surfaceAlt,
              color: showCardDetails ? 'white' : theme.text,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            title={showCardDetails ? 'Nascondi statistiche' : 'Mostra statistiche'}
          >
            {showCardDetails ? 'Nascondi Stats' : 'Mostra Stats'}
          </button>
        )}

        {/* Card Sorting Menu - Only show in card mode */}
        {showExtraControls && displayMode === 'cards' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: '500', color: theme.text }}>
              Ordina per:
            </span>
            <select
              value={cardSortConfig.key}
              onChange={(e) => {
                const newSort = { ...cardSortConfig, key: e.target.value };
                setCardSortConfig(newSort);
                localStorage.setItem('giocatoriCardSort', JSON.stringify(newSort));
              }}
              style={{
                padding: '0.5rem',
                fontSize: '0.875rem',
                border: `1px solid ${theme.border}`,
                borderRadius: '0.375rem',
                backgroundColor: theme.surfaceAlt,
                color: theme.text,
                cursor: 'pointer'
              }}
            >
              <option value="fvm">FVM</option>
              <option value="qta">Quotazione (QtA)</option>
              <option value="nome">Nome</option>
              <option value="squadra">Squadra</option>
              <option value="prezzo">Prezzo</option>
              <option value="appetibilita">Appetibilità</option>
              <option value="presenze">{`Presenze ${CUR_SEASON}`}</option>
              <option value="minutiGiocati">{`Minuti Giocati ${CUR_SEASON}`}</option>
              <option value="gol">{`Gol ${CUR_SEASON}`}</option>
              <option value="assist">{`Assist ${CUR_SEASON}`}</option>
              <option value="xG">{`xG ${CUR_SEASON}`}</option>
              <option value="xA">{`xA ${CUR_SEASON}`}</option>
              <option value="ammonizioni">{`Ammonizioni ${CUR_SEASON}`}</option>
              <option value="espulsioni">{`Espulsioni ${CUR_SEASON}`}</option>
              <option value="presenze2025">{`Presenze ${PREV_SEASON}`}</option>
              <option value="minutiGiocati2025">{`Minuti Giocati ${PREV_SEASON}`}</option>
              <option value="gol2025">{`Gol ${PREV_SEASON}`}</option>
              <option value="assist2025">{`Assist ${PREV_SEASON}`}</option>
              <option value="xG2025">{`xG ${PREV_SEASON}`}</option>
              <option value="xA2025">{`xA ${PREV_SEASON}`}</option>
              <option value="ammonizioni2025">{`Ammonizioni ${PREV_SEASON}`}</option>
              <option value="espulsioni2025">{`Espulsioni ${PREV_SEASON}`}</option>
            </select>
            <button
              onClick={() => {
                const newSort = { 
                  ...cardSortConfig, 
                  direction: cardSortConfig.direction === 'asc' ? 'desc' : 'asc' 
                };
                setCardSortConfig(newSort);
                localStorage.setItem('giocatoriCardSort', JSON.stringify(newSort));
              }}
              style={{
                padding: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                border: `1px solid ${theme.border}`,
                borderRadius: '0.375rem',
                backgroundColor: theme.surfaceAlt,
                color: theme.text,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              title={`Ordine ${cardSortConfig.direction === 'asc' ? 'crescente' : 'decrescente'}`}
            >
              {cardSortConfig.direction === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        )}
      </div>

      {/* Column Visibility Controls - Only show in table mode */}
      {showExtraControls && displayMode === 'table' && showColumnControls && (
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
              color: theme.text,
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
                  border: `1px solid ${theme.border}`,
                  borderRadius: '0.25rem',
                  backgroundColor: visibleColumns.size === getColumns().length ? theme.pink : theme.surfaceAlt,
                  color: visibleColumns.size === getColumns().length ? 'white' : theme.text,
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
                  border: `1px solid ${theme.border}`,
                  borderRadius: '0.25rem',
                  backgroundColor: visibleColumns.size === 3 ? theme.danger : theme.surfaceAlt,
                  color: visibleColumns.size === 3 ? 'white' : theme.text,
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
            {/* Quotazioni Section */}
            <div>
              <div style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: theme.text,
                marginBottom: '0.5rem',
                padding: '0.25rem 0.5rem',
                backgroundColor: theme.pinkSoft,
                borderRadius: '0.25rem',
                border: `1px solid ${theme.pink}`
              }}>
                Quotazioni
              </div>
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                flexWrap: 'wrap',
                alignItems: 'center'
              }}>
                {getColumns().filter(column => column === 'QtA' || column === 'FVM').map(column => (
                  <button
                    key={column}
                    onClick={() => toggleColumn(column)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      border: `1px solid ${theme.border}`,
                      borderRadius: '0.25rem',
                      backgroundColor: visibleColumns.has(column) ? theme.success : theme.surfaceAlt,
                      color: visibleColumns.has(column) ? 'white' : theme.text,
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

            {/* Current season section */}
            <div>
              <div style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: theme.text,
                marginBottom: '0.5rem',
                padding: '0.25rem 0.5rem',
                backgroundColor: theme.blueSoft,
                borderRadius: '0.25rem',
                border: `1px solid ${theme.blue}`
              }}>
                {CUR_SEASON}
              </div>
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                flexWrap: 'wrap',
                alignItems: 'center'
              }}>
                {getColumns().filter(column => column.includes(CUR_SEASON)).map(column => (
                  <button
                    key={column}
                    onClick={() => toggleColumn(column)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      border: `1px solid ${theme.border}`,
                      borderRadius: '0.25rem',
                      backgroundColor: visibleColumns.has(column) ? theme.success : theme.surfaceAlt,
                      color: visibleColumns.has(column) ? 'white' : theme.text,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    title={`Toggle ${column}`}
                  >
                    {column.replace(` ${CUR_SEASON}`, '')}
                  </button>
                ))}
              </div>
            </div>

            {/* Previous season section */}
            <div>
              <div style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: theme.text,
                marginBottom: '0.5rem',
                padding: '0.25rem 0.5rem',
                backgroundColor: 'rgba(251, 191, 36, 0.14)',
                borderRadius: '0.25rem',
                border: `1px solid ${theme.warning}`
              }}>
                {PREV_SEASON}
              </div>
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                flexWrap: 'wrap',
                alignItems: 'center'
              }}>
                {getColumns().filter(column => column.includes(PREV_SEASON)).map(column => (
                  <button
                    key={column}
                    onClick={() => toggleColumn(column)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      border: `1px solid ${theme.border}`,
                      borderRadius: '0.25rem',
                      backgroundColor: visibleColumns.has(column) ? theme.success : theme.surfaceAlt,
                      color: visibleColumns.has(column) ? 'white' : theme.text,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    title={`Toggle ${column}`}
                  >
                    {column.replace(` ${PREV_SEASON}`, '')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Card Display */}
      {displayMode === 'cards' && (
        <div style={cardsContainerStyle}>
          {filteredAndSortedPlayers.map((player, index) => {
            const playerId = player.id;
            const status = getPlayerStatus(playerId);
            
            // Parse mantra roles
            let mantraRoles = [];
            if (player['Ruolo Mantra']) {
              if (Array.isArray(player['Ruolo Mantra'])) {
                mantraRoles = player['Ruolo Mantra'];
              } else if (typeof player['Ruolo Mantra'] === 'string') {
                try {
                  const jsonString = player['Ruolo Mantra'].replace(/'/g, '"');
                  mantraRoles = JSON.parse(jsonString);
                } catch (e) {
                  mantraRoles = [player['Ruolo Mantra']];
                }
              } else {
                mantraRoles = [player['Ruolo Mantra']];
              }
            }
            
            return (
              <div
                key={index}
                style={playerCardStyle}
                onMouseEnter={(e) => {
                  Object.assign(e.currentTarget.style, playerCardHoverStyle);
                }}
                onMouseLeave={(e) => {
                  Object.assign(e.currentTarget.style, playerCardStyle);
                }}
              >
                {/* Card Header - First Line: Player Name + Button */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{ fontSize: '1.2rem' }}>
                      {getTrendEmoji(player.Trend)}
                    </span>
                    <div
                      style={{...cardTitleStyle, cursor: 'pointer', color: theme.blue}}
                      onClick={() => navigate(`/player/${player.player_id}`)}
                      title="Click to view player details"
                    >
                      {player.Nome}
                    </div>
                  </div>

                  {/* Button in card header */}
                  {status === 'acquired' && (
                    <button
                      style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        backgroundColor: theme.success,
                        color: 'white',
                        minWidth: '80px'
                      }}
                    >
                      Acquistato
                    </button>
                  )}
                  {status === 'unavailable' && (
                    <button
                      style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        backgroundColor: theme.danger,
                        color: 'white',
                        minWidth: '80px'
                      }}
                    >
                      Non Disp.
                    </button>
                  )}
                  {status === 'available' && (
                    <button
                      onClick={() => handleAcquire(player)}
                      style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        backgroundColor: theme.pink,
                        color: 'white',
                        minWidth: '80px'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = theme.pinkHover;
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = theme.pink;
                      }}
                    >
                      Compra
                    </button>
                  )}
                  {status !== 'available' && (
                    <button
                      onClick={() => handleStatusChange(playerId, 'available')}
                      style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        backgroundColor: theme.textFaint,
                        color: 'white',
                        minWidth: '80px'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = theme.surfaceHover;
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = theme.textFaint;
                      }}
                    >
                      Reset
                    </button>
                  )}
                </div>
                
                {/* Second Line: Role + Team */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem'
                }}>
                  {/* Mantra Roles */}
                  <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                    {mantraRoles.map((role, roleIndex) => {
                      const roleInfo = getRoleInfo(role);
                      return (
                        <span
                          key={roleIndex}
                          style={{
                            padding: '0.125rem 0.375rem',
                            backgroundColor: getRoleColor(role),
                            borderRadius: '0.25rem',
                            fontSize: '0.7rem',
                            color: 'white',
                            fontWeight: '600'
                          }}
                        >
                          {roleInfo.italian}
                        </span>
                      );
                    })}
                  </div>
                  
                  {/* Team */}
                  <div style={{
                    ...cardSquadraStyle,
                    fontSize: '0.8rem',
                    marginBottom: '0'
                  }}>
                    {player.Squadra}
                  </div>
                </div>
                
                {/* Section 1: Quotazioni */}
                <div style={{
                  backgroundColor: theme.blueSoft,
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  marginBottom: '0.5rem'
                }}>
                <div style={cardStatsGrid2Style}>
                  {['QtA', 'FVM'].map((statColumn, statIndex) => {
                    const value = player[statColumn];
                    const isMissing = isMissingData(value);
                    const displayValue = formatValue(value, statColumn);

                    return (
                      <div key={statIndex} style={statItemStyle}>
                        <div style={{
                          ...statValueStyle,
                          color: isMissing ? theme.danger : theme.text
                        }}>
                          {displayValue}
                        </div>
                        <div style={statLabelStyle}>
                          {statColumn}
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
                
                {/* Conditional Stats - Only show when details are enabled */}
                {showCardDetails && (
                  <>
                    
                    {/* Season stats, current vs previous, each with a prev->cur trend spark */}
                    <div style={{
                      backgroundColor: theme.surfaceAlt,
                      padding: '0.5rem',
                      borderRadius: '0.375rem',
                      marginBottom: '0.5rem'
                    }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: '600', color: theme.textFaint, marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        {PREV_SEASON} → {CUR_SEASON}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {['Presenze', ...PER_MATCH_BASES, 'Ammonizioni'].map((base) => {
                          const isPerMatch = PER_MATCH_BASES.includes(base);
                          const rawPrev = player[`${base} ${PREV_SEASON}`];
                          const rawCur = player[`${base} ${CUR_SEASON}`];
                          const avgPrev = isPerMatch ? getPerMatchAverage(player, base, PREV_SEASON) : undefined;
                          const avgCur = isPerMatch ? getPerMatchAverage(player, base, CUR_SEASON) : undefined;
                          // The sparkline tracks the per-match average (comparable across
                          // seasons of different length); Presenze/Ammonizioni have no average
                          // and just track their raw count instead.
                          const sparkPrev = isPerMatch ? avgPrev : rawPrev;
                          const sparkCur = isPerMatch ? avgCur : rawCur;
                          const prevMissing = isMissingData(rawPrev);
                          const curMissing = isMissingData(rawCur);
                          const label = isPerMatch ? PER_MATCH_LABELS[base] : base;

                          // label | prev avg | prev raw | spark | cur avg | cur raw - fixed
                          // tracks so every row (and every card) lines up regardless of how
                          // many digits a given value has; Presenze/Ammonizioni just leave
                          // the "raw" sub-columns empty rather than using a different layout.
                          // On mobile the fixed-width tracks (222px+ before the flexible label
                          // even gets a share) don't fit inside a narrow card, so the raw-value
                          // parenthetical is dropped there and the row collapses to 4 columns.
                          const parenPrev = isPerMatch ? `(${formatValue(rawPrev, base)})` : '';
                          const parenCur = isPerMatch ? `(${formatValue(rawCur, base)})` : '';

                          return (
                            <div key={base} style={{
                              display: 'grid',
                              // minmax(0, 1fr) rather than a bare 1fr so the label can actually
                              // shrink/ellipsize instead of forcing this row (and the card)
                              // wider than its container - see cardsContainerStyle for the same
                              // issue one level up.
                              gridTemplateColumns: isMobile
                                ? 'minmax(0, 1fr) 2.5rem 46px 2.5rem'
                                : 'minmax(0, 1fr) 2.5rem 3rem 46px 2.5rem 3rem',
                              alignItems: 'center',
                              columnGap: '0.25rem',
                              padding: '0.25rem 0.375rem',
                              backgroundColor: theme.surface,
                              borderRadius: '0.25rem',
                              fontVariantNumeric: 'tabular-nums'
                            }}>
                              <span style={{ fontSize: '0.75rem', color: theme.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                              <span
                                style={{ fontSize: '0.8rem', fontWeight: '600', color: prevMissing ? theme.danger : theme.textMuted, textAlign: 'right' }}
                                title={parenPrev || undefined}
                              >
                                {isPerMatch ? formatPerMatchValue(avgPrev, base) : formatValue(rawPrev, base)}
                              </span>
                              {!isMobile && (
                                <span style={{ fontSize: '0.7rem', color: theme.textFaint, textAlign: 'right' }}>
                                  {parenPrev}
                                </span>
                              )}
                              <Sparkline prev={sparkPrev} cur={sparkCur} />
                              <span
                                style={{ fontSize: '0.8rem', fontWeight: '700', color: curMissing ? theme.danger : theme.text, textAlign: 'right' }}
                                title={parenCur || undefined}
                              >
                                {isPerMatch ? formatPerMatchValue(avgCur, base) : formatValue(rawCur, base)}
                              </span>
                              {!isMobile && (
                                <span style={{ fontSize: '0.7rem', color: theme.textFaint, textAlign: 'right' }}>
                                  {parenCur}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </>
                )}
                
              </div>
            );
          })}
        </div>
      )}

      {/* Tooltip Overlay */}
      {hoveredColumn && (
        <div
          style={{
            ...tooltipStyle,
            top: `${mousePosition.y - 40}px`,
            left: `${mousePosition.x}px`,
            transform: 'translateX(-50%)',
            display: 'block'
          }}
        >
          {hoveredColumn}
        </div>
      )}

      {/* Tabella - Only show in table mode */}
      {displayMode === 'table' && (
      <div style={tableContainerStyle}>
        <div style={tableWrapperStyle}>
          <table style={tableStyle}>
          <thead>
            <tr>
              <ColumnHeader columnName="#" content="#">
                  #
              </ColumnHeader>
              <ColumnHeader columnName="Azioni" content="Azioni">
                  Azioni
              </ColumnHeader>
              {visibleColumns.has('Nome') && (
                <ColumnHeader columnName="Nome" content="Nome" onClick={() => handleSort('Nome')}>
                    Nome {getSortIcon('Nome')}
                </ColumnHeader>
              )}
              {visibleColumns.has('Squadra') && (
                <ColumnHeader columnName="Squadra" content="Squadra" onClick={() => handleSort('Squadra')}>
                    Squadra {getSortIcon('Squadra')}
                </ColumnHeader>
              )}
              {visibleColumns.has('Ruolo Mantra') && (
                <ColumnHeader columnName="Ruolo" content="Ruolo">
                    Ruolo
                </ColumnHeader>
              )}
              {columns.filter(column => visibleColumns.has(column) && column !== 'Nome' && column !== 'Squadra' && column !== 'Ruolo Mantra').map(column => (
                <ColumnHeader key={column} columnName={column} content={column} onClick={() => handleSort(column)}>
                    {getColumnAcronym(column)} {getSortIcon(column)}
                </ColumnHeader>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedPlayers.map((player, index) => {
              const playerId = player.id;
              const status = getPlayerStatus(playerId);
              const fantamilioni = getPlayerFantamilioni(playerId);
              
              // Alternating row background color
              const rowStyle = {
                backgroundColor: index % 2 === 0 ? theme.surface : theme.surfaceAlt
              };

              return (
                <tr key={index} style={rowStyle}>
                  <td style={tdStyle}>
                    <div style={{
                      textAlign: 'center',
                      fontWeight: '500',
                      color: theme.textMuted,
                      fontSize: '0.875rem'
                    }}>
                      {index + 1}
                    </div>
                  </td>
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
                            e.target.style.backgroundColor = theme.pinkHover;
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = theme.pink;
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
                            e.target.style.backgroundColor = theme.surfaceHover;
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = theme.textFaint;
                          }}
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </td>
                  {visibleColumns.has('Nome') && (
                    <td style={nameTdStyle}>
                      <div
                        style={{...playerNameStyle, cursor: 'pointer', color: theme.blue}}
                        onClick={() => navigate(`/player/${player.player_id}`)}
                        title="Click to view player details"
                      >
                        {player.Nome}
                      </div>
                      {fantamilioni && (
                        <div style={{ fontSize: '0.75rem', color: theme.pink, fontWeight: '500' }}>
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
                  )}
                  {columns.filter(column => visibleColumns.has(column) && column !== 'Nome' && column !== 'Squadra' && column !== 'Ruolo Mantra').map(column => {
                    const value = player[column];
                    const isMissing = isMissingData(value);
                    const cellStyle = isMissing ? missingDataTdStyle : tdStyle;
                    
                    return (
                      <td key={column} style={cellStyle}>
                        {formatValue(value, column)}
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
      )}
    </div>
  );
};

export default React.memo(MantraGiocatoriTab);
