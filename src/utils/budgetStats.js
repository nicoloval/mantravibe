// Budget statistics utility functions
import { theme } from '../theme';

/**
 * Calculate budget statistics for all teams
 * @param {Array} teams - Array of team objects
 * @param {Array} players - Array of all players
 * @returns {Object} Budget statistics
 */
export function calculateBudgetStats(teams, players) {
  if (!teams || !Array.isArray(teams) || !players || !Array.isArray(players)) {
    return {
      totalPlayersBought: 0,
      totalBudgetRemaining: 0,
      totalBudgetInitial: 0,
      totalSpent: 0,
      roleSpending: {
        goalkeepers: 0,
        defenders: 0,
        midfielders: 0,
        wingers: 0,
        attackers: 0
      },
      rolePercentages: {
        goalkeepers: 0,    // P (orange)
        defenders: 0,      // Dc, Dd, Ds, B (green)
        midfielders: 0,    // C, M, E (blue)
        wingers: 0,        // T, W (purple)
        attackers: 0       // A, Pc (red)
      }
    };
  }

  // Calculate total players bought and budget remaining
  let totalPlayersBought = 0;
  let totalBudgetRemaining = 0;
  let totalBudgetInitial = 0;
  let totalSpent = 0;

  // Role spending tracking
  const roleSpending = {
    goalkeepers: 0,    // P
    defenders: 0,      // Dc, Dd, Ds, B
    midfielders: 0,    // C, M, E
    wingers: 0,        // T, W
    attackers: 0       // A, Pc
  };

  teams.forEach(team => {
    totalBudgetInitial += team.budget || 0;
    const teamPlayers = team.players || [];
    totalPlayersBought += teamPlayers.length;
    
    teamPlayers.forEach(player => {
      const playerPrice = player.price || 0;
      totalSpent += playerPrice;
      
      // Get player roles and categorize spending
      const playerData = players.find(p => p.id === player.id);
      if (playerData && playerData['Ruolo Mantra']) {
        // Parse the string representation of array (e.g., "['E']" or "['W', 'F']")
        let roles;
        try {
          roles = JSON.parse(playerData['Ruolo Mantra']);
        } catch (e) {
          // Fallback: handle the string format more carefully
          const roleString = playerData['Ruolo Mantra'];
          // Remove outer brackets and quotes, then split by comma
          const cleanString = roleString.replace(/^\[|\]$/g, '').replace(/['"]/g, '');
          roles = cleanString.split(',').map(role => role.trim());
        }
        
        // Debug logging
        console.log(`🔍 DEBUG: Player ${playerData.Nome} - Raw Ruolo Mantra: "${playerData['Ruolo Mantra']}"`);
        console.log(`🔍 DEBUG: Parsed roles:`, roles);
        
        // If player has only one role, use it directly
        if (roles.length === 1) {
          const roleCategory = categorizeRole(roles[0]);
          console.log(`🔍 DEBUG: Single role ${roles[0]} -> Category: ${roleCategory}`);
          roleSpending[roleCategory] += playerPrice;
        } else if (roles.length > 1) {
          // If player has multiple roles, use the one with lowest appetibilita
          const roleWithLowestAppetibilita = getRoleWithLowestAppetibilita(roles);
          const roleCategory = categorizeRole(roleWithLowestAppetibilita);
          console.log(`🔍 DEBUG: Multi-role ${roles.join(',')} -> Lowest: ${roleWithLowestAppetibilita} -> Category: ${roleCategory}`);
          roleSpending[roleCategory] += playerPrice;
        }
      }
    });
  });

  totalBudgetRemaining = totalBudgetInitial - totalSpent;

  // Calculate percentages
  const rolePercentages = {
    goalkeepers: totalSpent > 0 ? (roleSpending.goalkeepers / totalSpent) * 100 : 0,
    defenders: totalSpent > 0 ? (roleSpending.defenders / totalSpent) * 100 : 0,
    midfielders: totalSpent > 0 ? (roleSpending.midfielders / totalSpent) * 100 : 0,
    wingers: totalSpent > 0 ? (roleSpending.wingers / totalSpent) * 100 : 0,
    attackers: totalSpent > 0 ? (roleSpending.attackers / totalSpent) * 100 : 0
  };

  return {
    totalPlayersBought,
    totalBudgetRemaining,
    totalBudgetInitial,
    totalSpent,
    roleSpending,
    rolePercentages
  };
}

/**
 * Get the role with the lowest appetibilita from a list of roles
 * @param {Array} roles - Array of role codes
 * @returns {string} Role with lowest appetibilita
 */
function getRoleWithLowestAppetibilita(roles) {
  // Appetibilita values from roles.csv, keyed by the Mantra role codes used directly in
  // player['Ruolo Mantra'] (P, Dc, Dd, Ds, B, E, M, C, W, T, A, Pc).
  const roleAppetibilita = {
    'P': 1,
    'Dc': 1,
    'B': 1,
    'Dd': 1,
    'Ds': 1,
    'E': 2,
    'M': 2,
    'C': 2,
    'W': 3,
    'T': 3,
    'A': 3,
    'Pc': 3
  };

  let lowestAppetibilita = Infinity;
  let roleWithLowestAppetibilita = roles[0]; // Default to first role

  roles.forEach(role => {
    const appetibilita = roleAppetibilita[role] || 0;
    if (appetibilita < lowestAppetibilita) {
      lowestAppetibilita = appetibilita;
      roleWithLowestAppetibilita = role;
    }
  });

  return roleWithLowestAppetibilita;
}

/**
 * Categorize a role into spending categories
 * @param {string} role - Mantra role code, as found in player['Ruolo Mantra']
 * @returns {string} Category name
 */
function categorizeRole(role) {
  // Goalkeepers (orange)
  if (role === 'P') {
    return 'goalkeepers';
  }

  // Defenders (green)
  if (['Dc', 'B', 'Dd', 'Ds'].includes(role)) {
    return 'defenders';
  }

  // Midfielders (blue)
  if (['E', 'M', 'C'].includes(role)) {
    return 'midfielders';
  }

  // Wingers (purple)
  if (['W', 'T'].includes(role)) {
    return 'wingers';
  }

  // Attackers (red)
  if (['A', 'Pc'].includes(role)) {
    return 'attackers';
  }

  // Default to midfielders for unknown roles
  return 'midfielders';
}

/**
 * Get role category color
 * @param {string} category - Role category
 * @returns {string} Color code
 */
export function getRoleCategoryColor(category) {
  return theme.roleCategory[category] || theme.textMuted;
}

/**
 * Get role category display name
 * @param {string} category - Role category
 * @returns {string} Display name
 */
export function getRoleCategoryName(category) {
  const names = {
    goalkeepers: 'P',
    defenders: 'Dc,B,Dd,Ds',
    midfielders: 'E,M,C',
    wingers: 'W,T',
    attackers: 'A,Pc'
  };
  return names[category] || category;
}
