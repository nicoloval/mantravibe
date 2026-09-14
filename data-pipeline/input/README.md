# input/

Three manual downloads from fantacalcio.it go here, one per subfolder - download all three at
the same time so they're from the same data snapshot, see each subfolder's own README for
exactly what to download and from where:

- `quotazioni/` - the free player list (names, teams, Mantra roles, quotazioni)
- `statistiche_corrente/` - this season's official stats export (Media Voto, Fantamedia, Gol
  Subiti, ...)
- `statistiche_precedente/` - last season's version of the same export

**All three exports have a "Visualizza ruoli" filter on the fantacalcio.it page - set it to
"Mantra" (not "Classic") before exporting.** The pipeline reads the Mantra role column; a
Classic-mode export may not have it.

Each subfolder holds exactly one file, and the pipeline picks up whatever file it finds there by
type (currently always `.xlsx`) rather than matching an exact filename - browsers often rename a
download that collides with an existing file (`Quotazioni_Fantacalcio_Stagione_2026_27 (1).xlsx`),
and a filename-based lookup would just silently miss it.

fantacalcio.it's own two stats exports (`statistiche_corrente/` and `statistiche_precedente/`)
are the **primary** source for Presenze, Gol, Assist, Ammonizioni, Espulsioni, Media Voto,
Fantamedia and Gol Subiti - they carry the same internal player `Id` as the `quotazioni/` list, so
matching is an exact id lookup rather than fuzzy name matching. Understat (fetched automatically,
not a manual download - see the main README) complements this: it's the only source for Minuti
Giocati, xG and xA, and it fills in the other stats too for any player missing from the Serie
A-only fantacalcio.it exports (e.g. someone who just transferred in from another league).

Then run `npm run data:build` from the `mantravibe/` root. All the files in this folder are
gitignored - only the READMEs are tracked, to keep the folders present after a fresh clone.
