// Budget statistics utility functions

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
    rolePercentages
  };
}

/**
 * Get the role with the lowest appetibilita from a list of roles
 * @param {Array} roles - Array of role codes
 * @returns {string} Role with lowest appetibilita
 */
function getRoleWithLowestAppetibilita(roles) {
  // Role appetibilita mapping from roles.csv (updated values)
  const roleAppetibilita = {
    'G': 1,    // P
    'CB': 2,   // Dc
    'LA': 2,   // B
    'RB': 2,   // Dd
    'LB': 2,   // Ds
    'E': 3,    // E
    'DM': 3,   // M
    'M': 4,    // C
    'W': 5,    // W
    'OM': 5,   // T
    'F': 6,    // A
    'CF': 6    // Pc
  };
  
  console.log(`🔍 DEBUG: Finding lowest appetibilita role from:`, roles);
  
  let lowestAppetibilita = Infinity;
  let roleWithLowestAppetibilita = roles[0]; // Default to first role
  
  roles.forEach(role => {
    const appetibilita = roleAppetibilita[role.toUpperCase()] || 0;
    console.log(`🔍 DEBUG: Role ${role} (${role.toUpperCase()}) has appetibilita: ${appetibilita}`);
    if (appetibilita < lowestAppetibilita) {
      lowestAppetibilita = appetibilita;
      roleWithLowestAppetibilita = role;
      console.log(`🔍 DEBUG: New lowest role: ${role} with appetibilita ${appetibilita}`);
    }
  });
  
  console.log(`🔍 DEBUG: Final selected role: ${roleWithLowestAppetibilita} (appetibilita: ${lowestAppetibilita})`);
  return roleWithLowestAppetibilita;
}

/**
 * Categorize a role into spending categories
 * @param {string} role - Role code (English from roles.csv)
 * @returns {string} Category name
 */
function categorizeRole(role) {
  const roleUpper = role.toUpperCase();
  
  console.log(`🔍 DEBUG: Categorizing role "${role}" (uppercase: "${roleUpper}")`);
  
  // Goalkeepers (orange) - G -> P
  if (roleUpper === 'G') {
    console.log(`🔍 DEBUG: Role ${roleUpper} -> goalkeepers`);
    return 'goalkeepers';
  }
  
  // Defenders (green) - CB, LA, RB, LB -> Dc, B, Dd, Ds
  if (['CB', 'LA', 'RB', 'LB'].includes(roleUpper)) {
    console.log(`🔍 DEBUG: Role ${roleUpper} -> defenders`);
    return 'defenders';
  }
  
  // Midfielders (blue) - E, DM, M -> E, M, C
  if (['E', 'DM', 'M'].includes(roleUpper)) {
    console.log(`🔍 DEBUG: Role ${roleUpper} -> midfielders`);
    return 'midfielders';
  }
  
  // Wingers (purple) - W, OM -> W, T
  if (['W', 'OM'].includes(roleUpper)) {
    console.log(`🔍 DEBUG: Role ${roleUpper} -> wingers`);
    return 'wingers';
  }
  
  // Attackers (red) - F, CF -> A, Pc
  if (['F', 'CF'].includes(roleUpper)) {
    console.log(`🔍 DEBUG: Role ${roleUpper} -> attackers`);
    return 'attackers';
  }
  
  // Default to midfielders for unknown roles
  console.log(`🔍 DEBUG: Role ${roleUpper} -> midfielders (default)`);
  return 'midfielders';
}

/**
 * Get role category color
 * @param {string} category - Role category
 * @returns {string} Color code
 */
export function getRoleCategoryColor(category) {
  const colors = {
    goalkeepers: '#f97316',  // Orange
    defenders: '#10b981',    // Green
    midfielders: '#3b82f6',  // Blue
    wingers: '#8b5cf6',      // Purple
    attackers: '#ef4444'     // Red
  };
  return colors[category] || '#6b7280';
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
