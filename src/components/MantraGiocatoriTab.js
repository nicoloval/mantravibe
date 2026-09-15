import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCachedData, setCachedData, CACHE_CONFIG } from '../utils/cache';
import { getSeasonLabels, SEASON_STAT_BASES } from '../utils/dataUtils';
import { theme } from '../theme';
import { TrendUpIcon, TrendDownIcon } from '../icons';
import StatTrendTable from './StatTrendTable';

// Pure helpers with no dependency on component state/props - kept at module scope (a stable
// reference across renders) rather than redefined inside the component on every render, which
// is what forced react-hooks/exhaustive-deps to flag every hook that used them further down.

// Checks if data is missing (negative values). Unmatched players (no Understat data) simply
// omit the field (undefined/null) rather than carrying a negative sentinel - both must count
// as missing, or sort comparators that do `!isMissingData(x) ? x : -Infinity` end up comparing
// undefined values (NaN), which silently corrupts the whole sort order.
const isMissingData = (value) => {
  if (value === undefined || value === null) return true;
  return typeof value === 'number' && value < 0;
};

// Per-match averages (goals/assists/xG/xA/minutes divided by appearances), used by both the
// card's prev->cur trend and the table (see getColumnDisplayValue below) - a raw per-season
// total isn't comparable between a season that's only a few matches old and a full previous
// one, so showing it plain was mostly noise rather than an actual trend/comparison. Dividing
// by Presenze keeps both seasons (and every player, regardless of appearances) on the same
// per-appearance scale. Gol Subiti only applies to goalkeepers - see the role filtering where
// this list is used in the table and card rendering below.
const PER_MATCH_BASES = ['Minuti Giocati', 'Gol', 'Assist', 'Gol Subiti', 'xG', 'xA'];
const PER_MATCH_LABELS = {
  'Minuti Giocati': 'Min/Partita',
  'Gol': 'Gol/Partita',
  'Assist': 'Assist/Partita',
  'Gol Subiti': 'Gol Sub./Partita',
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
  // Minutes-per-appearance reads as a whole number (e.g. "68"), like the raw minutes field
  // does; goals/assists/xG/xA per appearance are fractional, so keep 2 decimals.
  return base === 'Minuti Giocati' ? Math.round(value).toString() : value.toFixed(2);
};

