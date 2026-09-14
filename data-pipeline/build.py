#!/usr/bin/env python3
"""
Builds mantravibe/public/data/final.json:
  1. parse the fantacalcio.it Quotazioni export in input/quotazioni/ (players, Mantra roles,
     quotazioni)
  2. apply fantacalcio.it's own current/previous season stats exports (Media Voto, Fantamedia,
     Gol Subiti, Presenze, Gol, Assist, Ammonizioni, Espulsioni) - the primary source for
     these, matched by fantacalcio.it's own player id (see input/README.md)
  3. fetch/load cached Understat data and match players against it by name - fills in Minuti
     Giocati/xG/xA (which fantacalcio.it doesn't track at all) and fills gaps in step 2's
     fields for anyone missing from the Serie A-only fantacalcio.it exports
  4. write the result to ../public/data/final.json

Season is configured in config.py (CURRENT_SEASON / PREVIOUS_SEASONS) - update it there
when a new Serie A season starts.

Usage: uv run python build.py
"""

import json
import os

from parse_quotazioni import parse_quotazioni
from fantacalcio_stats import load_stats_by_id, apply_stats
from understat_fetch import run_fetch_all_leagues_data
from enrich import match_with_understat, season_label
from input_files import find_single_file
from config import CURRENT_SEASON, PREVIOUS_SEASONS

HERE = os.path.dirname(os.path.abspath(__file__))
INPUT_DIR = os.path.join(HERE, "input")
QUOTAZIONI_DIR = os.path.join(INPUT_DIR, "quotazioni")
STATS_CURRENT_DIR = os.path.join(INPUT_DIR, "statistiche_corrente")
STATS_PREVIOUS_DIR = os.path.join(INPUT_DIR, "statistiche_precedente")
CACHE_DIR = os.path.join(HERE, "cache", "understats")
OUTPUT_FILE = os.path.join(HERE, "..", "public", "data", "final.json")


def main():
    quotazioni_path = find_single_file(QUOTAZIONI_DIR, ".xlsx")
    print("Parsing Quotazioni Fantacalcio...")
    players = parse_quotazioni(quotazioni_path)
    print(f"Parsed {len(players)} players")

    print("\nApplying fantacalcio.it stats (current season)...")
    current_stats = load_stats_by_id(STATS_CURRENT_DIR)
    matched = apply_stats(players, current_stats, season_label(CURRENT_SEASON))
    print(f"Matched {matched}/{len(players)} players")

    if PREVIOUS_SEASONS:
        print("\nApplying fantacalcio.it stats (previous season)...")
        previous_stats = load_stats_by_id(STATS_PREVIOUS_DIR)
        matched = apply_stats(players, previous_stats, season_label(PREVIOUS_SEASONS[0]))
        print(f"Matched {matched}/{len(players)} players")

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
