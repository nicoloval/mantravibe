"""
Name/team fuzzy-matching helpers, ported from mantradata/data_process.py
(stripped of the pandas dependency — our records are always plain strings/None).
"""

import re
import unicodedata
from difflib import SequenceMatcher
from typing import Tuple

TEAM_VARIATIONS = {
    'AC MILAN': 'MILAN',
    'INTER': 'INTER MILAN',
    'JUVENTUS': 'JUVENTUS',
    'AS ROMA': 'ROMA',
    'SS LAZIO': 'LAZIO',
    'NAPOLI': 'NAPOLI',
    'ATALANTA': 'ATALANTA',
    'FIORENTINA': 'FIORENTINA',
    'BOLOGNA': 'BOLOGNA',
    'TORINO': 'TORINO',
    'GENOA': 'GENOA',
    'SASSUOLO': 'SASSUOLO',
    'UDINESE': 'UDINESE',
    'VERONA': 'VERONA',
    'LECCE': 'LECCE',
    'MONZA': 'MONZA',
    'SALERNITANA': 'SALERNITANA',
    'CAGLIARI': 'CAGLIARI',
    'EMPOLI': 'EMPOLI',
    'FROSINONE': 'FROSINONE',
    'COMO': 'COMO',
    'PARMA': 'PARMA',
    'PISA': 'PISA',
    'CREMONESE': 'CREMONESE',
}


def normalize_name(name: str) -> str:
    if not name:
        return ""
    name = str(name).upper().strip()
    name = unicodedata.normalize('NFD', name)
    name = ''.join(c for c in name if unicodedata.category(c) != 'Mn')
    name = name.replace("'", " ").replace("-", " ")
    return re.sub(r'\s+', ' ', name).strip()


def normalize_team_name(team: str) -> str:
    if not team:
        return ""
    team = str(team).upper().strip()
    team = unicodedata.normalize('NFD', team)
    team = ''.join(c for c in team if unicodedata.category(c) != 'Mn')
    for full_name, short_name in TEAM_VARIATIONS.items():
        if short_name in team:
            team = team.replace(short_name, full_name)
    return team


def extract_last_name(full_name: str) -> str:
    if not full_name:
        return ""
    parts = full_name.strip().split()
    return parts[-1] if parts else full_name


def calculate_name_similarity(name1: str, name2: str, threshold: float = 0.8) -> Tuple[float, bool]:
    """name1 may be a surname only; name2 is expected to be a full name."""
    if not name1 or not name2:
        return 0.0, False

    norm1 = normalize_name(name1)
    norm2 = normalize_name(name2)
    last_name2 = extract_last_name(norm2)

    if norm1 == last_name2:
        return 1.0, True

    similarity = SequenceMatcher(None, norm1, last_name2).ratio()
    if similarity >= threshold:
        return similarity, True

    similarity = SequenceMatcher(None, norm1, norm2).ratio()
    if similarity >= threshold:
        return similarity, True

    return similarity, False


def calculate_team_similarity(team1: str, team2: str, threshold: float = 0.8) -> Tuple[float, bool]:
    if not team1 or not team2:
        return 0.0, False

    norm1 = normalize_team_name(team1)
    norm2 = normalize_team_name(team2)

    if norm1 == norm2:
        return 1.0, True

    similarity = SequenceMatcher(None, norm1, norm2).ratio()
    return similarity, similarity >= threshold
