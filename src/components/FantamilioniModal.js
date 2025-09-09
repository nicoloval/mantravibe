import React, { useEffect, useState } from 'react';

const FantamilioniModal = ({ 
  player, 
  onConfirm, 
  onCancel,
  maxFantamilioni,
  teams = [],
  maxPlayers = 30,
  minPlayers = 21
}) => {
  const [fantamilioni, setFantamilioni] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [error, setError] = useState('');
  const [teamBudget, setTeamBudget] = useState(maxFantamilioni);

  // Function to calculate available budget for a specific team
  const calculateTeamBudget = (teamId) => {
    // Convert teamId to string for comparison since it might be stored as number in localStorage
    const teamIdStr = String(teamId);
    const team = teams.find(t => String(t.id) === teamIdStr);
    if (!team) {
      console.log('🔍 DEBUG: Team not found for ID:', teamId, 'Available teams:', teams.map(t => ({ id: t.id, name: t.name })));
      return 0;
    }
    
    const totalSpent = (team.players || []).reduce((sum, player) => sum + (parseFloat(player.price) || 0), 0);
    const availableBudget = team.budget - totalSpent;
    console.log('🔍 DEBUG: Team', teamId, 'budget:', team.budget, 'spent:', totalSpent, 'available:', availableBudget);
    return availableBudget;
  };

  // Function to calculate maximum amount considering minimum players requirement
  const calculateMaxAmount = (teamId) => {
    const team = teams.find(t => String(t.id) === String(teamId));
    if (!team) return 0;
    
    const currentPlayers = (team.players || []).length;
    const playersNeeded = Math.max(0, minPlayers - currentPlayers);
    const maxAmount = calculateTeamBudget(teamId) - playersNeeded;
    
    console.log(`🔍 DEBUG: Max amount calculation - Team: ${teamId}, Current players: ${currentPlayers}, Min needed: ${minPlayers}, Players still needed: ${playersNeeded}, Max amount: ${maxAmount}`);
    
    return Math.max(0, maxAmount);
  };

  // Update team budget when team selection changes
  useEffect(() => {
    if (selectedTeamId) {
      const availableBudget = calculateTeamBudget(selectedTeamId);
      setTeamBudget(availableBudget);
      console.log('🔍 DEBUG: Team budget updated for team', selectedTeamId, ':', availableBudget);
    } else {
      // If no team selected, use the first team's budget as default
      const firstTeam = teams.length > 0 ? teams[0] : null;
      if (firstTeam) {
        const availableBudget = calculateTeamBudget(firstTeam.id);
        setTeamBudget(availableBudget);
        console.log('🔍 DEBUG: Using first team budget:', firstTeam.id, ':', availableBudget);
      } else {
        setTeamBudget(maxFantamilioni);
        console.log('🔍 DEBUG: No teams available, using maxFantamilioni:', maxFantamilioni);
      }
    }
  }, [selectedTeamId, teams, maxFantamilioni]);

  // Reset quando cambia il giocatore, ma ricorda l'ultimo prezzo e squadra inseriti
  useEffect(() => {
    // Carica l'ultimo prezzo e squadra inseriti da localStorage
    const lastPrice = localStorage.getItem('lastFantamilioniPrice');
    const lastTeamId = localStorage.getItem('lastSelectedTeamId');
    setFantamilioni(lastPrice || '');
    
    // Se non c'è una squadra salvata, usa la prima squadra disponibile
    let teamToSelect = '';
    if (lastTeamId && teams.length > 0) {
      // Check if the lastTeamId exists in the teams array
      const teamExists = teams.find(t => String(t.id) === String(lastTeamId));
      teamToSelect = teamExists ? lastTeamId : (teams.length > 0 ? String(teams[0].id) : '');
    } else {
      teamToSelect = teams.length > 0 ? String(teams[0].id) : '';
    }
    
    setSelectedTeamId(teamToSelect);
    setError('');
    
    console.log('🔍 DEBUG: Modal opened with lastPrice:', lastPrice, 'lastTeamId:', lastTeamId, 'teamToSelect:', teamToSelect);
  }, [player, teams]);

  const handleConfirm = () => {
    const value = parseInt(fantamilioni);
    
    if (!value || value <= 0) {
      setError('Inserisci un valore valido');
      return;
    }
    
    if (value > teamBudget) {
      setError(`Budget insufficiente! Disponibili: ${teamBudget} FM`);
      return;
    }
    
    if (!selectedTeamId) {
      setError('Seleziona una squadra');
      return;
    }
    
    // Salva il prezzo e la squadra inseriti per la prossima volta
    localStorage.setItem('lastFantamilioniPrice', value.toString());
    localStorage.setItem('lastSelectedTeamId', selectedTeamId);
    
    onConfirm(value, selectedTeamId);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setFantamilioni(value);
    
    // Clear error quando l'utente inizia a digitare
    if (error) {
      setError('');
    }
  };

  // Suggerimenti rapidi per i fantamilioni
  const quickAmounts = [1, 5, 10, 20, 50].filter(amount => amount <= teamBudget);

  const modalOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  };

  const modalContentStyle = {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '420px',
    width: '90%',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)'
  };

  const headerStyle = {
    marginBottom: '20px'
  };

  const titleStyle = {
    margin: '0 0 8px 0',
    fontSize: '20px',
    fontWeight: '600',
    color: '#1f2937'
  };

  const subtitleStyle = {
    margin: '0 0 4px 0',
    fontSize: '14px',
    color: '#6b7280'
  };

  const budgetInfoStyle = {
    padding: '12px',
    backgroundColor: maxFantamilioni > 0 ? '#f0fdf4' : '#fef2f2',
    borderRadius: '8px',
    border: `1px solid ${maxFantamilioni > 0 ? '#bbf7d0' : '#fecaca'}`,
    marginBottom: '16px'
  };

  const budgetTextStyle = {
    margin: 0,
    fontSize: '14px',
    color: maxFantamilioni > 0 ? '#059669' : '#dc2626',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  };

  const inputContainerStyle = {
    marginBottom: '16px'
  };

  const inputStyle = {
    width: '100%',
    padding: '12px',
    border: `2px solid ${error ? '#f87171' : '#d1d5db'}`,
    borderRadius: '8px',
    fontSize: '16px',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontWeight: '500'
  };

  const errorStyle = {
    color: '#dc2626',
    fontSize: '14px',
    marginTop: '6px',
    fontWeight: '500'
  };

  const quickButtonsStyle = {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    flexWrap: 'wrap'
  };

  const quickButtonStyle = {
    padding: '6px 12px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s'
  };

  const actionButtonsStyle = {
    display: 'flex',
    gap: '12px'
  };

  const buttonStyle = {
    flex: 1,
    padding: '12px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    transition: 'all 0.2s'
  };

  const cancelButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#f3f4f6',
    color: '#374151'
  };

  const confirmButtonStyle = {
    ...buttonStyle,
    backgroundColor: fantamilioni && parseInt(fantamilioni) > 0 && parseInt(fantamilioni) <= maxFantamilioni 
      ? '#10b981' 
      : '#e5e7eb',
    color: fantamilioni && parseInt(fantamilioni) > 0 && parseInt(fantamilioni) <= maxFantamilioni 
      ? 'white' 
      : '#9ca3af'
  };

  if (!player) return null;

  return (
    <div style={modalOverlayStyle} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div style={modalContentStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <h3 style={titleStyle}>
            Acquista {player.Nome}
          </h3>
          <p style={subtitleStyle}>
            {player.Squadra} • {player.Ruolo}
          </p>
        </div>

        {/* Informazioni Budget */}
        <div style={budgetInfoStyle}>
          <p style={budgetTextStyle}>
            {teamBudget > 0 ? '💚' : '❌'} 
            Budget disponibile: <strong>{teamBudget.toLocaleString()} fantamilioni</strong>
            {selectedTeamId && (
              <span style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginTop: '0.25rem' }}>
                (Squadra: {teams.find(t => t.id === selectedTeamId)?.name || 'N/A'})
              </span>
            )}
          </p>
        </div>

        {/* Quick Amount Buttons */}
        {quickAmounts.length > 0 && selectedTeamId && teamBudget > 0 && (
          <div style={quickButtonsStyle}>
            <span style={{ fontSize: '14px', color: '#6b7280', alignSelf: 'center', marginRight: '4px' }}>
              Rapido:
            </span>
            {quickAmounts.map(amount => (
              <button
                key={amount}
                onClick={() => setFantamilioni(amount.toString())}
                style={{
                  ...quickButtonStyle,
                  backgroundColor: fantamilioni === amount.toString() ? '#3b82f6' : '#f3f4f6',
                  color: fantamilioni === amount.toString() ? 'white' : '#374151',
                  borderColor: fantamilioni === amount.toString() ? '#3b82f6' : '#d1d5db'
                }}
              >
                {amount}
              </button>
            ))}
            {selectedTeamId && calculateMaxAmount(selectedTeamId) >= 1 && (
              <button
                onClick={() => setFantamilioni(calculateMaxAmount(selectedTeamId).toString())}
                style={{
                  ...quickButtonStyle,
                  backgroundColor: fantamilioni === calculateMaxAmount(selectedTeamId).toString() ? '#3b82f6' : '#f3f4f6',
                  color: fantamilioni === calculateMaxAmount(selectedTeamId).toString() ? 'white' : '#374151',
                  borderColor: fantamilioni === calculateMaxAmount(selectedTeamId).toString() ? '#3b82f6' : '#d1d5db'
                }}
              >
                Max
              </button>
            )}
          </div>
        )}

        {/* Input Field */}
        <div style={inputContainerStyle}>
          {fantamilioni && (
            <div style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              marginBottom: '0.25rem',
              fontStyle: 'italic'
            }}>
              Precompilato con l'ultimo prezzo inserito
            </div>
          )}
          <input
            type="number"
            value={fantamilioni}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            placeholder="Inserisci fantamilioni"
            min="1"
            max={teamBudget}
            style={inputStyle}
            autoFocus
            disabled={teamBudget <= 0}
          />
        </div>

        {/* Team Selection */}
        <div style={inputContainerStyle}>
          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            style={inputStyle}
            disabled={teamBudget <= 0}
          >
            <option value="">Seleziona una squadra</option>
            {teams.filter(team => (team.players || []).length < maxPlayers).map(team => (
              <option key={team.id} value={team.id}>
                {team.name} ({(team.players || []).length}/{maxPlayers})
              </option>
            ))}
          </select>
          {selectedTeamId && (
            <div style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              marginTop: '0.25rem',
              textAlign: 'center'
            }}>
              Budget disponibile: {teamBudget.toLocaleString()} FM
            </div>
          )}
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        {/* Action Buttons */}
        <div style={actionButtonsStyle}>
          <button
            onClick={onCancel}
            style={cancelButtonStyle}
          >
            ❌ Annulla
          </button>
          <button
            onClick={handleConfirm}
            disabled={!fantamilioni || parseInt(fantamilioni) <= 0 || parseInt(fantamilioni) > teamBudget || teamBudget <= 0 || !selectedTeamId}
            style={confirmButtonStyle}
          >
            ✅ Conferma
          </button>
        </div>

        {/* Warning per budget basso */}
        {maxFantamilioni <= 0 && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#fef2f2',
            borderRadius: '8px',
            border: '1px solid #fecaca'
          }}>
            <p style={{
              margin: 0,
              fontSize: '14px',
              color: '#dc2626',
              textAlign: 'center',
              fontWeight: '500'
            }}>
              ⚠️ Budget esaurito! Non puoi acquistare altri giocatori.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FantamilioniModal;
