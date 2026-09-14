"""
Data pipeline configuration.

Edit this file when a new Serie A season starts (usually late August/September) and you have
fresh downloads in input/ for it - see input/README.md.
"""

# The season input/quotazioni/ and input/statistiche_corrente/ represent, as the year it
# starts. e.g. 2026 -> Serie A 2026/2027 (the season currently pre-set here).
CURRENT_SEASON = 2026

# Earlier seasons to also fetch from Understat, for the historical stats columns in final.json
# (e.g. [2025] -> also fetch/include the completed 2025/2026 season). The first entry should
# match input/statistiche_precedente/ - see build.py.
PREVIOUS_SEASONS = [2025]
