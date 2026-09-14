// Shared formation-fit scoring: computes how well a team's roster covers a given formation's 11
// starter slots plus role-balanced reserve depth, and turns that into a single 0-100 score.
//
// This used to be duplicated (with the assignment logic re-typed each time) across
// RosaAcquistata.js and FantamilioniBar.js. Both now call these functions so there is exactly one
// place that defines "how good is this formation for this roster".

// Max reserve credit any single role can contribute - having 5 backup wingers doesn't make up for
// having zero backup goalkeepers, so credit per role saturates here.
const RESERVE_CAP_PER_ROLE = 2;

// Point budget: a roster that fills all 11 starter slots and has >= RESERVE_CAP_PER_ROLE usable
// reserves in every role the formation needs, with no unusable players, scores exactly 100.
const WEIGHTS = { starters: 60, reserves: 40, maxPenalty: 30 };

// Score bands used to color-code formation buttons in the UI.
export const SCORE_THRESHOLDS = { good: 75, ok: 50 };

// Fallback Fantamedia when a player has no usable data for either season - goalkeepers get a
// lower baseline than outfield players, roughly matching typical fantacalcio scoring by role.
export const FANTAMEDIA_FALLBACK_GOALKEEPER = 5;
export const FANTAMEDIA_FALLBACK_DEFAULT = 6;
const FANTAMEDIA_SEASON_KEYS = ['Fantamedia 2025-2026', 'Fantamedia 2026-2027'];

// Two candidates for the same slot with Fantamedia within this many points of each other are
// treated as tied, falling through to role appetibilita (then FVM) instead of letting a razor-
// thin gap (6.61 vs 6.58) override the scarcity logic the way a real one (7.8 vs 6.0) should.
// Exported as a named constant so it can be promoted to a user-tunable setting later without
// touching the comparison logic itself.
export const FANTAMEDIA_TIE_THRESHOLD = 0.1;

// A season's Fantamedia of exactly 0 means the player had no appearances that season (final.json
// uses 0 as a placeholder, not a real average), so it's treated as missing rather than averaged
// in. A player's Fantamedia is the average of whichever season(s) actually have data; if neither
// does, it falls back to a role-based default.
export function getPlayerFantamedia(player) {
  const availableValues = FANTAMEDIA_SEASON_KEYS
    .map(key => player[key])
    .filter(value => typeof value === 'number' && value > 0);

  if (availableValues.length === 0) {
    return player.Ruolo === 'POR' ? FANTAMEDIA_FALLBACK_GOALKEEPER : FANTAMEDIA_FALLBACK_DEFAULT;
  }
  return availableValues.reduce((sum, value) => sum + value, 0) / availableValues.length;
}

// Ranks two starter/reserve candidates competing for the same slot - shared by assignStarters
// below and by RosaAcquistata.js's reserve-assignment pass, so titolari, riserve and the score
// all agree on who wins a slot. Higher Fantamedia wins once the gap clears
// FANTAMEDIA_TIE_THRESHOLD; within that band, falls back to role appetibilita (lower/rarer wins,
// preserving slots for players with fewer alternatives), then FVM.
export function compareCandidatesForSlot(a, b, fantamediaTieThreshold = FANTAMEDIA_TIE_THRESHOLD) {
  const fantamediaGap = getPlayerFantamedia(b.playerData.player) - getPlayerFantamedia(a.playerData.player);
  if (Math.abs(fantamediaGap) >= fantamediaTieThreshold) {
    return fantamediaGap;
  }
  if (a.appetibilita !== b.appetibilita) {
    return a.appetibilita - b.appetibilita;
  }
  return b.fpediaScore - a.fpediaScore;
}

