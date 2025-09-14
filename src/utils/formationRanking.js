// src/utils/formationRanking.js
// Implementation of the Mantra Formation Ranking Algorithm

// All Mantra roles
const ALL_ROLES = ['P', 'Dd', 'Dc', 'Ds', 'B', 'E', 'M', 'C', 'W', 'T', 'A', 'Pc'];

// Role priority for deterministic role selection (from most offensive to most defensive)
const ROLE_PRIORITY = ['Pc', 'A', 'T', 'W', 'C', 'E', 'M', 'Ds', 'Dd', 'Dc', 'B', 'P'];

/**
 * Check if a player can play in a specific slot
 * @param {Object} player - Player object with roles array
 * @param {Array} allowedRoles - Array of allowed roles for the slot
 * @returns {boolean}
 */
export function canPlay(player, allowedRoles) {
  const result = player.roles.some(role => allowedRoles.includes(role));
  console.log(`🔍 DEBUG: canPlay(${player.name}, [${allowedRoles.join(',')}]) - Player roles: [${player.roles.join(',')}] - Result: ${result}`);
  return result;
}

/**
 * Maximum bipartite matching using Hopcroft-Karp algorithm
 * @param {Array} slots - Array of slot objects with allowedRoles
 * @param {Array} players - Array of player objects
 * @returns {Map} Assignment map from slot index to player index
 */
function hopcroftKarpMatching(slots, players) {
  const n = slots.length;
  const m = players.length;
  
  console.log(`🔍 DEBUG: Hopcroft-Karp matching - ${n} slots, ${m} players`);
  
  // Build adjacency list
  const adj = Array(n).fill().map(() => []);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      const canPlayResult = canPlay(players[j], slots[i].allowedRoles);
      if (canPlayResult) {
        adj[i].push(j);
        console.log(`🔍 DEBUG: Player ${players[j].name} (${players[j].roles}) can play slot ${i} (${slots[i].allowedRoles})`);
      }
    }
  }
  
  console.log('🔍 DEBUG: Adjacency list:', adj.map((edges, i) => ({ 
    slot: i, 
    allowedRoles: slots[i].allowedRoles, 
    compatiblePlayers: edges.map(j => `${players[j].name}(${players[j].roles.join(',')})`)
  })));
  
  // Check if any slots have compatible players
  const totalCompatible = adj.reduce((sum, edges) => sum + edges.length, 0);
  console.log(`🔍 DEBUG: Total compatible player-slot pairs: ${totalCompatible}`);
  
  // Hopcroft-Karp implementation
  const pairU = Array(n).fill(-1);
  const pairV = Array(m).fill(-1);
  const dist = Array(n).fill(0);
  
  function bfs() {
    const queue = [];
    for (let u = 0; u < n; u++) {
      if (pairU[u] === -1) {
        dist[u] = 0;
        queue.push(u);
      } else {
        dist[u] = Infinity;
      }
    }
    dist[-1] = Infinity;
    
    while (queue.length > 0) {
      const u = queue.shift();
      if (dist[u] < dist[-1]) {
        for (const v of adj[u]) {
          if (dist[pairV[v]] === Infinity) {
            dist[pairV[v]] = dist[u] + 1;
            queue.push(pairV[v]);
          }
        }
      }
    }
    return dist[-1] !== Infinity;
  }
  
  function dfs(u) {
    if (u !== -1) {
      for (const v of adj[u]) {
        if (dist[pairV[v]] === dist[u] + 1) {
          if (dfs(pairV[v])) {
            pairU[u] = v;
            pairV[v] = u;
            return true;
          }
        }
      }
      dist[u] = Infinity;
      return false;
    }
    return true;
  }
  
  let matching = 0;
  while (bfs()) {
    for (let u = 0; u < n; u++) {
      if (pairU[u] === -1) {
        if (dfs(u)) {
          matching++;
        }
      }
    }
  }
  
  // Convert to assignment map
  const assignment = new Map();
  for (let i = 0; i < n; i++) {
    if (pairU[i] !== -1) {
      assignment.set(i, pairU[i]);
      console.log(`🔍 DEBUG: Assignment - Slot ${i} (${slots[i].allowedRoles}) → Player ${players[pairU[i]].name} (${players[pairU[i]].roles})`);
    }
  }
  
  console.log(`🔍 DEBUG: Final assignment: ${assignment.size}/${n} slots filled`);
  return assignment;
}

