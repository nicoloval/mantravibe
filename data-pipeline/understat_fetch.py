"""
Understat data fetching.

Note: understat.com no longer embeds a `playersData = JSON.parse(...)` blob in the league
page's HTML (which is what the abandoned `understat` PyPI package scrapes) - the page is now
rendered client-side from a JSON endpoint. Found by inspecting the page's own network requests:

    GET https://understat.com/getLeagueData/<League Name>/<season>
    header: X-Requested-With: XMLHttpRequest

returning {"teams": ..., "players": [...], "dates": ...} - same player-record shape
(id, player_name, games, time, goals, xG, assists, xA, ..., team_title) the old scraper
produced, so the rest of the pipeline (enrich.py) is unaffected.
"""

import json
import os
import urllib.parse

import aiohttp

# Display name understat.com expects in the URL, per league.
LEAGUE_NAMES = {
    "epl": "EPL",
    "la_liga": "La liga",
    "bundesliga": "Bundesliga",
    "serie_a": "Serie A",
    "ligue_1": "Ligue 1",
    "rfpl": "RFPL",
}

BASE_URL = "https://understat.com/getLeagueData/{}/{}"


async def fetch_league_players(league, season, cache_dir, session):
    league_dir = os.path.join(cache_dir, league)
    os.makedirs(league_dir, exist_ok=True)

    output_file = os.path.join(league_dir, f"{league}_{season}.json")
    if os.path.exists(output_file):
        print(f"{league.upper()} {season} already cached, loading from file...")
        with open(output_file, "r", encoding="utf-8") as f:
            return json.load(f)

    league_name = LEAGUE_NAMES.get(league, league)
    url = BASE_URL.format(urllib.parse.quote(league_name), season)

    try:
        async with session.get(url, headers={"X-Requested-With": "XMLHttpRequest"}) as resp:
            if resp.status != 200:
                print(f"Warning: {league} {season} returned HTTP {resp.status}")
                return []
            data = await resp.json(content_type=None)
            players = data.get("players", [])

            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(players, f, indent=2, ensure_ascii=False)

            print(f"Fetched {len(players)} {league.upper()} players for {season}")
            return players
    except Exception as e:
        print(f"Warning: could not fetch {league} {season}: {e}")
        return []


async def fetch_all_leagues_data(seasons, cache_dir):
    """Returns {season: {league: [players]}}."""
    leagues = list(LEAGUE_NAMES.keys())
    all_data = {}
    async with aiohttp.ClientSession() as session:
        for season in seasons:
            print(f"\nFetching Understat data for season {season}...")
            season_data = {}
            for league in leagues:
                season_data[league] = await fetch_league_players(league, season, cache_dir, session)
            all_data[season] = season_data
    return all_data


def run_fetch_all_leagues_data(seasons, cache_dir):
    import asyncio
    return asyncio.run(fetch_all_leagues_data(seasons, cache_dir))
