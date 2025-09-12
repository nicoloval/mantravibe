import React, { useEffect, useState, useCallback } from 'react';
import FantamilioniModal from './components/FantamilioniModal';
import Header from './components/Header';
import RosaAcquistata from './components/RosaAcquistata';
import MantraGiocatoriTab from './components/MantraGiocatoriTab';
import SquadreTab from './components/SquadreTab';
import Settings from './components/Settings';
import { loadBudget, loadPlayerStatus, saveBudget, savePlayerStatus, updatePlayerStatus } from './utils/storage';

const App = () => {
  // Stati principali
  const [mantraData, setMantraData] = useState([]);
  const [rolesData, setRolesData] = useState([]);
  
  // Debug effect to track rolesData changes
  useEffect(() => {
    console.log('🔍 DEBUG: rolesData state changed:', rolesData);
  }, [rolesData]);
  const [appetibilitaData, setAppetibilitaData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('giocatori');

  // Independent player status and budget for each mode
  const [normalPlayerStatus, setNormalPlayerStatus] = useState({});
  const [mantraPlayerStatus, setMantraPlayerStatus] = useState({});
  const [normalBudget, setNormalBudget] = useState(500);
  const [mantraBudget, setMantraBudget] = useState(500);
  
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

  // Stati per la modal fantamilioni
  const [showFantamilioniModal, setShowFantamilioniModal] = useState(false);
  const [playerToAcquire, setPlayerToAcquire] = useState(null);

  // Settings state
  const [showSettings, setShowSettings] = useState(false);


  // Teams state for Squadre tab
  const [teams, setTeams] = useState([]);

  // Function to synchronize teams with player status
  const synchronizeTeamsWithPlayerStatus = useCallback((teamsData, playerStatusData) => {
    console.log('🔍 DEBUG: Synchronizing teams with player status');
    console.log('🔍 DEBUG: Teams before sync:', teamsData);
    console.log('🔍 DEBUG: Player status before sync:', playerStatusData);
    
    // Filter out players from teams that are not in player status as 'acquired'
    const synchronizedTeams = teamsData.map(team => ({
      ...team,
      players: team.players.filter(player => {
        const playerStatus = playerStatusData[player.id];
        const isAcquired = playerStatus && playerStatus.status === 'acquired';
        if (!isAcquired) {
          console.log(`🔍 DEBUG: Removing player ${player.id} (${player.Nome}) from team ${team.id} - not acquired in player status`);
        }
        return isAcquired;
      })
    }));
    
    console.log('🔍 DEBUG: Teams after sync:', synchronizedTeams);
    return synchronizedTeams;
  }, []);

  // Handle teams changes from SquadreTab
  const handleTeamsChange = useCallback((newTeams) => {
    console.log('🔍 DEBUG: handleTeamsChange called with:', newTeams);
    setTeams(newTeams);
  }, []);

  // Always use mantra mode data
  const currentPlayerStatus = mantraPlayerStatus;
  const currentBudget = mantraBudget;


  // Salva automaticamente lo status dei giocatori normali
  useEffect(() => {
    // Non salvare durante l'inizializzazione
    if (!isInitialized) {
      console.log('Salvataggio stato normale saltato - app non ancora inizializzata');
      return;
    }
    
    console.log('Salvando stato giocatori normali:', Object.keys(normalPlayerStatus).length, 'giocatori');
    savePlayerStatus(normalPlayerStatus, 'normal');
  }, [normalPlayerStatus, isInitialized]);

  // Salva automaticamente lo status dei giocatori mantra
  useEffect(() => {
    // Non salvare durante l'inizializzazione
    if (!isInitialized) {
      console.log('Salvataggio stato mantra saltato - app non ancora inizializzata');
      return;
    }
    
    console.log('Salvando stato giocatori mantra:', Object.keys(mantraPlayerStatus).length, 'giocatori');
    savePlayerStatus(mantraPlayerStatus, 'mantra');
  }, [mantraPlayerStatus, isInitialized]);

  // Salva automaticamente il budget normale
  useEffect(() => {
    // Non salvare durante l'inizializzazione
    if (!isInitialized) {
      console.log('Salvataggio budget normale saltato - app non ancora inizializzata');
      return;
    }
    
    console.log('Salvando budget normale:', normalBudget);
    saveBudget(normalBudget, 'normal');
  }, [normalBudget, isInitialized]);

  // Salva automaticamente il budget mantra
  useEffect(() => {
    // Non salvare durante l'inizializzazione
    if (!isInitialized) {
      console.log('Salvataggio budget mantra saltato - app non ancora inizializzata');
      return;
    }
    
    console.log('Salvando budget mantra:', mantraBudget);
    saveBudget(mantraBudget, 'mantra');
  }, [mantraBudget, isInitialized]);

  // Synchronize teams with player status whenever player status changes
  useEffect(() => {
    if (!isInitialized || teams.length === 0) return;
    
    console.log('🔍 DEBUG: Player status changed, synchronizing teams...');
    const synchronizedTeams = synchronizeTeamsWithPlayerStatus(teams, mantraPlayerStatus);
    
    // Only update if there are changes
    const hasChanges = JSON.stringify(teams) !== JSON.stringify(synchronizedTeams);
    if (hasChanges) {
      console.log('🔍 DEBUG: Teams need to be updated due to player status changes');
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
      console.log('🔍 DEBUG: Starting to load roles.csv...');
      const rolesResponse = await fetch(`/data/roles.csv?t=${Date.now()}`);
      console.log('🔍 DEBUG: Roles response status:', rolesResponse.status, rolesResponse.ok);
      
      if (rolesResponse.ok) {
        const rolesText = await rolesResponse.text();
        console.log('🔍 DEBUG: Raw CSV text:', rolesText);
        const rolesLines = rolesText.split('\n').filter(line => line.trim());
        console.log('🔍 DEBUG: CSV lines:', rolesLines);
        const roles = rolesLines.slice(1).map(line => {
          const parts = line.split(',');
          console.log('🔍 DEBUG: Parsing line:', line, 'Parts:', parts);
          return { 
            Role: parts[0]?.trim() || '', 
            Ruolo: parts[1]?.trim() || '', 
            Color: parts[2]?.trim() || '' 
          };
        }).filter(role => {
          const isValid = role.Role && role.Ruolo; // Make Color optional for now
          console.log('🔍 DEBUG: Role validation:', role, 'Valid:', isValid);
          return isValid;
        }); // Only keep complete entries
        
        console.log('🔍 DEBUG: Parsed roles from CSV:', roles);
        console.log('🔍 DEBUG: Setting rolesData with:', roles.length, 'roles');
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
    
    console.log('Caricamento iniziale - Stato normale trovato:', Object.keys(normalStatus).length, 'giocatori');
    console.log('Caricamento iniziale - Stato mantra trovato:', Object.keys(mantraStatus).length, 'giocatori');
    console.log('Caricamento iniziale - Budget normale trovato:', normalSavedBudget);
    console.log('Caricamento iniziale - Budget mantra trovato:', mantraSavedBudget);
    
    setNormalPlayerStatus(normalStatus);
    setMantraPlayerStatus(mantraStatus);
    setNormalBudget(normalSavedBudget);
    setMantraBudget(mantraSavedBudget);
    
    // Load teams from localStorage
    try {
      const savedTeams = localStorage.getItem('fantacalcio_teams');
      const teamsData = savedTeams ? JSON.parse(savedTeams) : [];
      const validTeams = Array.isArray(teamsData) ? teamsData : [];
      setTeams(validTeams);
      console.log('🔍 DEBUG: Loaded teams from localStorage:', validTeams);
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
    console.log('🔍 DEBUG: handlePlayerStatusChange called with:', playerId, status, fantamilioni, 'mode: mantra');
    console.log('🔍 DEBUG: Current mantraPlayerStatus before update:', mantraPlayerStatus);
    
    const newStatus = updatePlayerStatus(mantraPlayerStatus, playerId, status, fantamilioni);
    console.log('🔍 DEBUG: New status after update:', newStatus);
    setMantraPlayerStatus(newStatus);
  };

  // Gestione acquisto giocatore con fantamilioni
  const handlePlayerAcquire = (player) => {
    setPlayerToAcquire(player);
    setShowFantamilioniModal(true);
  };

  const handleFantamilioniConfirm = (fantamilioni, teamId) => {
    if (playerToAcquire) {
      // Team-specific budget check is handled in FantamilioniModal
      // No need for global budget check here
      
      handlePlayerStatusChange(playerToAcquire.id, 'acquired', fantamilioni);
      
      // Add player to the selected team
      if (teamId) {
        const teamIdInt = parseInt(teamId);
        console.log('Adding player to team:', teamIdInt, playerToAcquire.Nome, fantamilioni);
        
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
          console.log('Updated teams:', updatedTeams);
          
          return updatedTeams;
        });
        
        // Also try the window method as backup
        if (window.addPlayerToTeam) {
          window.addPlayerToTeam(teamIdInt, playerToAcquire, fantamilioni);
        }
      }
      
      setShowFantamilioniModal(false);
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
    setShowFantamilioniModal(false);
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
    backgroundColor: '#f8fafc'
  };

  const tabsContainerStyle = {
    display: 'flex',
    justifyContent: 'center',
    padding: '0 1rem',
    backgroundColor: 'white',
    borderBottom: '1px solid #e2e8f0'
  };

  const tabButtonStyle = {
    padding: '1rem 2rem',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '500',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    borderBottom: '3px solid transparent',
    transition: 'all 0.2s ease',
    position: 'relative'
  };

  const activeTabStyle = {
    ...tabButtonStyle,
    color: '#1e293b',
    borderBottomColor: '#3b82f6',
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
    <div style={containerStyle}>
      {/* Settings Gear Button */}
      <button 
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'none',
          color: '#374151',
          border: 'none',
          fontSize: '2rem',
          cursor: 'pointer',
          transition: 'transform 0.2s',
          zIndex: 100
        }}
        onClick={() => setShowSettings(true)}
        title="Settings"
        onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
        onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
      >
        ⚙️
      </button>

      {/* Header */}
      <Header 
        dataCount={mantraData.length}
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
                  e.target.style.color = '#374151';
                  e.target.style.backgroundColor = '#f8fafc';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.target.style.color = '#64748b';
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
            color: '#64748b'
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
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.5rem',
            color: '#dc2626',
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
            color: '#64748b'
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
              <SquadreTab budget={currentBudget} teams={teams} onTeamsChange={handleTeamsChange} maxPlayers={maxPlayers} />
            )}
          </>
        )}
      </div>

      {/* Modal Fantamilioni */}
      {showFantamilioniModal && (
        <FantamilioniModal
          player={playerToAcquire}
          onConfirm={handleFantamilioniConfirm}
          onCancel={handleFantamilioniCancel}
          teams={teams || []}
          maxPlayers={maxPlayers}
          minPlayers={minPlayers}
        />
      )}

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
  );
};

export default App;
