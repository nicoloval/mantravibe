import React, { useEffect, useState } from 'react';
import { theme } from '../theme';

// Same "bar at the top of the page" pattern as FantamilioniBar (the Compra flow), but for
// marking a player as one you're interested in rather than acquiring them - so there's no team
// grid, no budget checks, just an optional price note to remind yourself later. Renders nothing
// when there's no player to mark, unlike FantamilioniBar's persistent collapsed placeholder -
// this is a much rarer action, no need for permanent chrome around it.
const InterestPriceBar = ({ player, existingPrice = null, onConfirm, onCancel }) => {
  const [price, setPrice] = useState('');

  // Re-seed the input whenever a different player is being marked (or re-marked with an
  // existing price already on file, e.g. reopened while investigating).
  useEffect(() => {
    setPrice(existingPrice != null ? String(existingPrice) : '');
  }, [player, existingPrice]);

  if (!player) return null;

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

  let playerRoles = [];
  if (player['Ruolo Mantra']) {
    try {
      playerRoles = JSON.parse(player['Ruolo Mantra'].replace(/'/g, '"'));
    } catch (error) {
      playerRoles = [player.Ruolo || 'UNKNOWN'];
    }
  } else if (player.Ruolo) {
    playerRoles = [player.Ruolo];
  }

  const handleSubmit = () => {
    const parsed = parseInt(price, 10);
    onConfirm(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
  };

  return (
    <div style={{
      padding: '16px 20px',
      backgroundColor: theme.surface,
      borderBottom: `2px solid ${theme.star}`,
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.3)',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      flexWrap: 'wrap'
    }}>
      <span style={{ fontSize: '20px' }}>⭐</span>

      <div style={{ minWidth: '140px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '16px', color: theme.text }}>{player.Nome}</div>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '3px' }}>
          {playerRoles.map((role, idx) => (
            <span key={idx} style={{
              padding: '2px 6px',
              backgroundColor: getRoleColor(role),
              borderRadius: '4px',
              fontSize: '12px',
              color: 'white',
              fontWeight: '600'
            }}>
              {role}
            </span>
          ))}
          <span style={{ fontSize: '13px', color: theme.textMuted }}>{player.Squadra}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <label style={{ fontSize: '14px', color: theme.textMuted }}>Prezzo indicativo:</label>
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="opzionale"
          autoFocus
          style={{
            padding: '6px 10px',
            border: `1px solid ${theme.border}`,
            borderRadius: '6px',
            fontSize: '14px',
            width: '90px',
            backgroundColor: theme.surfaceAlt,
            color: theme.text
          }}
        />
        <span style={{ fontSize: '14px', color: theme.textMuted }}>FM</span>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onCancel}
          style={{
            padding: '6px 14px',
            border: `1px solid ${theme.border}`,
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            backgroundColor: theme.surfaceHover,
            color: theme.text
          }}
        >
          Annulla
        </button>
        <button
          onClick={handleSubmit}
          style={{
            padding: '6px 14px',
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            backgroundColor: theme.star
          }}
        >
          Conferma
        </button>
      </div>
    </div>
  );
};

export default InterestPriceBar;
