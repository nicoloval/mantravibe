import React, { useEffect, useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import FantamilioniBar from './components/FantamilioniBar';
import InterestPriceBar from './components/InterestPriceBar';
import Header from './components/Header';
import RosaAcquistata from './components/RosaAcquistata';
import MantraGiocatoriTab from './components/MantraGiocatoriTab';
import SquadreTab from './components/SquadreTab';
import Settings from './components/Settings';
import PlayerPage from './components/PlayerPage';
import { loadBudget, loadPlayerStatus, saveBudget, savePlayerStatus, updatePlayerStatus, loadInterestedPlayers, saveInterestedPlayers } from './utils/storage';
import { theme, applyThemeMode, getStoredThemeMode } from './theme';

const App = () => {
  // Stati principali
  const [mantraData, setMantraData] = useState([]);
  const [rolesData, setRolesData] = useState([]);
  const [formations, setFormations] = useState({});
  
  // Debug effect to track rolesData changes
  useEffect(() => {
    // rolesData state changed
  }, [rolesData]);
  const [appetibilitaData, setAppetibilitaData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('giocatori');

  // Window width, tracked for mobile-responsive layout (tab bar padding, etc.)
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const isMobile = windowWidth <= 768;

  // Independent player status and budget for each mode
  const [normalPlayerStatus, setNormalPlayerStatus] = useState({});
  const [mantraPlayerStatus, setMantraPlayerStatus] = useState({});
  const [normalBudget, setNormalBudget] = useState(500);
  const [mantraBudget, setMantraBudget] = useState(500);

  // Players marked as "interesting" (a watchlist, independent of acquired/available/unavailable
  // status) with an optional hinted price - see InterestPriceBar.
  const [interestedPlayers, setInterestedPlayers] = useState({});
  const [playerToMarkInterested, setPlayerToMarkInterested] = useState(null);
  
  // Min/Max players settings
  const [minPlayers, setMinPlayers] = useState(() => {
    try {
      return parseInt(localStorage.getItem('minPlayers')) || 21;
    } catch {
      return 21;
    }
  });
  const [maxPlayers, setMaxPlayers] = useState(() => {
    try {
      return parseInt(localStorage.getItem('maxPlayers')) || 30;
    } catch {
      return 30;
    }
  });

  // Flag per evitare salvataggi durante l'inizializzazione
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Popup state for the declaration
  const [showDeclarationPopup, setShowDeclarationPopup] = useState(() => {
    try {
      return !localStorage.getItem('declarationAccepted');
    } catch {
      return true;
    }
  });

  // Stati per la barra fantamilioni
  const [playerToAcquire, setPlayerToAcquire] = useState(null);

  // Handle declaration acceptance
  const handleDeclarationAccept = useCallback(() => {
    try {
      localStorage.setItem('declarationAccepted', 'true');
      setShowDeclarationPopup(false);
    } catch (error) {
      console.error('Error saving declaration acceptance:', error);
      setShowDeclarationPopup(false);
    }
  }, []);

  // Settings state
  const [showSettings, setShowSettings] = useState(false);

  // Light/dark theme mode - index.html applies the stored choice before React mounts (to
  // avoid a flash of the wrong theme); this just keeps this component's state, the toggle
  // button's icon, and localStorage in sync with it from here on.
  const [themeMode, setThemeMode] = useState(getStoredThemeMode);
  const toggleThemeMode = useCallback(() => {
    setThemeMode(prev => applyThemeMode(prev === 'light' ? 'dark' : 'light'));
  }, []);


  // Teams state for Squadre tab
  const [teams, setTeams] = useState([]);

  // Function to synchronize teams with player status
  const synchronizeTeamsWithPlayerStatus = useCallback((teamsData, playerStatusData) => {
    
    // Filter out players from teams that are not in player status as 'acquired'
    const synchronizedTeams = teamsData.map(team => ({
      ...team,
      players: team.players.filter(player => {
        const playerStatus = playerStatusData[player.id];
        const isAcquired = playerStatus && playerStatus.status === 'acquired';
        if (!isAcquired) {
          // Remove player from team - not acquired in player status
        }
        return isAcquired;
      })
    }));
    
    return synchronizedTeams;
  }, []);

  // Handle teams changes from SquadreTab
  const handleTeamsChange = useCallback((newTeams) => {
    setTeams(newTeams);
  }, []);

  // Always use mantra mode data
  const currentPlayerStatus = mantraPlayerStatus;
  const currentBudget = mantraBudget;


  // Salva automaticamente lo status dei giocatori normali
  useEffect(() => {
    // Non salvare durante l'inizializzazione
    if (!isInitialized) {
      return;
    }
    savePlayerStatus(normalPlayerStatus, 'normal');
  }, [normalPlayerStatus, isInitialized]);

  // Salva automaticamente lo status dei giocatori mantra
  useEffect(() => {
    // Non salvare durante l'inizializzazione
    if (!isInitialized) {
      return;
    }
    savePlayerStatus(mantraPlayerStatus, 'mantra');
  }, [mantraPlayerStatus, isInitialized]);

  // Salva automaticamente i giocatori preferiti
  useEffect(() => {
    if (!isInitialized) {
      return;
    }
    saveInterestedPlayers(interestedPlayers);
  }, [interestedPlayers, isInitialized]);

  // Salva automaticamente il budget normale
  useEffect(() => {
    // Non salvare durante l'inizializzazione
    if (!isInitialized) {
      return;
    }
    saveBudget(normalBudget, 'normal');
  }, [normalBudget, isInitialized]);

  // Salva automaticamente il budget mantra
  useEffect(() => {
    // Non salvare durante l'inizializzazione
    if (!isInitialized) {
      return;
    }
    saveBudget(mantraBudget, 'mantra');
  }, [mantraBudget, isInitialized]);

  // Synchronize teams with player status whenever player status changes
  useEffect(() => {
    if (!isInitialized || teams.length === 0) return;
    
    const synchronizedTeams = synchronizeTeamsWithPlayerStatus(teams, mantraPlayerStatus);
    
    // Only update if there are changes
    const hasChanges = JSON.stringify(teams) !== JSON.stringify(synchronizedTeams);
    if (hasChanges) {
      setTeams(synchronizedTeams);
    }
  }, [mantraPlayerStatus, isInitialized, teams, synchronizeTeamsWithPlayerStatus]);

  // Caricamento automatico del file dalla cartella public

  // Caricamento dati Mantra mode
  const loadMantraData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Carica final.json
      const finalResponse = await fetch('/data/final.json');
      if (finalResponse.ok) {
        const finalJson = await finalResponse.json();
        // Use the unique player_id from final.json as the id
        const mantraDataWithIds = finalJson.map(player => ({
          ...player,
          id: player.player_id.toString() // Use the unique player_id from final.json
        }));
        setMantraData(mantraDataWithIds);
      } else {
        setError('File final.json non trovato nella cartella public/data/.');
        return;
      }

      // Carica roles.csv
      const rolesResponse = await fetch(`/data/roles.csv?t=${Date.now()}`);
      
      if (rolesResponse.ok) {
        const rolesText = await rolesResponse.text();
        const rolesLines = rolesText.split('\n').filter(line => line.trim());
        const roles = rolesLines.slice(1).map(line => {
          // roles.csv columns: Role,Ruolo,Appetibilita,Color
          const parts = line.split(',');
          return {
            Role: parts[0]?.trim() || '',
            Ruolo: parts[1]?.trim() || '',
            Appetibilita: parts[2]?.trim() || '',
            Color: parts[3]?.trim() || ''
          };
        }).filter(role => {
          const isValid = role.Role && role.Ruolo; // Make Color optional for now
          return isValid;
        }); // Only keep complete entries
        setRolesData(roles);
      } else {
        console.error('🔍 DEBUG: Failed to load roles.csv:', rolesResponse.status, rolesResponse.statusText);
        setError('File roles.csv non trovato nella cartella public/data/.');
        return;
      }

      // Carica appetibilita.json
      const appetibilitaResponse = await fetch('/assets/appetibilita.json');
      if (appetibilitaResponse.ok) {
        const appetibilitaJson = await appetibilitaResponse.json();
        setAppetibilitaData(appetibilitaJson);
      } else {
        setError('File appetibilita.json non trovato nella cartella public/assets/.');
        return;
      }

      // Carica formations
      const formationsResponse = await fetch('/assets/mantra_formations_positions.json');
      if (formationsResponse.ok) {
        const formationsJson = await formationsResponse.json();
        setFormations(formationsJson);
      } else {
        setError('File mantra_formations_positions.json non trovato nella cartella public/assets/.');
        return;
      }
    } catch (err) {
      setError('Errore nel caricamento dei dati Mantra.');
      console.error('Errore caricamento Mantra:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carica status giocatori all'avvio
  useEffect(() => {
    // Load separate data for each mode
    const normalStatus = loadPlayerStatus('normal');
    const mantraStatus = loadPlayerStatus('mantra');
    const normalSavedBudget = loadBudget('normal');
    const mantraSavedBudget = loadBudget('mantra');
    
    
    setNormalPlayerStatus(normalStatus);
    setMantraPlayerStatus(mantraStatus);
    setNormalBudget(normalSavedBudget);
    setMantraBudget(mantraSavedBudget);
    setInterestedPlayers(loadInterestedPlayers());
    
    // Load teams from localStorage
    try {
      const savedTeams = localStorage.getItem('fantacalcio_teams');
      const teamsData = savedTeams ? JSON.parse(savedTeams) : [];
      const validTeams = Array.isArray(teamsData) ? teamsData : [];
      setTeams(validTeams);
    } catch (error) {
      console.error('Error loading teams from localStorage:', error);
      setTeams([]);
    }
    
    // Segna come inizializzato DOPO aver caricato i dati
    setIsInitialized(true);
    
    loadMantraData();
  }, [loadMantraData]);

  // Gestione status giocatori
  const handlePlayerStatusChange = (playerId, status, fantamilioni = null) => {
    const newStatus = updatePlayerStatus(mantraPlayerStatus, playerId, status, fantamilioni);
    setMantraPlayerStatus(newStatus);
  };

  // Gestione acquisto giocatore con fantamilioni
  const handlePlayerAcquire = (player) => {
    setPlayerToAcquire(player);
  };

  // Toggle "interessato" per un giocatore - se già presente lo rimuove direttamente (come
  // Reset per lo status), altrimenti apre InterestPriceBar per il prezzo indicativo opzionale.
  const handleToggleInterested = (player) => {
    if (interestedPlayers[player.id]) {
      setInterestedPlayers(prev => {
        const next = { ...prev };
        delete next[player.id];
        return next;
      });
    } else {
      setPlayerToMarkInterested(player);
    }
  };

  const handleInterestConfirm = (price) => {
    if (playerToMarkInterested) {
      setInterestedPlayers(prev => ({
        ...prev,
        [playerToMarkInterested.id]: { price, timestamp: new Date().toISOString() }
      }));
      setPlayerToMarkInterested(null);
    }
  };

  const handleInterestCancel = () => {
    setPlayerToMarkInterested(null);
  };

  const handleFantamilioniConfirm = (teamId, fantamilioni) => {
    if (playerToAcquire) {
      handlePlayerStatusChange(playerToAcquire.id, 'acquired', fantamilioni);
      
      // Add player to the selected team
      if (teamId) {
        const teamIdInt = parseInt(teamId);
        
        // Update teams state directly
        setTeams(prevTeams => {
          const updatedTeams = prevTeams.map(team =>
            team.id === teamIdInt
              ? {
                  ...team,
                  players: [...(team.players || []), { ...playerToAcquire, price: fantamilioni }]
                }
              : team
          );
          
          // Save to localStorage
          localStorage.setItem('fantacalcio_teams', JSON.stringify(updatedTeams));
          
          return updatedTeams;
        });
        
        // Also try the window method as backup
        if (window.addPlayerToTeam) {
          window.addPlayerToTeam(teamIdInt, playerToAcquire, fantamilioni);
        }
      }
      
      setPlayerToAcquire(null);
    }
  };

  // Gestione cambio budget
  const handleBudgetChange = (newBudget) => {
    setMantraBudget(newBudget);
  };

  // Gestione cambio min/max giocatori
  const handleMinPlayersChange = (newMinPlayers) => {
    setMinPlayers(newMinPlayers);
    localStorage.setItem('minPlayers', newMinPlayers.toString());
  };

  const handleMaxPlayersChange = (newMaxPlayers) => {
    setMaxPlayers(newMaxPlayers);
    localStorage.setItem('maxPlayers', newMaxPlayers.toString());
  };


  const handleFantamilioniCancel = () => {
    setPlayerToAcquire(null);
  };


  // Tab configuration - always mantra mode
  const tabs = [
    { 
      id: 'giocatori', 
      label: 'Giocatori', 
      description: 'Cerca e visualizza tutti i giocatori con statistiche e classifiche'
    },
    { 
      id: 'rosa', 
      label: 'La Mia Rosa', 
      description: 'Visualizza i giocatori che hai acquistato e gestisci il budget'
    },
    { 
      id: 'squadre', 
      label: 'Squadre', 
      description: 'Gestisci e visualizza le informazioni delle squadre'
    }
  ];

  // Stili
  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: theme.bg,
    color: theme.text
  };

  const tabsContainerStyle = {
    display: 'flex',
    justifyContent: 'center',
    padding: '0 1rem',
    backgroundColor: theme.surface,
    borderBottom: `1px solid ${theme.border}`
  };

  const tabButtonStyle = {
    padding: isMobile ? '1rem 0.75rem' : '1rem 2rem',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: isMobile ? '0.9rem' : '1rem',
    fontWeight: '500',
    color: theme.textMuted,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    borderBottom: '3px solid transparent',
    transition: 'all 0.2s ease',
    position: 'relative',
    whiteSpace: 'nowrap',
    flex: isMobile ? '1 1 0' : '0 0 auto',
    justifyContent: 'center'
  };

  const activeTabStyle = {
    ...tabButtonStyle,
    color: theme.text,
    borderBottomColor: theme.pink,
    fontWeight: '600'
  };

  const tabContentStyle = {
    flex: 1
  };

  // Settings functions

  const handleReset = () => {
    // Reset all data
    setMantraPlayerStatus({});
    setNormalPlayerStatus({});
    setMantraBudget(500);
    setNormalBudget(500);
    setTeams([]);
    setMinPlayers(21);
    setMaxPlayers(30);
    
    // Clear localStorage
    localStorage.removeItem('playerStatus_mantra');
    localStorage.removeItem('playerStatus_normal');
    localStorage.removeItem('budget_mantra');
    localStorage.removeItem('budget_normal');
    localStorage.removeItem('teams');
    localStorage.removeItem('minPlayers');
    localStorage.removeItem('maxPlayers');
    
    alert('All data has been reset!');
  };

  const handleExport = () => {
    const exportData = {
      mantraPlayerStatus,
      normalPlayerStatus,
      mantraBudget,
      normalBudget,
      teams,
      minPlayers,
      maxPlayers,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mantravibe-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = (data) => {
    try {
      // Validate the imported data
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data format');
      }
      
      // Import data with fallbacks
      if (data.mantraPlayerStatus) setMantraPlayerStatus(data.mantraPlayerStatus);
      if (data.normalPlayerStatus) setNormalPlayerStatus(data.normalPlayerStatus);
      if (data.mantraBudget !== undefined) setMantraBudget(data.mantraBudget);
      if (data.normalBudget !== undefined) setNormalBudget(data.normalBudget);
      if (data.teams) setTeams(data.teams);
      if (data.minPlayers !== undefined) {
        setMinPlayers(data.minPlayers);
        localStorage.setItem('minPlayers', data.minPlayers.toString());
      }
      if (data.maxPlayers !== undefined) {
        setMaxPlayers(data.maxPlayers);
        localStorage.setItem('maxPlayers', data.maxPlayers.toString());
      }
      
      alert('Data imported successfully!');
    } catch (error) {
      alert('Error importing data: ' + error.message);
    }
  };

  return (
    <Router>
      {/* Declaration Popup */}
      {showDeclarationPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: theme.surface,
            padding: '30px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
            border: `1px solid ${theme.border}`,
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center'
          }}>
            <h2 style={{
              margin: '0 0 20px 0',
              fontSize: '24px',
              color: theme.text,
              fontWeight: 'bold'
            }}>
              Dichiarazione Obbligatoria
            </h2>
            <p style={{
              margin: '0 0 25px 0',
              fontSize: '18px',
              color: theme.textMuted,
              lineHeight: '1.5'
            }}>
              Per usare quest'app devi dichiarare che Nicolò doveva vincere lo scorso anno
            </p>
            <button
              onClick={handleDeclarationAccept}
              style={{
                backgroundColor: theme.pink,
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = theme.pinkHover}
              onMouseLeave={(e) => e.target.style.backgroundColor = theme.pink}
            >
              Lo dichiaro
            </button>
          </div>
        </div>
      )}
      
      <Routes>
        <Route path="/player/:id" element={
          <PlayerPage 
            players={mantraData}
            playerStatus={currentPlayerStatus}
            onPlayerStatusChange={handlePlayerStatusChange}
          />
        } />
        <Route path="/*" element={
          <div style={containerStyle}>

      {/* Header - the settings gear and theme toggle render as part of its single row, so
          they stay vertically aligned with the title/bar/stats instead of floating at a fixed
          pixel offset that assumed a taller, multi-row header. */}
      <Header
        dataCount={mantraData.length}
        teams={teams.length > 0 ? [teams[0]] : []}
        players={mantraData}
        themeMode={themeMode}
        onToggleTheme={toggleThemeMode}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Fantamilioni Bar */}
      <FantamilioniBar
        player={playerToAcquire}
        teams={teams}
        formations={formations}
        players={mantraData}
        appetibilitaData={appetibilitaData}
        roleMapping={rolesData}
        roles={rolesData} // Add roles parameter for enhancedRoleMapping
        currentTeamFormationRankings={[]} // Will be populated from RosaAcquistata later
        onConfirm={handleFantamilioniConfirm}
        onCancel={handleFantamilioniCancel}
      />

      <InterestPriceBar
        player={playerToMarkInterested}
        existingPrice={playerToMarkInterested ? interestedPlayers[playerToMarkInterested.id]?.price : null}
        onConfirm={handleInterestConfirm}
        onCancel={handleInterestCancel}
      />

      {/* Navigation Tabs - solo se ci sono dati */}
      {mantraData.length > 0 && (
        <div style={tabsContainerStyle}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={activeTab === tab.id ? activeTabStyle : tabButtonStyle}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.target.style.color = theme.text;
                  e.target.style.backgroundColor = theme.surfaceHover;
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.target.style.color = theme.textMuted;
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span style={{ fontSize: '1.125rem' }}>{tab.emoji}</span>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Tab Content */}
      <div style={tabContentStyle}>
        {loading && (
          <div style={{
            padding: '3rem',
            textAlign: 'center',
            fontSize: '1.125rem',
            color: theme.textMuted
          }}>
            <div style={{ marginBottom: '1rem', fontSize: '2rem' }}>⏳</div>
            Caricamento dati in corso...
          </div>
        )}

        {error && (
          <div style={{
            padding: '2rem',
            margin: '2rem auto',
            maxWidth: '600px',
            backgroundColor: 'rgba(248, 113, 113, 0.12)',
            border: `1px solid ${theme.danger}`,
            borderRadius: '0.5rem',
            color: theme.danger,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
            <div style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
              Errore di caricamento
            </div>
            <div>{error}</div>
          </div>
        )}

        {!loading && !error && mantraData.length === 0 && (
          <div style={{
            padding: '3rem',
            textAlign: 'center',
            fontSize: '1.125rem',
            color: theme.textMuted
          }}>
            <div style={{ marginBottom: '1rem', fontSize: '3rem' }}>⚽</div>
            <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
              Benvenuto in Fantavibe!
            </div>
            <div>I dati dei giocatori verranno caricati automaticamente.</div>
          </div>
        )}

        {mantraData.length > 0 && (
          <>
            {activeTab === 'giocatori' && (
              <MantraGiocatoriTab
                players={mantraData}
                playerStatus={currentPlayerStatus}
                onPlayerStatusChange={handlePlayerStatusChange}
                onPlayerAcquire={handlePlayerAcquire}
                roles={rolesData}
                interestedPlayers={interestedPlayers}
                onToggleInterested={handleToggleInterested}
              />
            )}

            {activeTab === 'rosa' && (
              <RosaAcquistata
                players={mantraData}
                playerStatus={currentPlayerStatus}
                onPlayerStatusChange={handlePlayerStatusChange}
                budget={currentBudget}
                roles={rolesData}
                roleMapping={rolesData.reduce((acc, role) => {
                  acc[role.Role] = role.Ruolo;
                  return acc;
                }, {})}
                teams={teams}
                onTeamsChange={handleTeamsChange}
                appetibilitaData={appetibilitaData}
              />
            )}

            {activeTab === 'squadre' && (
              <SquadreTab budget={currentBudget} teams={teams} onTeamsChange={handleTeamsChange} maxPlayers={maxPlayers} players={mantraData} />
            )}
          </>
        )}
      </div>

      {/* Settings Modal */}
      <Settings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        budget={currentBudget}
        onBudgetChange={handleBudgetChange}
        minPlayers={minPlayers}
        onMinPlayersChange={handleMinPlayersChange}
        maxPlayers={maxPlayers}
        onMaxPlayersChange={handleMaxPlayersChange}
        onReset={handleReset}
        onExport={handleExport}
        onImport={handleImport}
      />
          </div>
        } />
      </Routes>
    </Router>
  );
};

export default App;
