import React from 'react';
import { calculateBudgetStats, getRoleCategoryColor, getRoleCategoryName } from '../utils/budgetStats';

const Header = ({ dataCount = 0, teams = [], players = [] }) => {

  // Stili
  const headerStyle = {
    backgroundColor: 'white',
    borderBottom: '2px solid #e2e8f0',
    padding: '1rem 0',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  };

  const containerStyle = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 1rem',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  };

  const titleStyle = {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  };

  const statsStyle = {
    fontSize: '0.875rem',
    color: '#6b7280',
    marginLeft: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexWrap: 'wrap'
  };

  const statItemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.25rem 0.5rem',
    backgroundColor: '#f8fafc',
    borderRadius: '0.375rem',
    border: '1px solid #e2e8f0'
  };

  const roleStatStyle = (color) => ({
    ...statItemStyle,
    backgroundColor: color + '15',
    borderColor: color + '30',
    color: color
  });


  // Calculate budget statistics
  const budgetStats = calculateBudgetStats(teams, players);

  return (
    <header style={headerStyle}>
      <div style={containerStyle}>
        <h1 style={titleStyle}>
          ⚽ Mantravibe
        </h1>
        
        {/* Budget Statistics */}
        <div style={statsStyle}>
          {/* Total players bought */}
          <div style={statItemStyle}>
            <span>👥</span>
            <span>{budgetStats.totalPlayersBought}</span>
          </div>
          
          {/* Budget remaining / total */}
          <div style={statItemStyle}>
            <span>💰</span>
            <span>{budgetStats.totalBudgetRemaining.toLocaleString()}/{budgetStats.totalBudgetInitial.toLocaleString()}</span>
          </div>
          
          {/* Role spending percentages - % of total budget, not % of spend so far (same as Squadre tab) */}
          {Object.entries(budgetStats.roleSpending).map(([category, spending]) => {
            const percentage = budgetStats.totalBudgetInitial > 0
              ? (spending / budgetStats.totalBudgetInitial) * 100
              : 0;
            return (
              <div key={category} style={roleStatStyle(getRoleCategoryColor(category))}>
                <span>{getRoleCategoryName(category)}</span>
                <span>{percentage.toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </header>
  );
};

export default Header;
