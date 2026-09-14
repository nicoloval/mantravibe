# input/statistiche_precedente/

Download the **previous** season's stats export from
[fantacalcio.it/statistiche-serie-a](https://www.fantacalcio.it/statistiche-serie-a/): pick the
season matching `PREVIOUS_SEASONS[0]` in `data-pipeline/config.py`, role filter "Tutti", set the
**"Visualizza ruoli" filter to "Mantra"** (not "Classic"), and export to Excel. Place the
downloaded `.xlsx` file directly in this folder, whatever it's actually named - the pipeline
picks up the one `.xlsx` file it finds here rather than matching an exact filename.

See `data-pipeline/input/README.md` for how it's used together with `../statistiche_corrente/`
and Understat.