const MantraGiocatoriTab = ({ players = [], playerStatus = {}, onPlayerStatusChange, onPlayerAcquire, roles = [], interestedPlayers = {}, onToggleInterested }) => {
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

  const [showOnlyInterested, setShowOnlyInterested] = useState(() => {
    const saved = localStorage.getItem('giocatoriShowOnlyInterested');
    if (saved !== null) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.error('Error parsing saved showOnlyInterested:', error);
      }
    }
    return false;
  });

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState(() => {
    // Try to load from localStorage first
    const savedColumns = localStorage.getItem('giocatoriVisibleColumns');
    const savedSeason = localStorage.getItem('giocatoriVisibleColumnsSeason');
    if (savedColumns) {
      try {
        const saved = new Set(JSON.parse(savedColumns));
        // Current-season columns (e.g. "Gol 2026-2027") are new field names that didn't exist
        // under any previous season - a save from BEFORE that season existed predates them, so
        // it isn't a deliberate "hide this column" choice, just an outdated list, and they're
        // added so a season rollover doesn't silently disappear from the table for existing
        // users. But a save already recorded as being FOR the current season reflects the
        // user's own explicit choices (including hiding a current-season column on purpose) -
        // forcing these back on every load, as this used to do unconditionally, meant
        // current-season columns could never actually stay hidden. Only migrate once per
        // season change, not on every load.
        if (savedSeason !== CUR_SEASON) {
          SEASON_STAT_BASES.forEach(base => saved.add(`${base} ${CUR_SEASON}`));
        }
        return saved;
      } catch (error) {
        console.error('Error parsing saved columns:', error);
      }
    }
    // Default columns match what the card view always shows regardless of the "Mostra Stats"
    // toggle (Nome/Squadra/Ruolo in the card header, QtA/FVM in its top stat pair), so a
    // first-time visitor sees the same information whichever display mode they land in.
    const defaultVisible = new Set(['Nome', 'Squadra', 'Ruolo Mantra', 'QtA', 'FVM']);
    return defaultVisible;
  });

  // Persists alongside giocatoriVisibleColumns (see toggleColumn/toggleAllColumns/
  // hideAllColumns) so the next load can tell "this save reflects deliberate choices for the
  // season that's current right now" from "this save predates the current season and needs the
  // one-time migration above".
  const saveVisibleColumns = (columnsSet) => {
    localStorage.setItem('giocatoriVisibleColumns', JSON.stringify(Array.from(columnsSet)));
    localStorage.setItem('giocatoriVisibleColumnsSeason', CUR_SEASON);
  };
  
  // Column controls visibility state
  const [showColumnControls, setShowColumnControls] = useState(false);

  // Table only: whether PER_MATCH_BASES columns (Gol, Assist, Gol Subiti, xG, xA, Minuti
  // Giocati) show the per-match rate or the raw season total - see getColumnDisplayValue.
  // Presenze/Media Voto/Fantamedia/Ammonizioni/Espulsioni aren't affected either way, they
  // don't have a meaningful relative/absolute split.
  const [tableValueMode, setTableValueMode] = useState(() => {
    return localStorage.getItem('giocatoriTableValueMode') || 'relative';
  });

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

  // Hinted price tooltip for starred players - a native `title` attribute was tried here first,
  // but it gets silently overridden whenever the cursor is over a nested element that has its
  // own title (the star button, the "Compra" name link, ...), which is most of a row/card, so
  // it rarely actually appeared. This is a self-contained hover tooltip instead (own state,
  // driven by mouse events on the row/card itself, not the global column-header one above).
  const [hoveredPrice, setHoveredPrice] = useState(null); // { text, x, y } | null

  // Switching table/cards re-lays out everything under the cursor without firing a
  // mouseleave on whatever was hovered a moment ago - clear a stale tooltip rather than have
  // it linger, pinned to the old coordinates, over whatever now happens to be there.
  useEffect(() => {
    setHoveredPrice(null);
  }, [displayMode]);

  // Mouse handlers for a starred row/card with a hinted price - spread onto the element;
  // returns {} (no-op) when there's no price to show, so it's safe to spread unconditionally.
  const priceHoverHandlers = (price) => {
    if (price == null) return {};
    return {
      onMouseEnter: (e) => setHoveredPrice({ text: `Prezzo indicativo: ${price} FM`, x: e.clientX, y: e.clientY }),
      onMouseMove: (e) => setHoveredPrice(prev => (prev ? { ...prev, x: e.clientX, y: e.clientY } : prev)),
      onMouseLeave: () => setHoveredPrice(null)
    };
  };

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

  // Splits a "{base} {season}" column name (e.g. "Gol 2026-2027") back into its parts, or null
  // if it isn't a season-stat column at all (Nome, Squadra, QtA, ...). Depends on CUR_SEASON/
  // PREV_SEASON (derived from data), so unlike the helpers above this can't be a module-level
  // constant - memoized so getColumnDisplayValue below has a stable reference to depend on.
  const parseSeasonColumn = useCallback((column) => {
    if (column.endsWith(` ${CUR_SEASON}`)) {
      return { base: column.slice(0, -(CUR_SEASON.length + 1)), season: CUR_SEASON };
    }
    if (column.endsWith(` ${PREV_SEASON}`)) {
      return { base: column.slice(0, -(PREV_SEASON.length + 1)), season: PREV_SEASON };
    }
    return null;
  }, [CUR_SEASON, PREV_SEASON]);

  // The table shows the same primary number the cards do for a given column - the per-match
  // rate for PER_MATCH_BASES (a raw season total isn't comparable between a current season
  // that's only a few games old and a full previous one), the field as-is for everything else.
  const getColumnDisplayValue = useCallback((player, column) => {
    const parsed = parseSeasonColumn(column);
    if (parsed && PER_MATCH_BASES.includes(parsed.base) && tableValueMode === 'relative') {
      return getPerMatchAverage(player, parsed.base, parsed.season);
    }
    return player[column];
  }, [parseSeasonColumn, tableValueMode]);

  // Card sort dropdown options - the fixed fields plus one entry per SEASON_STAT_BASES x season,
  // generated from the same canonical list the table columns and card stat rows use so a stat
  // (e.g. Media Voto, Fantamedia) can't end up sortable in one view and missing in the other.
  const cardSortFields = useMemo(() => [
    { key: 'fvm', label: 'FVM', get: (p) => p['FVM'] },
    { key: 'qta', label: 'Quotazione (QtA)', get: (p) => p['QtA'] },
    { key: 'qti', label: 'Quotazione Iniziale (QtI)', get: (p) => p['QtI'] },
    // signed: true - Diff is legitimately negative (quotazione dropped), unlike every other
    // sortable stat here where a negative number means "missing" (see isMissingData). Skips
    // that clamp-to--Infinity treatment below so negative Diffs sort correctly among themselves.
    { key: 'diff', label: 'Diff', signed: true, get: (p) => (typeof p.Diff === 'number' ? p.Diff : 0) },
    { key: 'nome', label: 'Nome', get: (p) => p.Nome || '' },
    { key: 'squadra', label: 'Squadra', get: (p) => p.Squadra || '' },
    { key: 'prezzo', label: 'Prezzo', get: (p) => (typeof p.Prezzo === 'number' ? p.Prezzo : 0) },
    { key: 'appetibilita', label: 'Appetibilità', get: (p) => (typeof p.Appetibilità === 'number' ? p.Appetibilità : 0) },
    // For PER_MATCH_BASES, offer both the absolute (raw season total) and relative (per-match
    // rate) as separate sort options right next to each other - the card itself displays the
    // rate as the primary number, so sorting needs to be able to match that, not just the total.
    ...SEASON_STAT_BASES.flatMap(base => {
      const absolute = { key: `${base}|${CUR_SEASON}`, label: `${base} ${CUR_SEASON}`, get: (p) => p[`${base} ${CUR_SEASON}`] };
      if (!PER_MATCH_BASES.includes(base)) return [absolute];
      const relative = {
        key: `${base}|${CUR_SEASON}|rate`,
        label: `${PER_MATCH_LABELS[base]} ${CUR_SEASON}`,
        get: (p) => getPerMatchAverage(p, base, CUR_SEASON)
      };
      return [absolute, relative];
    }),
    ...SEASON_STAT_BASES.flatMap(base => {
      const absolute = { key: `${base}|${PREV_SEASON}`, label: `${base} ${PREV_SEASON}`, get: (p) => p[`${base} ${PREV_SEASON}`] };
      if (!PER_MATCH_BASES.includes(base)) return [absolute];
      const relative = {
        key: `${base}|${PREV_SEASON}|rate`,
        label: `${PER_MATCH_LABELS[base]} ${PREV_SEASON}`,
        get: (p) => getPerMatchAverage(p, base, PREV_SEASON)
      };
      return [absolute, relative];
    })
  ], [CUR_SEASON, PREV_SEASON]);

  const cardSortFieldMap = useMemo(
    () => Object.fromEntries(cardSortFields.map(field => [field.key, field])),
    [cardSortFields]
  );

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

      const matchesInterested = !showOnlyInterested || Boolean(interestedPlayers[player.id]);

      return matchesSearch && matchesRole && isNotAcquired && matchesInterested;
    });
    

    // Sort players
    if (displayMode === 'cards') {
      // For card display mode, use the selected card sort configuration
      const field = cardSortFieldMap[cardSortConfig.key] || cardSortFieldMap['fvm'];
      filtered.sort((a, b) => {
        let aVal = field.get(a);
        let bVal = field.get(b);

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return cardSortConfig.direction === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }

        if (field.signed) {
          aVal = typeof aVal === 'number' ? aVal : 0;
          bVal = typeof bVal === 'number' ? bVal : 0;
        } else {
          aVal = !isMissingData(aVal) ? aVal : -Infinity;
          bVal = !isMissingData(bVal) ? bVal : -Infinity;
        }
        return cardSortConfig.direction === 'asc'
          ? aVal - bVal
          : bVal - aVal;
      });
    } else if (sortConfig.key) {
      // For table mode, use the selected sort column - via getColumnDisplayValue so sorting a
      // per-match column (e.g. Gol) orders by the same rate the column actually displays,
      // rather than the raw total underneath it.
      filtered.sort((a, b) => {
        let aVal = getColumnDisplayValue(a, sortConfig.key);
        let bVal = getColumnDisplayValue(b, sortConfig.key);

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
  }, [players, searchTerm, selectedRoles, sortConfig, hideAcquired, playerStatus, displayMode, cardSortConfig, cardSortFieldMap, getColumnDisplayValue, showOnlyInterested, interestedPlayers]);

  // Progressive rendering: with up to ~595 players, building every row/card's DOM up front made
  // every keystroke in the search box (and every sort/filter change) rebuild all of them at
  // once - the actual jank source at this list size, more so than any single row re-rendering.
  // Instead, only the first PAGE_SIZE results mount initially; a sentinel element at the end of
  // the list reveals PAGE_SIZE more once it scrolls into view. Resets to PAGE_SIZE whenever the
  // filtered/sorted result set itself changes (new search term, role filter, sort, etc.) - this
  // is a cheaper stand-in for full virtualization (react-window) that doesn't require replacing
  // the table's native <table> auto-sizing with fixed pixel column widths.
  const PAGE_SIZE = 60;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filteredAndSortedPlayers]);

  // Kept in a ref rather than a dependency so this callback ref keeps a stable identity - table
  // and card mode each render their own sentinel element (mutually exclusive, never both at
  // once), so this needs to reattach whenever the sentinel DOM node itself changes, not on every
  // filteredAndSortedPlayers change. React 19 supports returning a cleanup function directly
  // from a callback ref.
  const totalCountRef = useRef(filteredAndSortedPlayers.length);
  totalCountRef.current = filteredAndSortedPlayers.length;

  const loadMoreSentinelRef = useCallback((node) => {
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount(prev => Math.min(prev + PAGE_SIZE, totalCountRef.current));
      }
    }, { rootMargin: '600px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const visiblePlayers = useMemo(
    () => filteredAndSortedPlayers.slice(0, visibleCount),
    [filteredAndSortedPlayers, visibleCount]
  );
  const hasMorePlayers = visibleCount < filteredAndSortedPlayers.length;

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };



  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return '↕';
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
      'QtI': 'QtI',
      'QtA': 'QtA',
      'FVM': 'FVM',
      'Diff': 'Diff',
      'Presenze': 'P',
      'Minuti Giocati': 'MG',
      'Media Voto': 'MV',
      'Fantamedia': 'FM',
      'Gol': 'G',
      'Assist': 'A',
      'Gol Subiti': 'GS',
      'xG': 'xG',
      'xA': 'xA',
      'Ammonizioni': 'Amm',
      'Espulsioni': 'Esp'
    };

    if (baseAcronyms[columnName]) return baseAcronyms[columnName];

    // PER_MATCH_BASES columns show a per-match rate rather than the raw total while
    // tableValueMode is 'relative' (see getColumnDisplayValue) - the "/P" marks that in the
    // header so it isn't mistaken for a total, and disappears once switched to absolute.
    const seasonSuffix = (season) => season.slice(2, 4); // '2026-2027' -> '26'
    if (columnName.endsWith(` ${CUR_SEASON}`)) {
      const base = columnName.slice(0, -(CUR_SEASON.length + 1));
      const perMatchMarker = (PER_MATCH_BASES.includes(base) && tableValueMode === 'relative') ? '/P' : '';
      return (baseAcronyms[base] || base) + perMatchMarker + seasonSuffix(CUR_SEASON);
    }
    if (columnName.endsWith(` ${PREV_SEASON}`)) {
      const base = columnName.slice(0, -(PREV_SEASON.length + 1));
      const perMatchMarker = (PER_MATCH_BASES.includes(base) && tableValueMode === 'relative') ? '/P' : '';
      return (baseAcronyms[base] || base) + perMatchMarker + seasonSuffix(PREV_SEASON);
    }

    return columnName.substring(0, 8);
  };

  // Helper function to get a trend indicator - an icon when there's a clear direction (no text
  // otherwise conveys this), plain "=" when flat/unknown.
  const getTrendIcon = (trend) => {
    if (!trend) return '=';
    const trendLower = trend.toLowerCase();
    if (trendLower.includes('up') || trendLower.includes('crescita') || trendLower.includes('positivo')) {
      return <TrendUpIcon size={16} color={theme.success} />;
    } else if (trendLower.includes('down') || trendLower.includes('calo') || trendLower.includes('negativo')) {
      return <TrendDownIcon size={16} color={theme.danger} />;
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

  // Diff (week-over-week quotazione change) is signed - unlike every other stat, a negative
  // value is a real, meaningful reading (price dropped) rather than isMissingData's "no data"
  // sentinel, so it needs its own formatting/coloring instead of formatValue's.
  const formatDiff = (value) => {
    if (typeof value !== 'number') return '-';
    return value > 0 ? `+${value}` : String(value);
  };

  const getDiffColor = (value) => {
    if (typeof value !== 'number') return theme.textMuted;
    if (value > 0) return theme.success;
    if (value < 0) return theme.danger;
    return theme.textMuted;
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
      saveVisibleColumns(newSet);
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
    saveVisibleColumns(newColumns);
  };

  const hideAllColumns = () => {
    // Hide all columns except the essential ones
    const essentialColumns = new Set(['Nome', 'Squadra', 'Ruolo Mantra']);
    setVisibleColumns(essentialColumns);
    saveVisibleColumns(essentialColumns);
  };

  // Get all possible columns from the first player
  const getColumns = () => {
    if (players.length === 0) return [];
    
    const firstPlayer = players[0];
    const excludeColumns = ['Ruolo Mantra', 'player_id']; // We'll handle these separately
    
    // SEASON_STAT_BASES (src/utils/dataUtils.js) is the canonical stat list shared with the
    // player cards and the player detail page - edit it there, not here, to add/remove a stat
    // everywhere at once. The table itself isn't per-role (columns are shared by every row), so
    // it includes every base regardless of role restriction - Gol Subiti's column just reads
    // "-" for non-goalkeeper rows, see the cell renderer below.
    const customFields = [
      'Nome',
      'Squadra',
      'QtI',
      'QtA',
      'FVM',
      'Diff',
      ...SEASON_STAT_BASES.map(base => `${base} ${CUR_SEASON}`),
      ...SEASON_STAT_BASES.map(base => `${base} ${PREV_SEASON}`)
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
    minWidth: '90px',
    maxWidth: '150px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontSize: '0.875rem'
  };

  // Azioni column (star + Compra/status) - no minWidth floor, so it shrinks to fit its buttons
  // instead of matching every other column's default minimum.
  const actionsTdStyle = {
    ...tdStyle,
    minWidth: '0',
    padding: '0.35rem 0.25rem'
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
    gap: '0.3rem',
    alignItems: 'center'
  };

  const buttonStyle = {
    padding: '0.2rem 0.35rem',
    borderRadius: '0.25rem',
    border: `1px solid ${theme.border}`,
    backgroundColor: theme.surfaceAlt,
    color: theme.text,
    fontSize: '0.7rem',
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

  const cardStatsGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
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
      {/* Filtri - a single left-aligned, wrapping toolbar rather than several separately
          centered lines, so wide desktop viewports pack everything onto 1-2 rows (using the
          full width) while narrow/mobile viewports still wrap each item onto its own line. */}
      <div style={{
        ...filtersStyle,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        alignItems: 'stretch'
      }}>
        {/* First Line: Search, Hide Acquired, Solo Preferiti, Display Mode Toggle, result count */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'flex-start',
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

          {/* Toggle for showing only starred/interesting players */}
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
              checked={showOnlyInterested}
              onChange={(e) => {
                setShowOnlyInterested(e.target.checked);
                localStorage.setItem('giocatoriShowOnlyInterested', JSON.stringify(e.target.checked));
              }}
              style={{
                width: '1rem',
                height: '1rem',
                cursor: 'pointer'
              }}
            />
            ★ Solo preferiti
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
            {displayMode === 'table' ? 'Carte' : 'Tabella'}
          </button>

          <div style={{ color: theme.textMuted, fontSize: '0.875rem', marginLeft: isMobile ? 0 : 'auto' }}>
            {hasMorePlayers
              ? `${visiblePlayers.length} di ${filteredAndSortedPlayers.length} giocatori trovati`
              : `${filteredAndSortedPlayers.length} giocatori trovati`}
          </div>
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

        {/* Second Line: Role Filter Buttons (left) + view controls (right, table: Colonne/
            Assoluti - cards: Stats/Ordina) - one wrapping row instead of up to three stacked
            ones, so desktop uses the full width and only wraps when it actually runs out of it. */}
        {showExtraControls && (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-start' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
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

          {/* Toggle Column Controls + Relative/Absolute Value Toggle - table mode only */}
          {displayMode === 'table' && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginLeft: isMobile ? 0 : 'auto' }}>
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

            {/* Relative (per-match rate) / Absolute (raw season total) toggle for Gol, Assist,
                Gol Subiti, xG, xA, Minuti Giocati columns - Presenze/Media Voto/Fantamedia/
                Ammonizioni/Espulsioni are unaffected, they don't have both forms. */}
            <button
              onClick={() => {
                const newMode = tableValueMode === 'relative' ? 'absolute' : 'relative';
                setTableValueMode(newMode);
                localStorage.setItem('giocatoriTableValueMode', newMode);
              }}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                border: `1px solid ${theme.border}`,
                borderRadius: '0.375rem',
                backgroundColor: theme.surfaceAlt,
                color: theme.text,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              title="Cambia Gol, Assist, Gol Subiti, xG, xA e Minuti Giocati tra media a partita e totale stagionale"
            >
              {tableValueMode === 'relative' ? 'Mostra Assoluti' : 'Mostra Relativi'}
            </button>
          </div>
          )}

          {/* Toggle Card Details + Card Sorting Menu - card mode only */}
          {displayMode === 'cards' && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginLeft: isMobile ? 0 : 'auto' }}>
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
              {cardSortFields.map(field => (
                <option key={field.key} value={field.key}>{field.label}</option>
              ))}
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
                {getColumns().filter(column => ['QtI', 'QtA', 'FVM', 'Diff'].includes(column)).map(column => (
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
          {visiblePlayers.map((player, index) => {
            const playerId = player.id;
            const status = getPlayerStatus(playerId);
            const interestedEntry = interestedPlayers[playerId];
            const isInterested = Boolean(interestedEntry);
            const interestedPrice = interestedEntry?.price;
            // Hovering a starred card reveals its hinted price via a custom tooltip (see
            // priceHoverHandlers) - no hover on touch devices, so it's also shown as small
            // text below (mobile only).
            const cardPriceHover = priceHoverHandlers(isInterested ? interestedPrice : null);
            const cardBaseStyle = isInterested
              ? { ...playerCardStyle, backgroundColor: theme.starSoft, borderColor: theme.star }
              : playerCardStyle;
            const cardHoveredStyle = isInterested
              ? { ...playerCardHoverStyle, backgroundColor: theme.starSoft, borderColor: theme.star }
              : playerCardHoverStyle;

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
                style={cardBaseStyle}
                onMouseEnter={(e) => {
                  Object.assign(e.currentTarget.style, cardHoveredStyle);
                  cardPriceHover.onMouseEnter?.(e);
                }}
                onMouseMove={cardPriceHover.onMouseMove}
                onMouseLeave={(e) => {
                  Object.assign(e.currentTarget.style, cardBaseStyle);
                  cardPriceHover.onMouseLeave?.(e);
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
                      {getTrendIcon(player.Trend)}
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
                    <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                      <button
                        onClick={() => onToggleInterested(player)}
                        title={isInterested ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
                        style={{
                          padding: '0.5rem 0.625rem',
                          fontSize: '1rem',
                          lineHeight: 1,
                          fontWeight: '600',
                          border: 'none',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          backgroundColor: isInterested ? theme.star : theme.surfaceAlt,
                          color: isInterested ? 'white' : theme.textMuted
                        }}
                      >
                        {isInterested ? '★' : '☆'}
                      </button>
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
                    </div>
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

                  {/* Hinted price - hover reveals it on desktop (see the card's title attribute
                      above), but touch devices have no hover, so show it here on mobile. */}
                  {isMobile && isInterested && interestedPrice != null && (
                    <div style={{ fontSize: '0.75rem', color: theme.star, fontWeight: '600' }}>
                      ★ {interestedPrice} FM
                    </div>
                  )}
                </div>

                {/* Section 1: Quotazioni */}
                <div style={{
                  backgroundColor: theme.blueSoft,
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  marginBottom: '0.5rem'
                }}>
                <div style={cardStatsGridStyle}>
                  {['QtI', 'QtA', 'FVM', 'Diff'].map((statColumn, statIndex) => {
                    const value = player[statColumn];
                    const isDiff = statColumn === 'Diff';
                    const isMissing = !isDiff && isMissingData(value);
                    const displayValue = isDiff ? formatDiff(value) : formatValue(value, statColumn);
                    const valueColor = isDiff ? getDiffColor(value) : (isMissing ? theme.danger : theme.text);

                    return (
                      <div key={statIndex} style={statItemStyle}>
                        <div style={{
                          ...statValueStyle,
                          color: valueColor
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
                  <div style={{ marginBottom: '0.5rem' }}>
                    <StatTrendTable player={player} curSeason={CUR_SEASON} prevSeason={PREV_SEASON} />
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* Sentinel for progressive loading - see the visiblePlayers/PAGE_SIZE comment above. */}
      {displayMode === 'cards' && hasMorePlayers && (
        <div ref={loadMoreSentinelRef} style={{ padding: '1rem', textAlign: 'center', color: theme.textFaint, fontSize: '0.8rem' }}>
          Caricamento altri giocatori...
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

      {/* Hinted price tooltip - see hoveredPrice above */}
      {hoveredPrice && (
        <div
          style={{
            ...tooltipStyle,
            top: `${hoveredPrice.y - 40}px`,
            left: `${hoveredPrice.x}px`,
            transform: 'translateX(-50%)',
            display: 'block',
            backgroundColor: theme.star,
            color: 'white',
            border: 'none',
            fontWeight: '700'
          }}
        >
          {hoveredPrice.text}
        </div>
      )}

      {/* Tabella - Only show in table mode */}
      {displayMode === 'table' && (
      <div style={tableContainerStyle}>
        <div style={tableWrapperStyle}>
          <table style={tableStyle}>
          <thead>
            <tr>
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
              {columns.filter(column => visibleColumns.has(column) && column !== 'Nome' && column !== 'Squadra' && column !== 'Ruolo Mantra').map(column => {
                const parsed = parseSeasonColumn(column);
                const tooltipContent = parsed && PER_MATCH_BASES.includes(parsed.base) && tableValueMode === 'relative'
                  ? `${column} (media a partita)`
                  : column;
                return (
                  <ColumnHeader key={column} columnName={column} content={tooltipContent} onClick={() => handleSort(column)}>
                      {getColumnAcronym(column)} {getSortIcon(column)}
                  </ColumnHeader>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visiblePlayers.map((player, index) => {
              const playerId = player.id;
              const status = getPlayerStatus(playerId);
              const fantamilioni = getPlayerFantamilioni(playerId);
              const interestedEntry = interestedPlayers[playerId];
              const isInterested = Boolean(interestedEntry);
              const interestedPrice = interestedEntry?.price;

              // Alternating row background color, overridden with a golden tint + left border
              // for starred players so they stand out regardless of the zebra stripe underneath.
              const rowStyle = {
                backgroundColor: isInterested ? theme.starSoft : (index % 2 === 0 ? theme.surface : theme.surfaceAlt),
                borderLeft: `3px solid ${isInterested ? theme.star : 'transparent'}`
              };
              // Hovering a starred row reveals its hinted price via a custom tooltip (see
              // priceHoverHandlers) - no hover on touch devices, so it's also shown as small
              // text below (mobile only).

              return (
                <tr key={index} style={rowStyle} {...priceHoverHandlers(isInterested ? interestedPrice : null)}>
                  <td style={actionsTdStyle}>
                    <div style={actionsStyle}>
                      {status === 'acquired' && (
                        <span style={acquiredStatusStyle}>Acquistato</span>
                      )}
                      {status === 'unavailable' && (
                        <span style={unavailableStatusStyle}>Non Disp.</span>
                      )}
                      {status === 'available' && (
                        <>
                        <button
                          onClick={() => onToggleInterested(player)}
                          title={isInterested ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
                          style={{
                            ...buttonStyle,
                            padding: '0.25rem 0.4rem',
                            fontSize: '0.875rem',
                            lineHeight: 1,
                            backgroundColor: isInterested ? theme.star : theme.surfaceAlt,
                            color: isInterested ? 'white' : theme.textMuted,
                            borderColor: isInterested ? theme.star : theme.border
                          }}
                        >
                          {isInterested ? '★' : '☆'}
                        </button>
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
                        </>
                      )}
                      {isMobile && isInterested && interestedPrice != null && (
                        <span style={{ fontSize: '0.7rem', color: theme.star, fontWeight: '600' }}>
                          {interestedPrice} FM
                        </span>
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
                        style={{
                          ...playerNameStyle,
                          cursor: 'pointer',
                          color: theme.blue,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        onClick={() => navigate(`/player/${player.player_id}`)}
                        title={player.Nome}
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
                    // Gol Subiti only means something for goalkeepers - "-" for everyone else
                    // isn't missing data (which gets flagged red via missingDataTdStyle), it's
                    // just not applicable to the role.
                    const notApplicable = column.startsWith('Gol Subiti ') && player.Ruolo !== 'POR';
                    const parsed = parseSeasonColumn(column);
                    const showingRate = parsed && PER_MATCH_BASES.includes(parsed.base) && tableValueMode === 'relative';
                    const isDiff = column === 'Diff';
                    const value = getColumnDisplayValue(player, column);
                    const isMissing = !notApplicable && !isDiff && isMissingData(value);
                    const cellStyle = isMissing ? missingDataTdStyle : tdStyle;
                    const displayText = notApplicable
                      ? '-'
                      : isDiff
                        ? formatDiff(value)
                        : showingRate
                          ? formatPerMatchValue(value, parsed.base)
                          : formatValue(value, column);

                    return (
                      <td key={column} style={isDiff ? { ...cellStyle, color: getDiffColor(value), fontWeight: '600' } : cellStyle}>
                        {displayText}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {hasMorePlayers && (
              <tr ref={loadMoreSentinelRef}>
                <td colSpan={100} style={{ ...tdStyle, textAlign: 'center', color: theme.textFaint }}>
                  Caricamento altri giocatori...
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
      )}
    </div>
  );
};

export default React.memo(MantraGiocatoriTab);
