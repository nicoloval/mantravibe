"""
Matches base player records (from parse_csv.py) against Understat data and flattens the
matched seasons into flat, UI-friendly fields. Matching logic ported from
mantradata/data_retriever.py:match_fantacalcio_with_understat (surname/full-name + team
disambiguation, then Understat id used to pull the same player's other seasons).
"""

from match_utils import calculate_name_similarity, calculate_team_similarity

# Understat season -> flat field label, e.g. 2026 -> "2026-2027"
def season_label(season):
    return f"{season}-{season + 1}"


# This tool is specifically for Serie A fantasy football, so when a player has more than one
# entry for the same understat id within one season (they transferred leagues mid-season, e.g.
# Aston Villa -> Roma), prefer their Serie A stint over any other league's.
PREFERRED_LEAGUE = "serie_a"


def _pick_best_id_match(candidates, fc_squadra):
    """candidates: list of (league, player) sharing one understat id within a single season
    (i.e. the player switched leagues mid-season). Picks the Serie A entry if there is one,
    otherwise the entry whose team best matches the player's current (fantacalcio) team."""
    if len(candidates) == 1:
        return candidates[0][1]

    serie_a_entries = [player for league, player in candidates if league == PREFERRED_LEAGUE]
    if serie_a_entries:
        return serie_a_entries[0]

    best_league, best_player = max(
        candidates,
        key=lambda lp: calculate_team_similarity(fc_squadra, lp[1].get("team_title", ""))[0]
    )
    return best_player


UNDERSTAT_FIELD_MAP = {
    "games": ("Presenze", int),
    "time": ("Minuti Giocati", int),
    "goals": ("Gol", int),
    "assists": ("Assist", int),
    "xG": ("xG", lambda v: round(float(v), 2)),
    "xA": ("xA", lambda v: round(float(v), 2)),
    "yellow_cards": ("Ammonizioni", int),
    "red_cards": ("Espulsioni", int),
}

# fantacalcio_stats.py (id-matched, run before this) is the primary source for these - Understat
# (fuzzy name-matched) only fills them in when a player has no fantacalcio.it row at all, e.g.
# someone who just transferred in from another league. Minuti Giocati/xG/xA aren't in that set
# because fantacalcio.it doesn't track them at all - Understat is their only source, always.
FANTACALCIO_PRIMARY_FIELDS = {"Presenze", "Gol", "Assist", "Ammonizioni", "Espulsioni"}


def _find_understat_match(fc_full_name, fc_squadra, understat_data):
    """Surname/full-name + team disambiguation. Returns (player_dict, season, league) or None."""
    match, match_season, match_league = None, None, None

    for season, season_data in understat_data.items():
        for league, players in season_data.items():
            for player in players:
                name_sim, name_match = calculate_name_similarity(
                    fc_full_name, player.get("player_name", "")
                )
                team_sim, team_match = calculate_team_similarity(
                    fc_squadra, player.get("team_title", "")
                )
                if name_match and team_match:
                    if match is None:
                        match, match_season, match_league = player, season, league
                    else:
                        # Ambiguous (same surname/team matched twice) - bail out for this player
                        return None, None, None
        if match is not None:
            break

    return match, match_season, match_league


def match_with_understat(players, understat_data):
    """Mutates nothing; returns a new list of player dicts with Understat fields flattened in."""
    enriched = []
    matched_count = 0

    for player in players:
        record = dict(player)
        fc_full_name = record.get("NomeCompleto") or record.get("Nome", "")
        fc_squadra = record.get("Squadra", "")

        match, match_season, _ = _find_understat_match(fc_full_name, fc_squadra, understat_data)

        seasons_found = {}
        if match is not None:
            understat_id = match.get("id")
            seasons_found[match_season] = match

            for season, season_data in understat_data.items():
                if season == match_season:
                    continue
                candidates = [
                    (league, p)
                    for league, players_in_league in season_data.items()
                    for p in players_in_league
                    if p.get("id") == understat_id
                ]
                if candidates:
                    seasons_found[season] = _pick_best_id_match(candidates, fc_squadra)

        if seasons_found:
            matched_count += 1

        for season, season_player in seasons_found.items():
            label = season_label(season)
            for raw_key, (out_label, cast) in UNDERSTAT_FIELD_MAP.items():
                field_name = f"{out_label} {label}"
                if out_label in FANTACALCIO_PRIMARY_FIELDS and field_name in record:
                    continue  # fantacalcio.it already provided this - Understat only fills gaps
                raw_value = season_player.get(raw_key)
                if raw_value is None or raw_value == "":
                    continue
                try:
                    record[field_name] = cast(raw_value)
                except (TypeError, ValueError):
                    continue

        enriched.append(record)

    print(f"Understat match: {matched_count}/{len(players)} players matched "
          f"({matched_count / len(players) * 100:.1f}%)")
    return enriched
