# Formation assignment algorithm (La Mia Rosa)

How mantravibe automatically decides who's a **titolare** (starting XI) vs a **riserva**
(reserve) once you've bought your squad, and which formation slot each player fills.

## Where it lives

- `src/components/RosaAcquistata.js`
  - `getPlayersByFormationRoles` — assigns the starting XI
  - `getReservePlayers` — assigns reserves, reusing the exact same algorithm on the leftovers
- Static data it depends on:
  - `public/assets/mantra_formations_positions.json` — for each formation (e.g. `4-3-3`), the
    11 slots in a fixed order, each slot listing the Mantra role codes that can fill it (a slot
    can accept more than one role, e.g. `["Dc", "B"]`)
  - `public/assets/appetibilita.json` — a "how specialized is this role" ranking per Mantra
    role code (see table below)
- Player eligibility comes from each player's `Ruolo Mantra` field in `public/data/final.json`
  (their list of Mantra roles, e.g. `["Dc", "B"]` — see the data pipeline docs for where that
  comes from)

There is also a `formationRanking.js` with a Hopcroft-Karp bipartite-matching implementation
(`rankFormations`, `processPlayersForRanking`) — it is **not used**; it's imported in
`RosaAcquistata.js` but never called. The live algorithm is the greedy one described below.

## Appetibilita ranking

Lower number = more specialized/restrictive role (fewer players can realistically play there
in Mantra terms); higher number = more generic/flexible.

| Role | Meaning | Appetibilita |
|------|---------|:---:|
| Pc | Punta centrale | 1 |
| A | Attaccante | 2 |
| W | Ala | 3 |
| T | Trequartista | 3 |
| C | Centrocampista | 4 |
| E | Esterno | 5 |
| M | Mediano | 5 |
| Ds | Difensore sinistro | 6 |
| Dd | Difensore destro | 6 |
| B | Braccetto | 7 |
| Dc | Difensore centrale | 8 |
| P | Portiere | 9 |

A slot's own appetibilita is the **highest** value among the roles it accepts (its most
restrictive/rare accepted role) — a `["Dc"]`-only slot ranks as 8, while a flexible
`["W", "A"]` slot ranks as only 3.

## The algorithm

### 1. Work out each player's eligible slots

For every player in the squad, parse `Ruolo Mantra` and, for each of their roles, check it
against every slot of the currently-selected formation (case-insensitive match). Every match
is recorded as `{ role, positionIndex, ranking }`, where `ranking` is that role's appetibilita.

A player whose roles match no slot in the formation at all is set aside (see step 4).

### 2. Order the 11 slots by how restrictive they are

Sort the formation's slots by their appetibilita (as defined above), **descending** — so the
most restrictive slots (goalkeeper, center-backs) are resolved first, and the most flexible
ones (forwards, trequartisti) are resolved last. Ties keep the formation's original slot order.

This ordering matters: it means the players with the fewest options get first pick, before
generically-eligible attacking slots start competing over the remaining pool.

### 3. Fill slots greedily, one at a time, in that order

For each slot, in priority order:

1. Collect every **still-unassigned** player who has at least one role eligible for this slot.
2. For each such player, pick their *best-fit* role for this specific slot — i.e. whichever of
   their matching roles has the **highest** appetibilita (their most defensive eligible role).
   E.g. a player eligible for both `A` (2) and `Pc` (1) defaults to `A`, keeping `Pc` open for
   a player who can *only* play `Pc`. This mirrors the standard Mantra convention of playing a
   flexible player in their most defensive usable role by default.
3. Rank the candidates:
   - **lowest role appetibilita first** (of each candidate's own best-fit role from step 2)
   - **tie-break: highest `FVM` first** (fantacalcio valuation - the player's quotazione-derived
     value from the CSV)
4. The top-ranked candidate is assigned to the slot, in that best-fit role, and removed from
   the pool. Move to the next slot.

This continues until either all 11 slots are filled or there are no more eligible candidates
left (capped at 11 assigned players).

### 4. Leftovers

- Players who had at least one matching role but lost out to a teammate simply remain in the
  pool - they aren't shown as "unused"; they become raw material for the reserve pass (step 5).
- Players whose roles matched **no slot at all** in the formation are placed in the
  "Giocatori con ruoli non utilizzati" (unused) list.

### 5. Reserves: the same algorithm, run again on the leftovers

`getReservePlayers` takes only the players who were **not** assigned a starting slot, and
re-runs steps 1-3 from scratch on that smaller pool, against the same 11-slot formation shape.

The result is your best available replacement for each position - a single "next man up" per
slot, not a fully ranked bench. Squad members who don't make either the starting XI or this
first reserve pass aren't further ranked by role; they just remain in the full squad list.

## Tie-breaking, summarized

| Priority | Criterion |
|---|---|
| 1st | Role appetibilita of the player's best-fit role for that slot (lower = wins) |
| 2nd | `FVM` (higher = wins) |

## Known characteristics

- **Greedy, not globally optimal.** Because slots are filled one at a time in a fixed priority
  order, it's possible (if rare) that a different overall assignment could field more players
  or a "better" combination. The dead `formationRanking.js` bipartite-matching code would have
  solved this optimally, but it's never actually invoked.
- **Multi-role players are used flexibly.** A player eligible for both `Dc` and `B` will be
  slotted wherever the greedy pass currently needs them most, based on the ordering in step 2.
- **Only one reserve layer.** The reserve pass produces at most 11 more players (one per slot);
  a squad's 3rd/4th choice for a given position isn't separately categorized.
