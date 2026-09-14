# Formation assignment algorithm (La Mia Rosa)

How mantravibe automatically decides who's a **titolare** (starting XI) vs a **riserva**
(reserve) once you've bought your squad, and which formation slot each player fills.

## Where it lives

- `src/components/RosaAcquistata.js`
  - `getPlayersByFormationRoles` — assigns the starting XI (drives the actual titolari/riserve
    display on screen)
  - `getReservePlayers` — assigns the on-screen reserves, reusing the exact same algorithm on
    the leftovers (see step 5 below)
- `src/utils/formationScoring.js` — the 0-100 formation-fit **score** (see below). Shared by
  `RosaAcquistata.js` (formation buttons, depth chart header) and `FantamilioniBar.js` (the
  purchase screen's "prima → dopo" comparison), so there's exactly one implementation of the
  scoring formula.
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
3. Rank the candidates (`compareCandidatesForSlot` in `formationScoring.js`):
   - **highest Fantamedia first** — see below for how a player's Fantamedia is computed — but
     only if the gap between two candidates is at least `FANTAMEDIA_TIE_THRESHOLD` (0.1 points).
     A gap smaller than that is treated as a tie and falls through to the next criterion, so a
     6.61 vs 6.58 doesn't override role scarcity the way a real gap (7.8 vs 6.0) should.
   - **tie-break 1: lowest role appetibilita first** (of each candidate's own best-fit role from
     step 2) — this is what used to be the primary criterion; it still decides whenever
     Fantamedia is a near-tie.
   - **tie-break 2: highest `FVM` first** (fantacalcio valuation - the player's
     quotazione-derived value from the CSV)
4. The top-ranked candidate is assigned to the slot, in that best-fit role, and removed from
   the pool. Move to the next slot.

Fantamedia here is not the raw stat: it's the average of the player's `Fantamedia 2025-2026` and
`Fantamedia 2026-2027` values (only counting a season that actually has data - a season with 0
appearances stores `0` as a placeholder, not a real average, so it's excluded rather than
dragging the average down), falling back to a role-based default (5 for a goalkeeper, 6
otherwise) if neither season has data. Same function (`getPlayerFantamedia`) that computes the
"Fantamedia titolari"/box display values described further down.

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
| 1st | Fantamedia (higher = wins) - only decisive if the gap is >= `FANTAMEDIA_TIE_THRESHOLD` (0.1) |
| 2nd | Role appetibilita of the player's best-fit role for that slot (lower = wins) |
| 3rd | `FVM` (higher = wins) |

Note this is a *slot processing order* vs. *candidate ranking* distinction: appetibilita still
decides which of the 11 slots gets filled first (step 2, unchanged - that's about maximizing how
many slots get filled at all, not player quality). It only moved to 2nd place in the ranking of
*who wins* an already-selected slot.

## The formation score (0-100)

`computeFormationStats` (in `formationScoring.js`) reruns the starter-assignment algorithm above
for a given team/formation, then separately buckets the **leftover** players into per-role
reserve credit, capped at **2 per role** (a role code, e.g. `Dc` or `M` - not per slot; a
formation with two `M` slots still only credits up to 2 `M` reserves). This is deliberately
different from `getReservePlayers`' "one best sostituto per slot" display list: the score cares
about *balanced depth per role*, not about naming a single next-man-up.

Candidates are processed rarest-eligible-role-first (mirroring the starter pass' priority), and
each is dropped into whichever of their eligible roles is currently least-covered, so a
versatile player plugs the biggest gap rather than piling into an already-full role.

`computeFormationScore` then combines:

- **Titolari - up to 60 points.** `60 × (titolari coperti / 11)`.
- **Riserve - up to 40 points.** `40 × (crediti riserva / (2 × ruoli distinti nel modulo))`,
  where `crediti riserva` is the capped, role-bucketed count above.
- **Penalità giocatori inutilizzabili - fino a -30 punti.**
  `min(30, 30 × (giocatori inutilizzabili / rosa totale))` — unchanged from before.

Final score = `max(0, min(100, titolari + riserve - penalità))`. A fully-covered roster (11/11
titolari, >= 2 usable reserves in every role the formation needs, no unusable players) scores
exactly 100 - unlike the old formula, whose 50+30 point budget topped out at 80 regardless of
roster quality.

UI color bands (`SCORE_THRESHOLDS` in `formationScoring.js`): green >= 75, amber >= 50, red below
that.

## Known characteristics

- **Greedy, not globally optimal.** Because slots are filled one at a time in a fixed priority
  order, it's possible (if rare) that a different overall assignment could field more players
  or a "better" combination. The dead `formationRanking.js` bipartite-matching code would have
  solved this optimally, but it's never actually invoked.
- **Multi-role players are used flexibly.** A player eligible for both `Dc` and `B` will be
  slotted wherever the greedy pass currently needs them most, based on the ordering in step 2.
- **Only one reserve layer.** The reserve pass produces at most 11 more players (one per slot);
  a squad's 3rd/4th choice for a given position isn't separately categorized.
- **Fantamedia-first ranking can occasionally lower slot coverage.** Since Fantamedia now outranks
  appetibilita for *who wins* a slot, a strong flexible player can win a slot away from a weaker
  specialist who had no other slot to go to, leaving that specialist unassigned. This trades a
  small amount of raw coverage (and thus of the score's starter component) for fielding
  better-performing players.
