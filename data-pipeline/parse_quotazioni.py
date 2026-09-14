"""
Parses fantacalcio.it's free "Quotazioni Fantacalcio" xlsx export (downloaded from
https://www.fantacalcio.it/quotazioni-fantacalcio) into base player records for mantravibe.
Replaces the old Lista-FantaAsta-Fantacalcio.csv export - same underlying player id space and
Mantra role vocabulary (RM column, ';'-separated for multi-role players, e.g. "E;W"), plus a
column the CSV didn't have: Diff./Diff.M, the week-over-week quotazione change, surfaced as
"Diff" (can be negative or zero - zero means unchanged, not missing, so it's read separately
from QtA/QtI/FVM's "prefer Mantra, fall back to classic" pattern below).

Two sheets are combined: "Tutti" (currently-rostered players) and "Ceduti" (players without a
club right now, e.g. between contracts) - together they match the old CSV's player coverage;
"Tutti" alone silently drops ~60 players the CSV used to include.

Row 1 of each sheet is a title, row 2 is the header:
    Id, R, RM, Nome, Squadra, Qt.A, Qt.I, Diff., Qt.A M, Qt.I M, Diff.M, FVM, FVM M
"""

import openpyxl

ROLE_MAP = {"P": "POR", "D": "DIF", "C": "CEN", "A": "ATT"}

# The RM (Mantra role) column spells goalkeeper as "Por"; every other place in this app
# (roles.csv, public/assets/appetibilita.json, public/assets/mantra_formations_positions.json)
# uses the single letter "P" instead. Normalize here so "Ruolo Mantra" matches everywhere.
MANTRA_ROLE_NORMALIZE = {"Por": "P"}


def _int(value, default=0):
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def _int_or_none(value):
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def _parse_sheet(sheet):
    rows = sheet.iter_rows(min_row=2, values_only=True)  # row 1 is a title
    header = next(rows)
    col = {name: i for i, name in enumerate(header)}

    players = []
    for row in rows:
        nome = str(row[col["Nome"]] or "").strip()
        if row[col["Id"]] is None or not nome:
            continue

        mantra_roles = [
            MANTRA_ROLE_NORMALIZE.get(r.strip(), r.strip())
            for r in str(row[col["RM"]] or "").split(";") if r.strip()
        ]
        r_code = str(row[col["R"]] or "").strip()

        qta = _int(row[col["Qt.A M"]]) or _int(row[col["Qt.A"]]) or 1
        qti = _int(row[col["Qt.I M"]]) or _int(row[col["Qt.I"]]) or 1
        fvm = _int(row[col["FVM M"]]) or _int(row[col["FVM"]]) or 0

        # Diff.M can legitimately be 0 (quotazione unchanged) - that's a real value, not a
        # "missing, fall back to classic" case, so this can't use the `or` pattern above.
        diff_m = _int_or_none(row[col["Diff.M"]])
        diff = diff_m if diff_m is not None else _int(row[col["Diff."]])

        players.append({
            "player_id": _int(row[col["Id"]]),
            "Nome": nome,
            "Squadra": str(row[col["Squadra"]] or "").strip(),
            "Ruolo": ROLE_MAP.get(r_code, r_code),
            "Ruolo Mantra": "[" + ", ".join(f"'{r}'" for r in mantra_roles) + "]",
            "QtA": qta,
            "QtI": qti,
            "FVM": fvm,
            "Quotazione": qta,
            "Diff": diff,
        })

    return players


def parse_quotazioni(path):
    """Returns base player records from the "Tutti" + "Ceduti" sheets of the Quotazioni
    Fantacalcio xlsx at `path`."""
    workbook = openpyxl.load_workbook(path, data_only=True)
    players = _parse_sheet(workbook["Tutti"])

    seen_ids = {p["player_id"] for p in players}
    for player in _parse_sheet(workbook["Ceduti"]):
        if player["player_id"] not in seen_ids:
            players.append(player)
            seen_ids.add(player["player_id"])

    return players
