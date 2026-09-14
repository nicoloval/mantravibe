# input/quotazioni/

Download the free player list from fantacalcio.it:
[fantacalcio.it/quotazioni-fantacalcio](https://www.fantacalcio.it/quotazioni-fantacalcio) →
set the **"Visualizza ruoli" filter to "Mantra"** (not "Classic") → export to Excel. The
pipeline reads the Mantra role column - do this before exporting or the export may not have it.
Place the downloaded `.xlsx` file directly in this folder, whatever it's actually named - the
pipeline picks up the one `.xlsx` file it finds here rather than matching an exact filename.

This is the base player list (names, teams, Mantra roles, quotazioni) that
`data-pipeline/parse_quotazioni.py` builds every player record from.