/**
 * Choose which role a player uses for a specific slot
 * @param {Array} playerRoles - Player's available roles
 * @param {Array} allowedRoles - Slot's allowed roles
 * @returns {string} The role that will be used
 */
function chooseUsedRole(playerRoles, allowedRoles) {
  const intersection = playerRoles.filter(role => allowedRoles.includes(role));
  if (intersection.length === 0) return null;
  
  // Use priority order for deterministic selection
  for (const role of ROLE_PRIORITY) {
    if (intersection.includes(role)) {
      return role;
    }
  }
  
  return intersection[0]; // Fallback
}

/**
 * Count starters by role based on assignment
 * @param {Map} assignment - Slot index to player index mapping
 * @param {Array} slots - Formation slots
 * @param {Array} players - Available players
 * @returns {Map} Role to count mapping
 */
function countStartersByRole(assignment, slots, players) {
  const counts = new Map();
  ALL_ROLES.forEach(role => counts.set(role, 0));
  
  for (const [slotIndex, playerIndex] of assignment) {
    const player = players[playerIndex];
    const slot = slots[slotIndex];
    const usedRole = chooseUsedRole(player.roles, slot.allowedRoles);
    if (usedRole) {
      counts.set(usedRole, counts.get(usedRole) + 1);
    }
  }
  
  return counts;
}

/**
 * Count available players by role
 * @param {Array} players - Available players
 * @returns {Map} Role to count mapping
 */
function countAvailableByRole(players) {
  const counts = new Map();
  ALL_ROLES.forEach(role => counts.set(role, 0));
  
  players.forEach(player => {
    player.roles.forEach(role => {
      counts.set(role, counts.get(role) + 1);
    });
  });
  
  return counts;
}

/**
 * Count unusable players for a formation
 * @param {Array} players - Available players
 * @param {Array} slots - Formation slots
 * @returns {number} Number of unusable players
 */
function countUnusablePlayers(players, slots) {
  let unusable = 0;
  
  players.forEach(player => {
    let usable = false;
    for (const slot of slots) {
      if (canPlay(player, slot.allowedRoles)) {
        usable = true;
        break;
      }
    }
    if (!usable) {
      unusable++;
    }
  });
  
  return unusable;
}

/**
 * Evaluate formation fit for a given player pool
 * @param {Array} players - Available players
 * @param {Object} formation - Formation object with slots
 * @param {Object} config - Evaluation configuration
 * @returns {Object} Score and breakdown
 */
