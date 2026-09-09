# 🚀 Mantravibe - Fantacalcio Assistant

## 📋 Purpose

Mantravibe is a comprehensive web application designed to assist fantasy football (fantacalcio) managers in building and managing their teams. The application provides advanced player analysis, team management tools, and budget tracking specifically tailored for the Italian fantasy football league.

## 🎯 Key Features

### 🏆 **Advanced Player Management**
- **Comprehensive player database** with detailed statistics and analysis
- **Smart search and filtering** by role, skills, and performance metrics
- **Player acquisition system** with budget validation and team management
- **Formation optimization** with automatic player assignment based on roles and appetibilita

### 💰 **Budget & Team Management**
- **Real-time budget tracking** across multiple teams
- **Team comparison tools** with visual indicators for budget status
- **Player acquisition workflow** with price validation and team selection
- **Formation statistics** showing occupied positions and available players

### 📊 **Analytics & Insights**
- **Player performance analysis** with multiple statistical categories
- **Team composition analysis** with role distribution and budget allocation
- **Formation optimization** with automatic player assignment algorithms
- **Export/import functionality** for data backup and sharing

### 🎨 **Modern User Interface**
- **Responsive design** optimized for desktop and mobile
- **Intuitive tab-based navigation** with persistent user preferences
- **Color-coded team status** (green for optimal, red for issues)
- **Real-time visual feedback** for all user actions

## 🔗 Related Projects

The current data pipeline (see "Data Pipeline" below) builds on ideas and code from a few other projects:

### [tool-asta-fantacalcio-mantra](https://github.com/bcirillo99/tool-asta-fantacalcio-mantra)
A standalone, no-build auction-tracking tool. Its `js/data.js` documents the column layout of fantacalcio.it's free `Lista-FantaAsta-Fantacalcio.csv` export and the Mantra role-code scheme (`Por, Dc, B, Dd, Ds, E, M, C, W, T, A, Pc`). `data-pipeline/parse_csv.py` follows that same convention to read the CSV.

### mantradata (local, sibling project)
A private Python tool (`../mantradata`) that fetches Understat data and fuzzy-matches it against a player list by name/team. `data-pipeline/match_utils.py` and `data-pipeline/enrich.py` are a trimmed-down port of its matching logic, adapted to fetch from Understat's current JSON endpoint (see the Data Pipeline section for why).

### [fantacalcio-py](https://github.com/piopy/fantacalcio-py)
The **previous** data source for this application (no longer used by default). This Python tool scrapes FPEDIA/FSTATS and computes convenience indices, exported as Excel. Mantravibe's UI still degrades gracefully if you feed it FPEDIA/FSTATS-shaped data, but the current pipeline (below) does not produce those fields — see the note in Data Pipeline.

### [fantavibe (original)](https://github.com/informagico/fantavibe)
This repository was born as a fork of the original fantavibe project, specifically adapted for the **Mantra** fantasy football format. The original project provided the initial React-based architecture and user interface concepts that were extended and specialized for Mantra's specific requirements.

## 🛠️ Technology Stack

```text
Frontend Framework: React 19.1.1
Styling: CSS-in-JS with inline styles
Data Processing: JSON parsing and manipulation
Storage: LocalStorage for client-side persistence
State Management: React Hooks (useState, useEffect, useMemo, useCallback)
Search: Optimized search algorithms with indexing
Build Tool: Create React App
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** (version 14 or higher)
- **npm** or **yarn** package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/nicoloval/mantravibe.git
cd mantravibe

# Install dependencies
npm install

# Start the development server
npm start
```

The application will be available at `http://localhost:3000`

### Building for Production

```bash
# Create production build
npm run build

# The build folder will contain the optimized production files
```

## 📊 Data Pipeline

Mantravibe reads its player data from `public/data/final.json` and `public/data/roles.csv` (already
committed and reusable as-is). To regenerate `final.json` for a new season, everything — CSV
ingestion, cleaning, and Understat enrichment — lives in `data-pipeline/`, inside this repo.

### Prerequisites (one-time)

