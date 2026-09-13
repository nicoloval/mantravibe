# input/lista_fantaasta/

Download the free player list from fantacalcio.it: **App → FantaAsta Live → Calciatori Serie A**
→ `Lista-FantaAsta-Fantacalcio.csv`. Place the downloaded file directly in this folder, whatever
it's actually named - the pipeline picks up the one `.csv` file it finds here rather than
matching an exact filename, so a browser-mangled name like `Lista-FantaAsta-Fantacalcio (1).csv`
still works.

This is the base player list (names, teams, Mantra roles, quotazioni) that
`data-pipeline/parse_csv.py` builds every player record from.