export function evaluateFormationFit(players, formation, config) {
  const slots = formation.positions.map((allowedRoles, index) => ({
    id: `slot_${index}`,
    allowedRoles
  }));
  
  console.log(`🔍 DEBUG: Evaluating formation with ${slots.length} slots`);
  console.log(`🔍 DEBUG: Players available:`, players.length);
  console.log(`🔍 DEBUG: Players:`, players.map(p => ({ name: p.name, roles: p.roles })));
  console.log(`🔍 DEBUG: Slots:`, slots.map(s => ({ id: s.id, allowedRoles: s.allowedRoles })));
  
  if (players.length === 0) {
    console.log('🔍 DEBUG: ERROR - No players provided to ranking algorithm!');
    return { score: 0, breakdown: { starterFilled: 0, starterTotal: 11, starterFraction: 0, backupSlotsWithCoverage: 0, backupFraction: 0, roleDeficitUnits: 0, unusablePlayers: 0, notes: ['No players available'] } };
  }
  
  // 1) Compute optimal starter assignment
  const assignment = hopcroftKarpMatching(slots, players);
  const starterFilled = assignment.size;
  const starterTotal = 11;
  const starterFraction = starterFilled / starterTotal;
  
  console.log(`🔍 DEBUG: Assignment result: ${starterFilled}/${starterTotal} slots filled`);
  
  // 2) Identify bench candidates and compute backup coverage
  const usedPlayerIndices = new Set(assignment.values());
  const bench = players.filter((_, index) => !usedPlayerIndices.has(index));
  
  let backupSlotsWithCoverage = 0;
  const missingStarters = starterTotal - starterFilled;
  
  for (let i = 0; i < slots.length; i++) {
    if (assignment.has(i)) {
      const hasBackup = bench.some(player => canPlay(player, slots[i].allowedRoles));
      if (hasBackup) {
        backupSlotsWithCoverage++;
      }
    }
  }
  
  const backupFraction = backupSlotsWithCoverage / starterTotal;
  
  // 3) Role-based ideal counts and deficits
  const startersByRole = countStartersByRole(assignment, slots, players);
  const availableByRole = countAvailableByRole(players);
  
  const backupTargetPerRole = new Map();
  ALL_ROLES.forEach(role => {
    const baseTarget = config.roleBackupOverride?.[role] || config.backupPerSlotTarget;
    backupTargetPerRole.set(role, baseTarget);
  });
  
  const idealCountByRole = new Map();
  ALL_ROLES.forEach(role => {
    const ideal = startersByRole.get(role) + backupTargetPerRole.get(role);
    idealCountByRole.set(role, ideal);
  });
  
  let roleDeficitUnits = 0;
  const notes = [];
  
  ALL_ROLES.forEach(role => {
    const available = availableByRole.get(role);
    const ideal = idealCountByRole.get(role);
    if (ideal > available) {
      const deficit = ideal - available;
      roleDeficitUnits += deficit;
      if (deficit >= 1) {
        notes.push(`deficit ${role} by ${deficit}`);
      }
    }
  });
  
  // 4) Unusable players
  const unusablePlayers = countUnusablePlayers(players, slots);
  
  // 5) Absolute Scoring (0-100)
  // Perfect score = 100: 11/11 starters + 11/11 backups + 0 unusable players
  let score = 0;
  
  // Starter coverage: 0-50 points (50 points for 11/11 starters)
  const starterScore = config.weightStarterCover * starterFraction;
  
  // Backup coverage: 0-30 points (30 points for 11/11 backups)
  const backupScore = config.weightBackupCover * backupFraction;
  
  // Unusable player penalty: 0-20 points penalty (20 points max penalty)
  const unusablePenalty = Math.min(config.weightUnusablePlayer, config.weightUnusablePlayer * (unusablePlayers / Math.max(players.length, 1)));
  
  score = starterScore + backupScore - unusablePenalty;
  
  // Ensure score is between 0 and 100
  score = Math.max(0, Math.min(100, score));
  
  console.log(`🔍 DEBUG: Absolute scoring breakdown:`, {
    starterScore: starterScore.toFixed(2),
    backupScore: backupScore.toFixed(2),
    unusablePenalty: unusablePenalty.toFixed(2),
    totalScore: score.toFixed(2),
    breakdown: {
      starterFilled: `${starterFilled}/11`,
      backupCoverage: `${backupSlotsWithCoverage}/11`,
      unusablePlayers: unusablePlayers
    }
  });
  
  const breakdown = {
    starterFilled,
    starterTotal,
    starterFraction,
    backupSlotsWithCoverage,
    backupFraction,
    roleDeficitUnits,
    unusablePlayers,
    notes
  };
  
  return { score, breakdown };
}

/**
 * Default evaluation configuration
 * Scoring designed to achieve 0-100 range:
 * - 100 = Perfect formation (11 starters + backups + no unusable players)
 * - 0 = No players or worst possible formation
 */
export const DEFAULT_CONFIG = {
  backupPerSlotTarget: 1,
  roleBackupOverride: {
    'P': 2 // GK wants 2 backups
  },
  // Weights designed for 0-100 scoring
  weightStarterCover: 50.0,      // 50 points for full starter coverage (11/11)
  weightBackupCover: 30.0,       // 30 points for full backup coverage (11/11)
  weightMissingStarter: 0,       // No penalty for missing starters (handled by starter coverage)
  weightDeficitPerRoleUnit: 0,   // No penalty for role deficits (handled by unusable players)
  weightUnusablePlayer: 20.0,    // 20 points penalty for unusable players (max penalty = 20)
  tiebreakers: ['starterFilled', 'backupFraction', 'fewestUnusable']
};

/**
 * Rank all formations for a given player pool
 * @param {Array} players - Available players
 * @param {Object} formations - Formations data
 * @param {Object} config - Evaluation configuration
 * @returns {Array} Ranked formation scores
 */
