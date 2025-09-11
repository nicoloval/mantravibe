import React, { useEffect, useState, useCallback } from 'react';
import { getTeamColorCoding } from '../utils/dataUtils';

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

  // Function to calculate maximum amount (available budget minus reserved for remaining players)
  const calculateMaxAmount = useCallback((teamId) => {
    const team = teams.find(t => String(t.id) === String(teamId));
    if (!team) {
      console.log(`🔍 DEBUG: Team ${teamId} not found in teams:`, teams.map(t => t.id));
      return 0;
    }
    
    const currentPlayerCount = (team.players || []).length;
    const playersNeeded = Math.max(0, minPlayers - currentPlayerCount);
    const availableBudget = calculateTeamBudget(teamId);
    
    console.log(`🔍 DEBUG: Team ${teamId} (${team.name}):`);
    console.log(`  - Current players: ${currentPlayerCount}`);
    console.log(`  - Min players required: ${minPlayers}`);
    console.log(`  - Max players allowed: ${maxPlayers}`);
    console.log(`  - Players needed: ${playersNeeded}`);
    console.log(`  - Available budget: ${availableBudget}`);
    
    // If team already has enough players, they can spend all their budget
    if (playersNeeded === 0) {
      console.log(`  - Max bid: ${availableBudget} (no players needed)`);
      return availableBudget;
    }
    
    // Reserve budget for remaining players (assuming minimum 1 fantamilione per player)
    const reservedBudget = playersNeeded * 1;
    const maxBid = Math.max(0, availableBudget - reservedBudget);
    
    console.log(`  - Reserved budget: ${reservedBudget}`);
    console.log(`  - Max bid: ${maxBid}`);
    return maxBid;
  }, [teams, minPlayers, maxPlayers, calculateTeamBudget]);

  // Update team budget when team selection changes
  useEffect(() => {
    if (selectedTeamId) {
      const maxBidAmount = calculateMaxAmount(selectedTeamId);
      setTeamBudget(maxBidAmount);
      console.log('🔍 DEBUG: Team budget updated for team', selectedTeamId, ':', maxBidAmount);
    } else {
      // If no team selected, use the first team's budget as default
      const firstTeam = teams.length > 0 ? teams[0] : null;
      if (firstTeam) {
        const maxBidAmount = calculateMaxAmount(firstTeam.id);
        setTeamBudget(maxBidAmount);
        console.log('🔍 DEBUG: Using first team budget:', firstTeam.id, ':', maxBidAmount);
      } else {
        setTeamBudget(maxFantamilioni);
        console.log('🔍 DEBUG: No teams available, using maxFantamilioni:', maxFantamilioni);
      }
    }
  }, [selectedTeamId, teams, maxFantamilioni, minPlayers, calculateMaxAmount]);

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
    padding: '28px',
    maxWidth: '750px',
    width: '90%',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)'
  };

  const headerStyle = {
    marginBottom: '20px'
  };

  const titleStyle = {
    margin: '0 0 8px 0',
    fontSize: '22px',
    fontWeight: '600',
    color: '#1f2937'
  };

  const subtitleStyle = {
    margin: '0 0 4px 0',
    fontSize: '16px',
    color: '#6b7280'
  };


  const inputContainerStyle = {
    marginBottom: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  };

  const inputStyle = {
    width: '180px',
    padding: '12px 16px',
    border: `2px solid ${error ? '#f87171' : '#d1d5db'}`,
    borderRadius: '8px',
    fontSize: '18px',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontWeight: '500',
    textAlign: 'center'
  };

  const errorStyle = {
    color: '#dc2626',
    fontSize: '14px',
    marginTop: '6px',
    fontWeight: '500'
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
    backgroundColor: fantamilioni && parseInt(fantamilioni) > 0 && parseInt(fantamilioni) <= teamBudget 
      ? '#10b981' 
      : '#e5e7eb',
    color: fantamilioni && parseInt(fantamilioni) > 0 && parseInt(fantamilioni) <= teamBudget 
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
            Acquista {player.Nome} • {player.Squadra}
          </h3>
          <p style={subtitleStyle}>
            {player.Ruolo}
          </p>
        </div>


        {/* Quick Amount Buttons and Input on same line */}
        {selectedTeamId && teamBudget > 0 && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', marginBottom: '16px', justifyContent: 'center' }}>
            {/* Quick Amount Buttons */}
            {quickAmounts.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
          </div>
        )}

        {/* Team Selection */}
        <div style={inputContainerStyle}>
          <div style={{
            fontSize: '0.875rem',
            color: '#374151',
            marginBottom: '8px',
            textAlign: 'center',
            fontWeight: '500'
          }}>
            Seleziona Squadra
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '10px',
            marginBottom: '8px',
            maxWidth: '700px'
          }}>
            {teams.map(team => {
              const isSelected = selectedTeamId === String(team.id);
              const playerCount = (team.players || []).length;
              const teamRemainingBudget = calculateTeamBudget(team.id);
              const maxBidAmount = calculateMaxAmount(team.id);
              
              // Get centralized color coding
              const colorCoding = getTeamColorCoding(team, teams, minPlayers, maxPlayers);
              const isDisabled = colorCoding.status === 'red';
              
              // Determine button style using centralized color coding
              let buttonStyle = {
                padding: '12px 10px',
                border: `2px solid ${isSelected ? '#3b82f6' : colorCoding.colors.border}`,
                borderRadius: '6px',
                backgroundColor: isSelected ? '#eff6ff' : colorCoding.colors.background,
                color: isSelected ? '#3b82f6' : colorCoding.colors.text,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                fontWeight: '600',
                transition: 'all 0.2s',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
                minHeight: '85px',
                justifyContent: 'center',
                opacity: isDisabled ? 0.6 : 1
              };
              
              // Use centralized budget color
              let budgetColor = colorCoding.colors.budget;
              
              if (isSelected) {
                budgetColor = '#3b82f6';
              }
              
              return (
                <button
                  key={team.id}
                  onClick={() => !isDisabled && setSelectedTeamId(String(team.id))}
                  style={buttonStyle}
                  disabled={isDisabled}
                >
                  <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>
                    {team.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                    {playerCount}/{maxPlayers} (min: {minPlayers})
                  </div>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: '600', 
                    color: budgetColor,
                    ...colorCoding.budgetHighlight
                  }}>
                    {teamRemainingBudget.toLocaleString()} FM
                  </div>
                  {maxBidAmount !== teamRemainingBudget && (
                    <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                      Max: {maxBidAmount.toLocaleString()}M
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          {selectedTeamId && (
            <div style={{
              fontSize: '0.75rem',
              color: '#6b7280',
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
        {teamBudget <= 0 && (
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
