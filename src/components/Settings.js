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
  const [importFile, setImportFile] = useState(null);

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

  return (
    <div className="settings-overlay">
      <div className="settings-modal">
        <div className="settings-header">
          <h2>⚙️ Settings</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="settings-content">
          {/* Budget Setting */}
          <div className="setting-group">
            <label htmlFor="budget">Budget (Fantamilioni):</label>
            <input
              type="number"
              id="budget"
              value={budget}
              onChange={(e) => onBudgetChange(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.1"
            />
          </div>

          {/* Min Players Setting */}
          <div className="setting-group">
            <label htmlFor="minPlayers">Minimum Players:</label>
            <input
              type="number"
              id="minPlayers"
              value={minPlayers}
              onChange={(e) => onMinPlayersChange(parseInt(e.target.value) || 0)}
              min="0"
              max="50"
            />
          </div>

          {/* Max Players Setting */}
          <div className="setting-group">
            <label htmlFor="maxPlayers">Maximum Players:</label>
            <input
              type="number"
              id="maxPlayers"
              value={maxPlayers}
              onChange={(e) => onMaxPlayersChange(parseInt(e.target.value) || 0)}
              min="0"
              max="50"
            />
          </div>

          {/* Export/Import Section */}
          <div className="setting-group">
            <h3>Data Management</h3>
            
            <div className="export-import-buttons">
              <button 
                className="export-button"
                onClick={handleExport}
              >
                📤 Export Data
              </button>
              
              <label htmlFor="import-file" className="import-button">
                📥 Import Data
                <input
                  type="file"
                  id="import-file"
                  accept=".json"
                  onChange={handleImport}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>

          {/* Reset Section */}
          <div className="setting-group">
            <h3>Danger Zone</h3>
            <button 
              className="reset-button"
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
