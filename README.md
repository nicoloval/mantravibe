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

This project builds upon and integrates with two key open-source projects:

### [fantacalcio-py](https://github.com/piopy/fantacalcio-py)
The data source for this application. This Python tool:
- **Scrapes player data** from FPEDIA and FSTATS
- **Calculates convenience indices** for player valuation
- **Processes and cleans** statistical data
- **Exports structured data** in Excel format

The processed data from fantacalcio-py is used as the foundation for all player analysis and recommendations in Mantravibe.

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

### Data Setup

1. **Player Data**: Place the processed player data file in `public/data/final.json`
2. **Role Configuration**: Ensure `public/data/roles.csv` contains role definitions and colors
3. **Appetibilita Data**: Place formation role preferences in `public/assets/appetibilita.json`

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