// Builds the {player, possibleRoles, unusedRoles, ...} view of a team's roster against one
// formation - shared by both the starter-assignment pass and the reserve-bucketing pass.
function buildTeamPlayersWithRoles(team, formationPositions, players, getRoleRanking, getPlayerRole, translateRoleToItalian) {
  return (team.players || []).map(teamPlayer => {
    if (!teamPlayer) return null;

    const playerDetail = players.find(p => p.id === teamPlayer.id);
    if (!playerDetail) return null;

    let possibleRoles = [];
    let unusedRoles = [];

    if (playerDetail['Ruolo Mantra']) {
      try {
        const roles = JSON.parse(playerDetail['Ruolo Mantra'].replace(/'/g, '"'));

        roles.forEach(englishRole => {
          let roleMatched = false;
          const italianRole = translateRoleToItalian(englishRole);

          formationPositions.forEach(position => {
            const roleMatch = position.roles.some(formationRole =>
              formationRole.toLowerCase() === italianRole.toLowerCase()
            );

            if (roleMatch) {
              roleMatched = true;
              const formationRole = position.roles.find(formationRole =>
                formationRole.toLowerCase() === italianRole.toLowerCase()
              );

              if (formationRole) {
                possibleRoles.push({
                  role: formationRole,
                  positionIndex: position.positionIndex,
                  ranking: getRoleRanking(formationRole),
                  originalRole: englishRole
                });
              }
            }
          });

          if (!roleMatched) {
            unusedRoles.push(englishRole);
          }
        });
      } catch (error) {
        console.warn('Error parsing Ruolo Mantra for player:', playerDetail.Nome, error);
      }
    } else if (playerDetail.Ruolo) {
      const role = getPlayerRole(playerDetail);
      const italianRole = translateRoleToItalian(role);
      let roleMatched = false;

      formationPositions.forEach(position => {
        const roleMatch = position.roles.some(formationRole =>
          formationRole.toLowerCase() === italianRole.toLowerCase()
        );

        if (roleMatch) {
          roleMatched = true;
          possibleRoles.push({
            role: italianRole,
            positionIndex: position.positionIndex,
            ranking: getRoleRanking(italianRole),
            originalRole: role
          });
        }
      });

      if (!roleMatched) {
        unusedRoles.push(role);
      }
    }

    return {
      player: playerDetail,
      playerId: teamPlayer.id,
      possibleRoles,
      unusedRoles,
      fantamilioni: teamPlayer.price || 0,
      timestamp: teamPlayer.timestamp || Date.now()
    };
  }).filter(Boolean);
}

// Greedily fills the formation's 11 slots (most specialist slot first, best-fitting player per
// slot, FVM as tiebreak). Returns the set of assigned player IDs and how many slots got filled.
function assignStarters(teamPlayersWithRoles, formationPositions, getRoleRanking) {
  const positionAssignmentsList = formationPositions.map((position, positionIndex) => ({
    positionIndex,
    roles: position.roles,
    appetibilita: Math.max(...position.roles.map(role => getRoleRanking(role))),
    assigned: false
  }));

  positionAssignmentsList.sort((a, b) => {
    if (a.appetibilita !== b.appetibilita) {
      return b.appetibilita - a.appetibilita;
    }
    return a.positionIndex - b.positionIndex;
  });

  const assignedPlayerIds = new Set();
  let totalAssignedPlayers = 0;
  const maxPlayers = 11;

  positionAssignmentsList.forEach((positionAssignment) => {
    if (positionAssignment.assigned || totalAssignedPlayers >= maxPlayers) return;

    const availableForPosition = teamPlayersWithRoles.filter(playerData =>
      !assignedPlayerIds.has(playerData.playerId)
    );
    if (availableForPosition.length === 0) return;

    const playersWithBestRoles = availableForPosition.map(playerData => {
      const applicableRoles = playerData.possibleRoles.filter(roleOption =>
        roleOption.role && positionAssignment.roles.includes(roleOption.role)
      );
      if (applicableRoles.length === 0) return null;

      // Prefer the player's most generic eligible role for this slot (highest appetibilita),
      // keeping their rarer role open for a slot only that rarer role can fill.
      const bestRole = applicableRoles.sort((a, b) => b.ranking - a.ranking)[0];

      return {
        playerData,
        bestRole,
        appetibilita: bestRole.ranking,
        fpediaScore: parseFloat(playerData.player['FVM'] || 0)
      };
    }).filter(Boolean);

    if (playersWithBestRoles.length === 0) return;

    playersWithBestRoles.sort(compareCandidatesForSlot);

    const bestPlayer = playersWithBestRoles[0].playerData;
    assignedPlayerIds.add(bestPlayer.playerId);
    totalAssignedPlayers++;
    positionAssignment.assigned = true;
  });

  return { assignedPlayerIds, occupiedPositions: totalAssignedPlayers };
}

// Buckets leftover (non-starter) players into per-role reserve credit, capped at
// RESERVE_CAP_PER_ROLE per role, so stacking reserves in one role can't offset having none in
// another. Candidates are processed rarest-role-first (mirroring starter priority), and each is
// dropped into whichever of their eligible roles is currently least covered.
function computeReserveRoleCredits(teamPlayersWithRoles, assignedPlayerIds, formationRolesArray) {
  const reservePool = teamPlayersWithRoles.filter(playerData =>
    !assignedPlayerIds.has(playerData.playerId) && (playerData.possibleRoles || []).length > 0
  );

  const candidates = reservePool.map(playerData => {
    const rarest = playerData.possibleRoles.reduce((best, option) =>
      (!best || option.ranking < best.ranking) ? option : best, null);
    return {
      playerData,
      rarestRanking: rarest ? rarest.ranking : 999,
      fpediaScore: parseFloat(playerData.player['FVM'] || 0)
    };
  }).sort((a, b) => {
    if (a.rarestRanking !== b.rarestRanking) return a.rarestRanking - b.rarestRanking;
    return b.fpediaScore - a.fpediaScore;
  });

  const roleCounts = {};
  formationRolesArray.forEach(role => { roleCounts[role] = 0; });

  candidates.forEach(({ playerData }) => {
    const openRoles = playerData.possibleRoles
      .filter(option => (roleCounts[option.role] || 0) < RESERVE_CAP_PER_ROLE)
      .sort((a, b) => {
        const countDiff = (roleCounts[a.role] || 0) - (roleCounts[b.role] || 0);
        if (countDiff !== 0) return countDiff; // fill the least-covered role first
        return a.ranking - b.ranking; // then the rarer role
      });

    if (openRoles.length > 0) {
      const chosen = openRoles[0].role;
      roleCounts[chosen] = roleCounts[chosen] + 1;
    }
  });

  const cappedReserveCredits = Object.values(roleCounts).reduce((sum, n) => sum + n, 0);
  const maxReserveCredits = RESERVE_CAP_PER_ROLE * formationRolesArray.length;

  return { reserveCreditsByRole: roleCounts, cappedReserveCredits, maxReserveCredits };
}

// Computes formation-fit stats for one team/formation pair: how many starter slots are filled,
// how many players have no compatible role at all, and role-balanced reserve credit.
export function computeFormationStats(team, formationName, formations, players, appetibilitaData, getPlayerRole, translateRoleToItalian) {
  const formation = formations[formationName];
  if (!team || !team.players || !formation) {
    return {
      occupiedPositions: 0,
      unassignedPlayers: 0,
      totalTeamPlayers: team?.players?.length || 0,
      reserveCreditsByRole: {},
      cappedReserveCredits: 0,
      maxReserveCredits: 0
    };
  }

  const formationRolesArray = Array.from(new Set(formation.positions.flat()));
  const getRoleRanking = (role) => appetibilitaData[role] || 999;

  const formationPositions = formation.positions.map((positionGroup, index) => ({
    positionIndex: index,
    roles: positionGroup
  }));

  const teamPlayersWithRoles = buildTeamPlayersWithRoles(
    team, formationPositions, players, getRoleRanking, getPlayerRole, translateRoleToItalian
  );

  const { assignedPlayerIds, occupiedPositions } = assignStarters(
    teamPlayersWithRoles, formationPositions, getRoleRanking
  );

  const unassignedPlayers = teamPlayersWithRoles.filter(playerData =>
    !assignedPlayerIds.has(playerData.playerId) && (playerData.possibleRoles || []).length === 0
  ).length;

  const { reserveCreditsByRole, cappedReserveCredits, maxReserveCredits } = computeReserveRoleCredits(
    teamPlayersWithRoles, assignedPlayerIds, formationRolesArray
  );

  return {
    occupiedPositions,
    unassignedPlayers,
    totalTeamPlayers: team.players.length,
    reserveCreditsByRole,
    cappedReserveCredits,
    maxReserveCredits
  };
}

// Turns formation stats into a single 0-100 score:
// - up to 60 points for starter slots filled (60 * occupiedPositions/11)
// - up to 40 points for reserve depth (40 * cappedReserveCredits/maxReserveCredits, capped at
//   RESERVE_CAP_PER_ROLE reserves credited per role)
// - up to -30 points for players with no role compatible with this formation at all
export function computeFormationScore(stats) {
  const starterFraction = stats.occupiedPositions / 11;
  const backupFraction = stats.maxReserveCredits > 0
    ? stats.cappedReserveCredits / stats.maxReserveCredits
    : 0;

  const starterScore = WEIGHTS.starters * starterFraction;
  const backupScore = WEIGHTS.reserves * backupFraction;
  const unusablePenalty = Math.min(
    WEIGHTS.maxPenalty,
    WEIGHTS.maxPenalty * (stats.unassignedPlayers / Math.max(stats.totalTeamPlayers || 1, 1))
  );

  const score = Math.max(0, Math.min(100, starterScore + backupScore - unusablePenalty));

  return {
    score,
    breakdown: { starterFraction, backupFraction, starterScore, backupScore, unusablePenalty }
  };
}

export { RESERVE_CAP_PER_ROLE };
