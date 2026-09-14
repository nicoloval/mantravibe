# input/statistiche_corrente/

Download the **current** season's stats export from
[fantacalcio.it/statistiche-serie-a](https://www.fantacalcio.it/statistiche-serie-a/): pick the
season matching `CURRENT_SEASON` in `data-pipeline/config.py`, role filter "Tutti", set the
**"Visualizza ruoli" filter to "Mantra"** (not "Classic"), and export to Excel. Place the
downloaded `.xlsx` file directly in this folder, whatever it's actually named - the pipeline
picks up the one `.xlsx` file it finds here rather than matching an exact filename.

This is fantacalcio.it's own official per-player stats (Media Voto, Fantamedia, Gol Subiti, ...) -
see `data-pipeline/input/README.md` for how it's used together with
`../statistiche_precedente/` and Understat.
