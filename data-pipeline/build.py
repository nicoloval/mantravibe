#!/usr/bin/env python3
"""
Builds mantravibe/public/data/final.json:
  1. parse the fantacalcio.it CSV in input/ (players, Mantra roles, quotazioni)
  2. fetch/load cached Understat data and match players against it
  3. write the result to ../public/data/final.json

Season is configured in config.py (CURRENT_SEASON / PREVIOUS_SEASONS) - update it there
when a new Serie A season starts.

Usage: uv run python build.py
"""

import json
import os

from parse_csv import parse_lista_csv
from understat_fetch import run_fetch_all_leagues_data
from enrich import match_with_understat
from config import CURRENT_SEASON, PREVIOUS_SEASONS

HERE = os.path.dirname(os.path.abspath(__file__))
INPUT_CSV = os.path.join(HERE, "input", "Lista-FantaAsta-Fantacalcio.csv")
CACHE_DIR = os.path.join(HERE, "cache", "understats")
OUTPUT_FILE = os.path.join(HERE, "..", "public", "data", "final.json")


def main():
    if not os.path.exists(INPUT_CSV):
        raise SystemExit(
            f"Missing {INPUT_CSV}\n"
            f"Download Lista-FantaAsta-Fantacalcio.csv from fantacalcio.it and place it at "
            f"data-pipeline/input/Lista-FantaAsta-Fantacalcio.csv, then re-run this script."
        )

    print("Parsing Lista-FantaAsta CSV...")
    players = parse_lista_csv(INPUT_CSV)
    print(f"Parsed {len(players)} players")

    seasons = [CURRENT_SEASON] + PREVIOUS_SEASONS
    understat_data = run_fetch_all_leagues_data(seasons, CACHE_DIR)

    print("\nMatching players against Understat...")
    enriched = match_with_understat(players, understat_data)

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(enriched, f, indent=2, ensure_ascii=False)

    print(f"\nWrote {len(enriched)} players to {os.path.relpath(OUTPUT_FILE, HERE)}")


if __name__ == "__main__":
    main()
