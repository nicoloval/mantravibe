"""
Precomputes, once per data-pipeline build, which "fascia" (decile band) each eligible player
falls into for Fantamedia, split by Mantra role and by season - so the app's Percentili tab can
render this directly with no client-side computation.

Eligibility: a player must have played at least half of the matches played so far that season,
capped at 15. "Matches played so far" is derived per season as the max Presenze observed across
all players (not a hardcoded 38) - last season this equals the full season, but the current
season is usually still in progress (e.g. 4 rounds in right now), and that number only grows
over time. The cap keeps the bar at a reasonable minimum sample size once enough rounds have
been played, rather than climbing to 19 (half of a completed 38-round season).

Multi-role players (Ruolo Mantra e.g. ["Dc", "B"]) are counted under each of their roles
separately - not just a single "primary" one - per the app's own multi-role handling elsewhere.

Fascia 1 = the top 10% (highest Fantamedia) for that role/season, down to Fascia 10 = the
bottom 10% - the "fasce di merito" ranking convention fantacalcio players are used to, not a
plain ascending statistical percentile.

Dc (classic central defender) and B (Braccetto, a back-three's central defender) are tactically
the same job under two labels - B alone has too few eligible players per season (single digits)
for stable fasce, so ROLE_MERGE_GROUPS pools them together for ranking. Both "Dc" and "B" keys
are still written to the output with identical content, since every consumer (the Percentili
tab, a player's fascia badge) looks a role up by its own exact name.
"""

import ast

FASCE_COUNT = 10

ALL_MANTRA_ROLES = ["P", "Dc", "Ds", "Dd", "B", "E", "M", "C", "W", "T", "A", "Pc"]

ROLE_MERGE_GROUPS = {
    "Dc": ["Dc", "B"],
    "B": ["Dc", "B"],
}


def _roles_for_bucket(role):
    return ROLE_MERGE_GROUPS.get(role, [role])


def _parse_mantra_roles(player):
    raw = player.get("Ruolo Mantra")
    if not raw:
        return []
    try:
        return ast.literal_eval(raw)
    except (ValueError, SyntaxError):
        return []


def _max_presenze(players, season):
    key = f"Presenze {season}"
    values = [p.get(key) for p in players if isinstance(p.get(key), (int, float))]
    return max(values) if values else 0


def _split_into_fasce(sorted_players, count=FASCE_COUNT):
    """Splits a descending-sorted list into `count` nearly-equal contiguous groups - any
    remainder (the list doesn't divide evenly by `count`) is distributed to the first groups."""
    n = len(sorted_players)
    base, remainder = divmod(n, count)
    fasce = []
    start = 0
    for i in range(count):
        size = base + (1 if i < remainder else 0)
        fasce.append(sorted_players[start:start + size])
        start += size
    return fasce


def compute_fantamedia_percentiles(players, seasons):
    """
    players: the full enriched player list (the same list about to be written to final.json)
    seasons: season label strings to compute, e.g. ["2026-2027", "2025-2026"]

    Returns {season: {role: [[player, ...] x FASCE_COUNT fasce, best to worst]}}. Each player
    entry is a small dict (player_id/Nome/Squadra/Fantamedia) - enough for the tab to render
    without cross-referencing final.json, and players within a fascia are already sorted by
    Fantamedia (descending).
    """
    result = {}

    for season in seasons:
        presenze_key = f"Presenze {season}"
        fantamedia_key = f"Fantamedia {season}"
        # Capped at 15: half the season would otherwise keep climbing past a reasonable minimum
        # sample size once enough rounds have been played (half of a completed 38-round season
        # is 19) - 15 appearances is already a solid basis for a Fantamedia average.
        min_presenze = min(_max_presenze(players, season) / 2, 15)

        result[season] = {}

        for role in ALL_MANTRA_ROLES:
            bucket_roles = _roles_for_bucket(role)
            eligible = []
            for player in players:
                presenze = player.get(presenze_key)
                fantamedia = player.get(fantamedia_key)
                # A season's Fantamedia of exactly 0 means the player had no appearances that
                # season (final.json uses 0 as a placeholder, not a real average) - excluded
                # rather than piling meaningless zeros into the bottom fascia. In practice this
                # is implied by the presenze-eligibility check below too, but kept explicit.
                if not isinstance(presenze, (int, float)) or presenze < min_presenze:
                    continue
                if not isinstance(fantamedia, (int, float)) or fantamedia <= 0:
                    continue
                player_roles = _parse_mantra_roles(player)
                if not any(r in player_roles for r in bucket_roles):
                    continue
                eligible.append({
                    "player_id": player.get("player_id"),
                    "Nome": player.get("Nome"),
                    "Squadra": player.get("Squadra"),
                    "Fantamedia": fantamedia
                })

            eligible.sort(key=lambda p: p["Fantamedia"], reverse=True)
            result[season][role] = _split_into_fasce(eligible)

    return result
