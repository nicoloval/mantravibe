import React from 'react';

const SquadreTab = () => {
  const containerStyle = {
    padding: '3rem',
    textAlign: 'center',
    color: '#64748b'
  };

  const iconStyle = {
    fontSize: '4rem',
    marginBottom: '1rem'
  };

  const titleStyle = {
    fontSize: '1.5rem',
    fontWeight: '600',
    marginBottom: '0.5rem',
    color: '#374151'
  };

  const descriptionStyle = {
    fontSize: '1rem',
    lineHeight: '1.5'
  };

  return (
    <div style={containerStyle}>
      <div style={iconStyle}>⚽</div>
      <div style={titleStyle}>Squadre</div>
      <div style={descriptionStyle}>
        Questa sezione sarà disponibile in una versione futura.
        <br />
        Qui potrai gestire e visualizzare le informazioni delle squadre.
      </div>
    </div>
  );
};

export default SquadreTab;
