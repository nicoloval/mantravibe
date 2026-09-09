"""
Parses fantacalcio.it's free "Lista-FantaAsta-Fantacalcio.csv" export into base player
records for mantravibe. Column layout (no header) documented and used by
tool-asta-fantacalcio-mantra-main/js/data.js:fromLista():

0 Id · 1 Nome · 2 NomeCompleto · 3 R · 4 RM (';'-separated Mantra roles) · 5 QtI · 6 QtA ·
7 QtI_M · 8 QtA_M · 9 Squadra · 10 FVM · 11 FVM_M · 12 piede · 13 nazione · 14 nascita · 15 img
"""

import csv

ROLE_MAP = {"P": "POR", "D": "DIF", "C": "CEN", "A": "ATT"}

# The CSV's RM (Mantra role) column spells goalkeeper as "Por"; every other place in this app
# (roles.csv, public/assets/appetibilita.json, public/assets/mantra_formations_positions.json)
# uses the single letter "P" instead. Normalize here so "Ruolo Mantra" matches everywhere.
MANTRA_ROLE_NORMALIZE = {"Por": "P"}


def _int(value, default=0):
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def parse_lista_csv(path):
    players = []
    with open(path, encoding="utf-8-sig", newline="") as f:
        for row in csv.reader(f):
            if len(row) < 10 or not row[1].strip() or not row[4].strip():
                continue

            mantra_roles = [
                MANTRA_ROLE_NORMALIZE.get(r.strip(), r.strip())
                for r in row[4].split(";") if r.strip()
            ]
            r_code = row[3].strip()

            qta = _int(row[8]) or _int(row[6]) or 1
            qti = _int(row[7]) or _int(row[5]) or 1
            fvm = _int(row[11]) or _int(row[10]) or 0

            players.append({
                "player_id": _int(row[0]),
                "Nome": row[1].strip(),
                "NomeCompleto": row[2].strip(),
                "Squadra": row[9].strip(),
                "Ruolo": ROLE_MAP.get(r_code, r_code),
                "Ruolo Mantra": "[" + ", ".join(f"'{r}'" for r in mantra_roles) + "]",
                "QtA": qta,
                "QtI": qti,
                "FVM": fvm,
                "Quotazione": qta,
            })

    return players