export function rankFormations(players, formations, config = DEFAULT_CONFIG) {
  const results = [];
  
  console.log('🔍 DEBUG: ===== FORMATION RANKING =====');
  console.log('🔍 DEBUG: Ranking formations with', players.length, 'players');
  console.log('🔍 DEBUG: Available formations:', Object.keys(formations));
  console.log('🔍 DEBUG: Players for ranking:', players.map(p => ({ name: p.name, roles: p.roles })));
  
  if (players.length === 0) {
    console.log('🔍 DEBUG: WARNING - No players available for ranking!');
  }
  
  for (const [code, formation] of Object.entries(formations)) {
    console.log(`🔍 DEBUG: ===== EVALUATING FORMATION ${code} =====`);
    const { score, breakdown } = evaluateFormationFit(players, formation, config);
    console.log(`🔍 DEBUG: Formation ${code} - Final Score: ${score.toFixed(2)}`, breakdown);
    results.push({
      code,
      score,
      breakdown
    });
  }
  
  // Sort by absolute score (descending) with tiebreakers
  results.sort((a, b) => {
    // Primary: absolute score descending
    if (Math.abs(a.score - b.score) > 0.001) {
      return b.score - a.score;
    }
    
    // Tiebreakers
    if (a.breakdown.starterFilled !== b.breakdown.starterFilled) {
      return b.breakdown.starterFilled - a.breakdown.starterFilled;
    }
    
    if (Math.abs(a.breakdown.backupFraction - b.breakdown.backupFraction) > 0.001) {
      return b.breakdown.backupFraction - a.breakdown.backupFraction;
    }
    
    if (a.breakdown.unusablePlayers !== b.breakdown.unusablePlayers) {
      return a.breakdown.unusablePlayers - b.breakdown.unusablePlayers;
    }
    
    if (a.breakdown.roleDeficitUnits !== b.breakdown.roleDeficitUnits) {
      return a.breakdown.roleDeficitUnits - b.breakdown.roleDeficitUnits;
    }
    
    // Final tiebreaker: formation code
    return a.code.localeCompare(b.code);
  });
  
  console.log('🔍 DEBUG: Final rankings:', results.map(r => ({ 
    code: r.code, 
    score: r.score.toFixed(1)
  })));
  
  return results;
}

/**
 * Role mapping from English to Italian (from roles.csv)
 */
const ROLE_MAPPING = {
  'G': 'P',      // Goalkeeper
  'CB': 'Dc',    // Center Back
  'LA': 'B',     // Left Back (Braccetto)
  'RB': 'Dd',    // Right Back (Destro)
  'LB': 'Ds',    // Left Back (Sinistro)
  'E': 'E',      // Wing
  'DM': 'M',     // Defensive Midfielder
  'M': 'C',      // Midfielder
  'W': 'W',      // Winger
  'OM': 'T',     // Offensive Midfielder (Trequartista)
  'F': 'A',      // Forward
  'CF': 'Pc'     // Center Forward (Punta Centrale)
};

/**
 * Convert player data to the format expected by the ranking algorithm
 * @param {Array} players - Raw player data
 * @param {Object} playerStatus - Player status mapping
 * @returns {Array} Processed players for ranking
 */
export function processPlayersForRanking(players, playerStatus) {
  console.log('🔍 DEBUG: ===== PLAYER PROCESSING =====');
  console.log('🔍 DEBUG: Total players in dataset:', players.length);
  console.log('🔍 DEBUG: Player status object keys:', Object.keys(playerStatus).length);
  console.log('🔍 DEBUG: Player status sample:', Object.entries(playerStatus).slice(0, 10));
  
  const acquiredPlayers = players.filter(player => {
    const status = playerStatus[player.id]?.status;
    const isAcquired = status === 'acquired';
    console.log(`🔍 DEBUG: Player ${player.name} (ID: ${player.id}) - Status: ${status} - Acquired: ${isAcquired}`);
    return isAcquired;
  });
  
  console.log('🔍 DEBUG: Acquired players count:', acquiredPlayers.length);
  console.log('🔍 DEBUG: Acquired players:', acquiredPlayers.map(p => ({ name: p.name, id: p.id, ruolo: p.Ruolo })));
  
  const processedPlayers = acquiredPlayers.map(player => {
    const englishRoles = player.Ruolo ? player.Ruolo.split(',').map(r => r.trim()) : [];
    const italianRoles = englishRoles.map(role => ROLE_MAPPING[role] || role).filter(role => role);
    
    console.log(`🔍 DEBUG: Processing ${player.name} - Raw Ruolo: "${player.Ruolo}" - English roles: [${englishRoles.join(',')}] - Italian roles: [${italianRoles.join(',')}]`);
    
    return {
      id: player.id,
      name: player.name,
      roles: italianRoles
    };
  });
  
  console.log('🔍 DEBUG: Final processed players for ranking:', processedPlayers);
  console.log('🔍 DEBUG: ===== END PLAYER PROCESSING =====');
  return processedPlayers;
}