- **Python 3.12+**
- **[uv](https://docs.astral.sh/uv/)** package manager
- Set up the pipeline's virtual environment:
  ```bash
  cd data-pipeline
  uv sync
  cd ..
  ```

### 1. Download the CSV

Get the free player list from fantacalcio.it: on the site, **App → FantaAsta Live → Calciatori
Serie A**, download `Lista-FantaAsta-Fantacalcio.csv`, and place it directly in
`data-pipeline/input/` (see `data-pipeline/input/README.md`), so the file ends up at:

```
data-pipeline/input/Lista-FantaAsta-Fantacalcio.csv
```

This is the only manual step — everything else is a command.

### 2. Build

From the `mantravibe/` root:

```bash
npm run data:build   # parses the CSV, fetches/matches Understat stats, writes public/data/final.json
```

This fetches Understat data for the current season and the previous one (see **Season
configuration** below) across 6 European leagues, so it can also pick up players who transferred
into Serie A. Understat responses are cached under `data-pipeline/cache/`, so re-running
`data:build` after tweaking the CSV is fast — delete `data-pipeline/cache/` if you want a fully
fresh fetch.

### 3. Run the app

```bash
npm start
```

as described above. Re-run steps 1–2 whenever you have a new CSV (e.g. after transfer-window
roster changes); step 3 is unaffected.

### Season configuration

The season is **not** read from the CSV — it's set explicitly in `data-pipeline/config.py`:

```python
CURRENT_SEASON = 2026   # Serie A 2026/2027 (pre-set to the current season)
PREVIOUS_SEASONS = [2025]   # completed 2025/2026 season, for historical stats
```

`CURRENT_SEASON` is the year the season *starts* (Understat's convention: `2026` means
"2026/2027"). Update this file once a year, when a new season starts and you have a fresh CSV for
it — `final.json` will then have `"... 2026-2027"` fields for the current season and
`"... 2025-2026"` for the previous one, matching whatever `CURRENT_SEASON`/`PREVIOUS_SEASONS` say.

**This is the only place season needs tuning.** The React UI (column picker, sort options, card
and player-detail views) never hardcodes a season string — it reads the two most recent
season-labeled fields straight out of `final.json` (`getSeasonLabels` in
`src/utils/dataUtils.js`) and labels itself accordingly. So bumping `CURRENT_SEASON` and
re-running `data:build` is enough; nothing in `src/` needs editing.

You can add more than one entry to `PREVIOUS_SEASONS` (e.g. `[2025, 2024]`) to pull in more
historical seasons of Understat data into `final.json` for your own reference, but the UI only
ever surfaces the **two most recent** seasons present (current + previous) as columns/sort
options — older seasons are still in the JSON, just not exposed in the UI.

### Notes on the data

- **Base fields** (from the CSV): `Nome`, `Squadra`, `Ruolo Mantra`, `QtA`/`QtI`/`FVM`.
- **Enriched fields** (from Understat, when a player is matched — usually 70%+): `Presenze`,
  `Minuti Giocati`, `Gol`, `Assist`, `xG`, `xA`, `Ammonizioni`, `Espulsioni`, per season.
- This is a different, leaner schema than the old fantacalcio-py-based pipeline (no FPEDIA/FSTATS
  convenience scores, Skills, Trend, or injury predictions) — the UI has been adapted accordingly
  (column picker, default sort, player detail page all use the fields above instead).

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── FantamilioniModal.js    # Player acquisition modal
│   ├── MantraGiocatoriTab.js   # Player search and filtering
│   ├── RosaAcquistata.js       # Team management and formations
│   ├── SquadreTab.js           # Multi-team management
│   └── Settings.js             # Application settings
├── utils/               # Utility functions
│   ├── dataUtils.js     # Data processing and search utilities
│   └── storage.js       # LocalStorage management
└── App.js              # Main application component

public/
├── data/               # Data files
│   ├── final.json      # Player database
│   └── roles.csv       # Role definitions
└── assets/             # Static assets
    └── appetibilita.json  # Formation preferences

data-pipeline/           # Data ingestion & enrichment (see Data Pipeline section)
├── input/                    # Download Lista-FantaAsta-Fantacalcio.csv into here
│   └── README.md                # (the CSV itself is gitignored)
├── cache/                    # Cached Understat API responses (gitignored)
├── config.py                  # CURRENT_SEASON / PREVIOUS_SEASONS - tune the season here
├── parse_csv.py               # Reads the fantacalcio.it CSV
├── understat_fetch.py         # Fetches Understat player stats
├── match_utils.py              # Name/team fuzzy-matching helpers
├── enrich.py                   # Matches CSV players against Understat data
└── build.py                    # Orchestrator: CSV -> Understat -> public/data/final.json
```

## 🎮 Usage Guide

### 1. **Player Search & Analysis**
- Use the "Giocatori" tab to search and filter players
- Apply role and skill filters for targeted searches
- View detailed player statistics and performance metrics

### 2. **Team Building**
- Navigate to "La Mia Rosa" to manage your team
- Select formations and view automatic player assignments
- Monitor team statistics and budget allocation

### 3. **Player Acquisition**
- Click on any player to open the acquisition modal
- Set your bid amount and select target team
- Validate budget constraints and complete purchases

### 4. **Multi-Team Management**
- Use the "Squadre" tab to manage multiple teams
- Compare team compositions and budgets
- Drag and drop players between teams

## 🔧 Configuration

### Team Settings
- **Minimum players**: 21 (configurable)
- **Maximum players**: 30 (configurable)
- **Initial budget**: 500 FM (configurable per team)

### Formation System
- **Automatic assignment** based on player roles and appetibilita
- **Position priority** determined by role importance
- **Reserve management** for unassigned players

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
