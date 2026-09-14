import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { calculateBudgetStats, getRoleCategoryColor, getRoleCategoryName } from '../utils/budgetStats';
import { theme } from '../theme';

const Header = ({ dataCount = 0, teams = [], players = [], themeMode, onToggleTheme, onOpenSettings }) => {
  const navigate = useNavigate();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const isMobile = windowWidth <= 768;

  // Stili
  const headerStyle = {
    backgroundColor: theme.surface,
    borderBottom: `2px solid ${theme.border}`,
    padding: '0.625rem 0',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.35)'
  };

  // On desktop everything fits on one row. On mobile the role-spending bar (and its legend,
  // which is dropped entirely - see legendStyle) wraps to its own second row so the title,
  // player count, budget and icon buttons on the first row never get clipped.
  const containerStyle = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 1rem',
    display: 'flex',
    flexWrap: isMobile ? 'wrap' : 'nowrap',
    alignItems: 'center',
    gap: '0.875rem'
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

  // On mobile this row (just the stacked bar - the legend is dropped, see legendStyle) gets
  // pushed onto its own full-width second line via `order`, so it never competes for space
  // with the title/count/budget/icons on the first line.
  const barRowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
    flex: '1 1 auto',
    minWidth: 0,
    order: isMobile ? 5 : 0,
    flexBasis: isMobile ? '100%' : 'auto'
  };

  // The per-category "% of budget" legend is desktop-only real estate - on mobile the bar
  // itself (with its title="" tooltips) is enough, dropping this saves the row that used to
  // get clipped off the right edge of the screen.
  const legendStyle = {
    display: isMobile ? 'none' : 'flex',
    alignItems: 'center',
    gap: '0.625rem',
    fontSize: '0.7rem',
    color: theme.textMuted,
    whiteSpace: 'nowrap',
    flexShrink: 0
  };

  // 44px is the minimum comfortable touch target (Apple HIG / WCAG 2.5.5); the glyph itself
  // stays small, the button's hit area grows around it.
  const iconButtonStyle = {
    background: 'none',
    color: theme.textMuted,
    border: 'none',
    cursor: 'pointer',
    transition: 'transform 0.2s',
    flexShrink: 0,
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '44px',
    minHeight: '44px',
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
            flex: isMobile ? '1 1 auto' : '0 1 180px',
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

        <button
          style={{ ...iconButtonStyle, fontSize: '1.4rem' }}
          onClick={() => navigate('/about')}
          title="Come funziona la formazione"
          onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
        >
          ℹ️
        </button>

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
