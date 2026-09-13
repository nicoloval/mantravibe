"""
Parses a fantacalcio.it "Statistiche Fantacalcio" xlsx export (downloaded from
https://www.fantacalcio.it/statistiche-serie-a/) into {player_id: stats}.

The workbook has one sheet per role plus a "Tutti" sheet with every player and the same
columns - we only need "Tutti". Row 1 is a title, row 2 is the header:

    Id, R, Rm, Nome, Squadra, Pv, Mv, Fm, Gf, Gs, Rp, Rc, R+, R-, Ass, Amm, Esp, Au

"Id" is fantacalcio.it's own internal player id - the same one used in the FantaAsta CSV
(parse_csv.py), so matching against the base player list is an exact id lookup, not the fuzzy
name matching enrich.py needs for Understat.
"""

import openpyxl

from input_files import find_single_file

# xlsx column -> (final.json field label, cast). Only the columns this app actually surfaces -
# see input/README.md for why these are treated as the primary source for the overlapping
# fields (Understat fills the same fields in as a fallback when a player has no fantacalcio.it
# row at all, e.g. someone who just transferred in from another league).
COLUMN_MAP = {
    "Pv": ("Presenze", int),
    "Gf": ("Gol", int),
    "Ass": ("Assist", int),
    "Amm": ("Ammonizioni", int),
    "Esp": ("Espulsioni", int),
    "Mv": ("Media Voto", lambda v: round(float(v), 2)),
    "Fm": ("Fantamedia", lambda v: round(float(v), 2)),
    "Gs": ("Gol Subiti", int),
}


def load_stats_by_id(directory):
    """Returns {player_id: {field_label: value}} parsed from the "Tutti" sheet of the one
    .xlsx file in `directory`."""
    path = find_single_file(directory, ".xlsx")
    workbook = openpyxl.load_workbook(path, data_only=True)
    sheet = workbook["Tutti"]

    rows = sheet.iter_rows(min_row=2, values_only=True)  # row 1 is a title
    header = next(rows)
    col_index = {name: i for i, name in enumerate(header)}

    stats_by_id = {}
    for row in rows:
        raw_id = row[col_index["Id"]]
        if raw_id is None:
            continue
        player_id = int(raw_id)

        stats = {}
        for column, (label, cast) in COLUMN_MAP.items():
            raw_value = row[col_index[column]]
            if raw_value is None or raw_value == "":
                continue
            try:
                stats[label] = cast(raw_value)
            except (TypeError, ValueError):
                continue
        stats_by_id[player_id] = stats

    return stats_by_id


def apply_stats(players, stats_by_id, season_label):
    """Mutates `players` in place, setting "{field} {season_label}" for every player found in
    stats_by_id (matched by player_id). Returns the number of players matched."""
    matched = 0
    for player in players:
        stats = stats_by_id.get(player.get("player_id"))
        if stats is None:
            continue
        matched += 1
        for label, value in stats.items():
            player[f"{label} {season_label}"] = value
    return matched
