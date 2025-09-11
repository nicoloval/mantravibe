import React, { useState } from 'react';

const Settings = ({ 
  isOpen, 
  onClose, 
  budget, 
  onBudgetChange, 
  minPlayers, 
  onMinPlayersChange, 
  maxPlayers, 
  onMaxPlayersChange,
  onReset,
  onExport,
  onImport
}) => {
  const [, setImportFile] = useState(null);

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImportFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          onImport(data);
          setImportFile(null);
          event.target.value = ''; // Reset file input
        } catch (error) {
          alert('Error importing file: Invalid JSON format');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleExport = () => {
    onExport();
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset everything? This action cannot be undone.')) {
      onReset();
    }
  };

  if (!isOpen) return null;

  const modalOverlayStyle = {
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
  };

  const modalStyle = {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    width: '90%',
    maxWidth: '400px',
    maxHeight: '80vh',
    overflowY: 'auto'
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb'
  };

  const titleStyle = {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#111827'
  };

  const closeButtonStyle = {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '4px',
    borderRadius: '4px',
    transition: 'background-color 0.2s'
  };

  const contentStyle = {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px'
  };

  const inputGroupStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    width: '100%'
  };

  const labelStyle = {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center'
  };

  const inputStyle = {
    width: '120px',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '1rem',
    textAlign: 'center',
    outline: 'none',
    transition: 'border-color 0.2s'
  };

  const buttonGroupStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    width: '100%'
  };

  const buttonStyle = {
    width: '200px',
    padding: '12px 16px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.875rem',
    transition: 'all 0.2s',
    textAlign: 'center'
  };

  const exportButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#3b82f6',
    color: 'white'
  };

  const importButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#10b981',
    color: 'white'
  };

  const resetButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#dc2626',
    color: 'white'
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>⚙️</h2>
          <button style={closeButtonStyle} onClick={onClose}>×</button>
        </div>
        
        <div style={contentStyle}>
          {/* Budget Setting */}
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Budget (Fantamilioni)</label>
            <input
              type="number"
              value={budget}
              onChange={(e) => onBudgetChange(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.1"
              style={inputStyle}
            />
          </div>

          {/* Min Players Setting */}
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Minimum Players</label>
            <input
              type="number"
              value={minPlayers}
              onChange={(e) => onMinPlayersChange(parseInt(e.target.value) || 0)}
              min="0"
              max="50"
              style={inputStyle}
            />
          </div>

          {/* Max Players Setting */}
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Maximum Players</label>
            <input
              type="number"
              value={maxPlayers}
              onChange={(e) => onMaxPlayersChange(parseInt(e.target.value) || 0)}
              min="0"
              max="50"
              style={inputStyle}
            />
          </div>

          {/* Buttons */}
          <div style={buttonGroupStyle}>
            <button 
              style={exportButtonStyle}
              onClick={handleExport}
            >
              📤 Export Data
            </button>
            
            <label htmlFor="import-file" style={importButtonStyle}>
              📥 Import Data
              <input
                type="file"
                id="import-file"
                accept=".json"
                onChange={handleImport}
                style={{ display: 'none' }}
              />
            </label>

            <button 
              style={resetButtonStyle}
              onClick={handleReset}
            >
              🗑️ Reset Everything
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
