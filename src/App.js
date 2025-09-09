import React, { useEffect, useMemo, useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import FantamilioniModal from './components/FantamilioniModal';
import Header from './components/Header';
import PlayersTab from './components/PlayersTab';
import RosaAcquistata from './components/RosaAcquistata';
import MantraGiocatoriTab from './components/MantraGiocatoriTab';
import SquadreTab from './components/SquadreTab';
import { normalizePlayerData } from './utils/dataUtils';
import { canAffordPlayer, getTotalFantamilioni, loadBudget, loadPlayerStatus, saveBudget, savePlayerStatus, updatePlayerStatus } from './utils/storage';

const App = () => {
  // Stati principali
  const [fpediaData, setFpediaData] = useState([]);
  const [mantraData, setMantraData] = useState([]);
  const [rolesData, setRolesData] = useState([]);
  const [appetibilitaData, setAppetibilitaData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('giocatori');

  // Independent player status and budget for each mode
  const [normalPlayerStatus, setNormalPlayerStatus] = useState({});
  const [mantraPlayerStatus, setMantraPlayerStatus] = useState({});
  const [normalBudget, setNormalBudget] = useState(500);
  const [mantraBudget, setMantraBudget] = useState(500);

  // Flag per evitare salvataggi durante l'inizializzazione
  const [isInitialized, setIsInitialized] = useState(false);

  // Stati per la modal fantamilioni
  const [showFantamilioniModal, setShowFantamilioniModal] = useState(false);
  const [playerToAcquire, setPlayerToAcquire] = useState(null);

  // Mantra mode state
  const [isMantraMode, setIsMantraMode] = useState(false);

  // Teams state for Squadre tab
  const [teams, setTeams] = useState([]);

  // Handle teams changes from SquadreTab
  const handleTeamsChange = useCallback((newTeams) => {
    setTeams(newTeams);
  }, []);

  // Get current mode's data
  const currentPlayerStatus = isMantraMode ? mantraPlayerStatus : normalPlayerStatus;
  const currentBudget = isMantraMode ? mantraBudget : normalBudget;

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
      setTeams(Array.isArray(teamsData) ? teamsData : []);
    } catch (error) {
      console.error('Error loading teams from localStorage:', error);
      setTeams([]);
    }
    
    // Segna come inizializzato DOPO aver caricato i dati
    setIsInitialized(true);
    
    loadDataFromPublic();
  }, []);

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

  // Caricamento automatico del file dalla cartella public
  const loadDataFromPublic = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Carica solo FPEDIA
      const fpediaResponse = await fetch('/data/fpedia_analysis.xlsx');
      if (fpediaResponse.ok) {
        const fpediaBuffer = await fpediaResponse.arrayBuffer();
        const fpediaWorkbook = XLSX.read(fpediaBuffer);
        const fpediaSheet = fpediaWorkbook.Sheets[fpediaWorkbook.SheetNames[0]];
        const fpediaJson = XLSX.utils.sheet_to_json(fpediaSheet);
        setFpediaData(fpediaJson);
      } else {
        setError('File fpedia_analysis.xlsx non trovato nella cartella public/data/. Usa il caricamento manuale.');
      }
    } catch (err) {
      setError('Errore nel caricamento del file. Usa il caricamento manuale.');
      console.error('Errore caricamento automatico:', err);
    } finally {
      setLoading(false);
    }
  };

  // Caricamento dati Mantra mode
  const loadMantraData = async () => {
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
      const rolesResponse = await fetch('/data/roles.csv');
      if (rolesResponse.ok) {
        const rolesText = await rolesResponse.text();
        const rolesLines = rolesText.split('\n').filter(line => line.trim());
        const roles = rolesLines.slice(1).map(line => {
          const [Role, Ruolo] = line.split(',');
          return { Role: Role.trim(), Ruolo: Ruolo.trim() };
        });
        setRolesData(roles);
      } else {
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
  };

  // Normalizza i dati e crea indice di ricerca
  const normalizedDataWithIndex = useMemo(() => {
    if (!fpediaData.length) return { players: [], searchIndex: null };
    return normalizePlayerData(fpediaData);
  }, [fpediaData]);

  const normalizedData = normalizedDataWithIndex.players;
  const searchIndex = normalizedDataWithIndex.searchIndex;

  // Gestione status giocatori
  const handlePlayerStatusChange = (playerId, status, fantamilioni = null) => {
    console.log('Cambiamento stato giocatore:', playerId, status, fantamilioni, 'mode:', isMantraMode ? 'mantra' : 'normal');
    
    if (isMantraMode) {
      const newStatus = updatePlayerStatus(mantraPlayerStatus, playerId, status, fantamilioni);
      setMantraPlayerStatus(newStatus);
    } else {
      const newStatus = updatePlayerStatus(normalPlayerStatus, playerId, status, fantamilioni);
      setNormalPlayerStatus(newStatus);
    }
  };

  // Gestione acquisto giocatore con fantamilioni
  const handlePlayerAcquire = (player) => {
    setPlayerToAcquire(player);
    setShowFantamilioniModal(true);
  };

  const handleFantamilioniConfirm = (fantamilioni, teamId) => {
    if (playerToAcquire) {
      // Controllo budget
      if (!canAffordPlayer(fantamilioni, currentBudget, currentPlayerStatus)) {
        alert(`Non hai abbastanza fantamilioni! Budget rimanente: ${currentBudget - getTotalFantamilioni(currentPlayerStatus)} FM`);
        return;
      }
      
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
    if (isMantraMode) {
      setMantraBudget(newBudget);
    } else {
      setNormalBudget(newBudget);
    }
  };

  const handleFantamilioniCancel = () => {
    setShowFantamilioniModal(false);
    setPlayerToAcquire(null);
  };

  // Gestione Mantra mode
  const handleMantraModeChange = (enabled) => {
    setIsMantraMode(enabled);
    if (enabled) {
      loadMantraData();
      setActiveTab('giocatori'); // Reset to first tab
    } else {
      setActiveTab('giocatori'); // Reset to first tab
    }
  };

  // Tab configuration
  const tabs = isMantraMode ? [
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
  ] : [
    { 
      id: 'giocatori', 
      label: 'Giocatori', 
      description: 'Cerca e visualizza tutti i giocatori con statistiche e classifiche'
    },
    { 
      id: 'rosa', 
      label: 'La Mia Rosa', 
      description: 'Visualizza i giocatori che hai acquistato e gestisci il budget'
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

  return (
    <div style={containerStyle}>
      {/* Header con Budget integrato */}
      <Header 
        dataCount={isMantraMode ? mantraData.length : normalizedData.length}
        playerStatus={currentPlayerStatus}
        budget={currentBudget}
        onBudgetChange={handleBudgetChange}
        isMantraMode={isMantraMode}
        onMantraModeChange={handleMantraModeChange}
        teams={teams}
      />

      {/* Navigation Tabs - solo se ci sono dati */}
      {((isMantraMode && mantraData.length > 0) || (!isMantraMode && normalizedData.length > 0)) && (
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

        {!loading && !error && ((isMantraMode && mantraData.length === 0) || (!isMantraMode && normalizedData.length === 0)) && (
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

        {((isMantraMode && mantraData.length > 0) || (!isMantraMode && normalizedData.length > 0)) && (
          <>
            {activeTab === 'giocatori' && !isMantraMode && (
              <PlayersTab
                players={normalizedData}
                playerStatus={currentPlayerStatus}
                onPlayerStatusChange={handlePlayerStatusChange}
                onPlayerAcquire={handlePlayerAcquire}
                searchIndex={searchIndex}
              />
            )}

            {activeTab === 'giocatori' && isMantraMode && (
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
                players={isMantraMode ? mantraData : normalizedData}
                playerStatus={currentPlayerStatus}
                onPlayerStatusChange={handlePlayerStatusChange}
                budget={currentBudget}
                isMantraMode={isMantraMode}
                roleMapping={rolesData.reduce((acc, role) => {
                  acc[role.Role] = role.Ruolo;
                  return acc;
                }, {})}
                teams={teams}
                appetibilitaData={appetibilitaData}
              />
            )}

            {activeTab === 'squadre' && isMantraMode && (
              <SquadreTab budget={currentBudget} onTeamsChange={handleTeamsChange} />
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
          maxFantamilioni={currentBudget - getTotalFantamilioni(currentPlayerStatus)}
          teams={teams || []}
        />
      )}
    </div>
  );
};

export default App;
