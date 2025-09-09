import React, { useState, useMemo } from 'react';

const MantraGiocatoriTab = ({ players = [], playerStatus = {}, onPlayerStatusChange, onPlayerAcquire, roles = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [hideAcquired, setHideAcquired] = useState(false);
  
  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState(() => {
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

  // Get all available roles from roles.csv (first column) in CSV order
  const availableRoles = useMemo(() => {
    // Use all roles from the roles.csv file (first column) in the order they appear in CSV
    return roles.map(role => role.Role);
  }, [roles]);

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
      
      const matchesRole = !selectedRole || (() => {
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
        
        return roles.includes(selectedRole);
      })();
      
      // Filter out acquired players if hideAcquired is true
      const playerStatusValue = playerStatus[player.player_id];
      const isNotAcquired = !hideAcquired || !playerStatusValue || (playerStatusValue && playerStatusValue.status !== 'acquired');
      
      // Debug logging
      if (hideAcquired) {
        console.log('🔍 DEBUG: Player:', player.Nome, 'ID:', player.player_id, 'Status:', playerStatusValue, 'Will show:', isNotAcquired);
      }
      
      return matchesSearch && matchesRole && isNotAcquired;
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
  }, [players, searchTerm, selectedRole, sortConfig, hideAcquired, playerStatus]);

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
      return newSet;
    });
  };

  const toggleAllColumns = () => {
    const allColumns = getColumns();
    const allVisible = allColumns.every(col => visibleColumns.has(col));
    
    if (allVisible) {
      // If all are visible, set to minimum configuration
      setVisibleColumns(new Set(['Nome', 'Squadra', 'Ruolo Mantra']));
    } else {
      // If not all are visible, show all
      setVisibleColumns(new Set(allColumns));
    }
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
    overflow: 'auto',
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
    display: 'inline-block'
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
    zIndex: 1000,
    top: '0',
    left: '0',
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
      <div style={filtersStyle}>
        <input
          type="text"
          placeholder="Cerca giocatore o squadra..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={inputStyle}
        />
        
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          style={selectStyle}
        >
          <option value="">Tutti i ruoli</option>
          {availableRoles.map(role => (
            <option key={role} value={role}>
              {roleMapping[role] || role}
            </option>
          ))}
        </select>

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
            }}
            style={{
              width: '1rem',
              height: '1rem',
              cursor: 'pointer'
            }}
          />
          Nascondi acquistati
        </label>

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
            
            {/* ALL button */}
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
            
            {/* Individual column buttons */}
            {getColumns().map(column => (
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
                  transition: 'all 0.2s',
                  maxWidth: '120px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
                title={column}
              >
                {column.length > 15 ? column.substring(0, 15) + '...' : column}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tabella */}
      <div style={tableContainerStyle}>
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
              {columns.filter(column => visibleColumns.has(column) && column !== 'Nome' && column !== 'Squadra' && column !== 'Ruolo Mantra').map(column => (
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
                  {columns.filter(column => visibleColumns.has(column) && column !== 'Nome' && column !== 'Squadra' && column !== 'Ruolo Mantra').map(column => {
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
  );
};

export default MantraGiocatoriTab;
