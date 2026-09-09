import React from 'react';
import { calculateBudgetStats, getRoleCategoryColor, getRoleCategoryName } from '../utils/budgetStats';
import { theme } from '../theme';

const Header = ({ dataCount = 0, teams = [], players = [], themeMode, onToggleTheme, onOpenSettings }) => {

  // Stili
  const headerStyle = {
    backgroundColor: theme.surface,
    borderBottom: `2px solid ${theme.border}`,
    padding: '0.625rem 0',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.35)'
  };

  // Everything - title, bar, legend, player count, budget - on one row. overflowX: 'auto' is
  // just a safety net for very narrow viewports; at normal widths it all fits without scrolling.
  const containerStyle = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.875rem',
    overflowX: 'auto'
  };

  const titleStyle = {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: theme.text,
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexShrink: 0,
    whiteSpace: 'nowrap'
  };

  const statsStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexShrink: 0
  };

  const statItemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.2rem 0.5rem',
    fontSize: '0.8rem',
    backgroundColor: theme.surfaceAlt,
    borderRadius: '0.375rem',
    border: `1px solid ${theme.border}`,
    color: theme.text,
    whiteSpace: 'nowrap'
  };

  const barRowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
    flex: '1 1 auto',
    minWidth: 0
  };

  const legendStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
    fontSize: '0.7rem',
    color: theme.textMuted,
    whiteSpace: 'nowrap',
    flexShrink: 0
  };

  const iconButtonStyle = {
    background: 'none',
    color: theme.textMuted,
    border: 'none',
    cursor: 'pointer',
    transition: 'transform 0.2s',
    flexShrink: 0,
    lineHeight: 1,
    padding: 0
  };

  // Calculate budget statistics
  const budgetStats = calculateBudgetStats(teams, players);
  const roleEntries = Object.entries(budgetStats.roleSpending);

  return (
    <header style={headerStyle}>
      <div style={containerStyle}>
        <h1 style={titleStyle}>
          ⚽ Mantravibe
        </h1>

        {/* Role spending as a single stacked bar - % of total budget, not % of spend so far
            (same as Squadre tab). Takes up the slack between the title and the stat pills. */}
        <div style={barRowStyle}>
          <div style={{
            display: 'flex',
            flex: '0 1 180px',
            minWidth: '100px',
            height: '10px',
            borderRadius: '999px',
            overflow: 'hidden',
            backgroundColor: theme.surfaceAlt,
            border: `1px solid ${theme.border}`
          }}>
            {roleEntries.map(([category, spending]) => {
              const percentage = budgetStats.totalBudgetInitial > 0
                ? (spending / budgetStats.totalBudgetInitial) * 100
                : 0;
              if (percentage <= 0) return null;
              return (
                <div
                  key={category}
                  title={`${getRoleCategoryName(category)}: ${percentage.toFixed(1)}%`}
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: getRoleCategoryColor(category),
                    transition: 'width 0.2s ease'
                  }}
                />
              );
            })}
          </div>
          <div style={legendStyle}>
            {roleEntries.map(([category, spending]) => {
              const percentage = budgetStats.totalBudgetInitial > 0
                ? (spending / budgetStats.totalBudgetInitial) * 100
                : 0;
              return (
                <div key={category} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '2px',
                    backgroundColor: getRoleCategoryColor(category),
                    display: 'inline-block'
                  }} />
                  <span>{getRoleCategoryName(category)}</span>
                  <span style={{ color: theme.text, fontWeight: 600 }}>{percentage.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>

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
        </div>

        {onToggleTheme && (
          <button
            style={{ ...iconButtonStyle, fontSize: '1.3rem' }}
            onClick={onToggleTheme}
            title={themeMode === 'light' ? 'Passa al tema scuro' : 'Passa al tema chiaro'}
            onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
          >
            {themeMode === 'light' ? '🌙' : '☀️'}
          </button>
        )}

        {onOpenSettings && (
          <button
            style={{ ...iconButtonStyle, fontSize: '1.6rem' }}
            onClick={onOpenSettings}
            title="Settings"
            onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
          >
            ⚙️
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
