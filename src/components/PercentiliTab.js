import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { theme } from '../theme';
import { fasciaColor } from '../utils/fasceColors';

// Display order matches the role filter chips used elsewhere in the app (Giocatori tab, role
// filters, ...) - Mantra role codes, not the classic Ruolo (POR/DIF/CEN/ATT). Dc and B are
// merged into one entry here: the data pipeline (fantamedia_percentiles.py's ROLE_MERGE_GROUPS)
// pools them into identical fasce since B alone has too few eligible players for stable stats,
// so showing them as two separate rows/chips would just be the same numbers twice.
const ROLE_ORDER = ['P', 'Dc', 'Dd', 'Ds', 'E', 'M', 'C', 'W', 'T', 'A', 'Pc'];

const ROLE_LABELS = {
  P: 'Portiere',
  Dc: 'Difensore centrale / Braccetto',
  Dd: 'Difensore destro',
  Ds: 'Difensore sinistro',
  E: 'Esterno',
  M: 'Mediano',
  C: 'Centrocampista',
  W: 'Ala',
  T: 'Trequartista',
  A: 'Attaccante',
  Pc: 'Punta centrale'
};

// Short chip/badge text - same as the role code everywhere except the merged Dc/B entry.
const ROLE_DISPLAY_CODE = {
  Dc: 'Dc/B'
};

// Same role -> color mapping used throughout the app (Header's spending bar, MantraGiocatoriTab's
// role chips, ...).
const ROLE_COLORS = {
  P: theme.roleCategory.goalkeepers,
  Dc: theme.roleCategory.defenders,
  Dd: theme.roleCategory.defenders,
  Ds: theme.roleCategory.defenders,
  E: theme.roleCategory.midfielders,
  M: theme.roleCategory.midfielders,
  C: theme.roleCategory.midfielders,
  W: theme.roleCategory.wingers,
  T: theme.roleCategory.wingers,
  A: theme.roleCategory.attackers,
  Pc: theme.roleCategory.attackers
};

// The gap-analysis table's rows (roles are the columns) - each entry pulls its value off a
// roleGapStats row and formats it; `sub` (when present) renders as a second, muted line under
// the main label via GapHeaderLabel, naming the underlying "fascia" stat for anyone who knows
// that terminology.
const GAP_METRICS = [
  { label: 'Giocatori', getValue: (row) => row.n, format: (v) => v },
  { label: 'Titolari', sub: '(Mediana)', getValue: (row) => row.median, format: (v) => (v !== null ? v.toFixed(2) : '-') },
  { label: 'Differenza Semitop Alto Titolari', sub: '(Scarto Fascia 2)', getValue: (row) => row.gapFascia2, format: (v) => (v !== null ? v.toFixed(2) : '-') },
  { label: 'Differenza Top Titolari', sub: '(Scarto Fascia 1)', getValue: (row) => row.gapFascia1, format: (v) => (v !== null ? v.toFixed(2) : '-') },
  { label: 'Incremento %', getValue: (row) => row.pctIncrement, format: (v) => (v !== null ? `${v > 0 ? '+' : ''}${v.toFixed(0)}%` : '-') },
  { label: 'Differenza Supertop e Semitop', sub: '(Scarto Max Fascia 3)', getValue: (row) => row.topRange, format: (v) => (v !== null ? v.toFixed(2) : '-') }
];

// `data` is the precomputed fantamedia_percentiles.json content, fetched once in App.js
// alongside the app's other data files and passed down here - a plain render, no client-side
// grouping/sorting or fetch of its own needed.
const PercentiliTab = ({ data }) => {
  const navigate = useNavigate();

  const [selectedSeason, setSelectedSeason] = useState(() => localStorage.getItem('percentiliSelectedSeason'));
  const [selectedRole, setSelectedRole] = useState(() => {
    const saved = localStorage.getItem('percentiliSelectedRole');
    // 'B' used to be its own chip before it was merged into 'Dc' - fall back for anyone with
    // that still saved from before the merge.
    return saved === 'B' ? 'Dc' : (saved || 'P');
  });

  // Defaults to the first (current) season once data arrives, unless a previously saved
  // selection still matches an available season (e.g. after a season rollover it may not).
  useEffect(() => {
    if (!data) return;
    setSelectedSeason(prev => (prev && data[prev] ? prev : Object.keys(data)[0]));
  }, [data]);

  useEffect(() => {
    if (selectedSeason) localStorage.setItem('percentiliSelectedSeason', selectedSeason);
  }, [selectedSeason]);

  useEffect(() => {
    localStorage.setItem('percentiliSelectedRole', selectedRole);
  }, [selectedRole]);

  const fasce = useMemo(() => {
    if (!data || !selectedSeason) return [];
    return data[selectedSeason]?.[selectedRole] || [];
  }, [data, selectedSeason, selectedRole]);

  const totalEligible = useMemo(() => fasce.reduce((sum, f) => sum + f.length, 0), [fasce]);

  // Per-role gap analysis for the selected season. "Inf" of a fascia is its lower bound (the
  // worst Fantamedia still in that fascia), "sup" its upper bound (the best) - each fascia
  // array is already sorted descending, so inf is simply its last entry and sup its first.
  // Concatenating all ten fasce back together (they're contiguous slices of one descending
  // list) reproduces the role's full sorted eligible list, needed for the median.
  const roleGapStats = useMemo(() => {
    if (!data || !selectedSeason) return [];
    const seasonData = data[selectedSeason] || {};
    return ROLE_ORDER.map(role => {
      const roleFasce = seasonData[role] || [];
      const all = roleFasce.flat();
      const n = all.length;
      if (n === 0) {
        return { role, n, median: null, gapFascia2: null, gapFascia1: null, pctIncrement: null, topRange: null };
      }

      const median = n % 2 === 1
        ? all[(n - 1) / 2].Fantamedia
        : (all[n / 2 - 1].Fantamedia + all[n / 2].Fantamedia) / 2;

      const infOf = (group) => (group && group.length ? group[group.length - 1].Fantamedia : null);
      const supOf = (group) => (group && group.length ? group[0].Fantamedia : null);

      const infFascia1 = infOf(roleFasce[0]);
      const supFascia1 = supOf(roleFasce[0]);
      const infFascia2 = infOf(roleFasce[1]);
      const infFascia3 = infOf(roleFasce[2]);

      // Distance from the median of Fascia 2's lower bound, and of Fascia 1's (the more
      // extreme one, since Fascia 1 is the top decile) - both as plain (positive) magnitudes.
      const gapFascia2 = infFascia2 !== null ? Math.abs(infFascia2 - median) : null;
      const gapFascia1 = infFascia1 !== null ? Math.abs(infFascia1 - median) : null;
      // How much larger the Fascia 1 gap is than the Fascia 2 gap, as a percentage of the
      // latter - naturally positive since Fascia 1's boundary sits further from the median.
      const pctIncrement = (gapFascia2 !== null && gapFascia1 !== null && gapFascia2 !== 0)
        ? ((gapFascia1 - gapFascia2) / gapFascia2) * 100
        : null;
      // Spread from the single best Fantamedia in the role (max of Fascia 1) down to the
      // bottom of Fascia 3 - the width of the whole top-3-fasce band.
      const topRange = (supFascia1 !== null && infFascia3 !== null) ? supFascia1 - infFascia3 : null;

      return { role, n, median, gapFascia2, gapFascia1, pctIncrement, topRange };
    });
  }, [data, selectedSeason]);

  if (!data) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: theme.danger }}>
        Impossibile caricare i percentili Fantamedia.
      </div>
    );
  }

  const seasons = Object.keys(data);

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      <p style={{ color: theme.textMuted, fontSize: '0.9rem', margin: '0 0 1.25rem 0', lineHeight: 1.5 }}>
        Per ogni ruolo, i giocatori che hanno giocato almeno metà delle partite disputate finora
        in quella stagione (fino a un massimo di 15) sono ordinati per Fantamedia e divisi in 10
        fasce da pari numero - Fascia 1 sono il 10% con la Fantamedia più alta, Fascia 10 il 10%
        più bassa. Un giocatore con più ruoli Mantra compare in ognuno di essi.
      </p>

      {/* Season toggle */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {seasons.map(season => (
          <button
            key={season}
            onClick={() => setSelectedSeason(season)}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              border: `2px solid ${theme.pink}`,
              borderRadius: '0.375rem',
              backgroundColor: selectedSeason === season ? theme.pink : 'transparent',
              color: selectedSeason === season ? 'white' : theme.pink,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {season}
          </button>
        ))}
      </div>

      {/* Gap analysis - one row per role, all for the currently selected season. */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: theme.text, margin: '0 0 0.5rem 0' }}>
          Analisi divari per ruolo - {selectedSeason}
        </h3>
        <p style={{ color: theme.textMuted, fontSize: '0.8rem', margin: '0 0 0.75rem 0', lineHeight: 1.5 }}>
          Per ruolo: numero di giocatori idonei (soglia minima di presenze), distanza dalla
          mediana dell'inizio della Fascia 2 e dell'inizio della Fascia 1, di quanto il secondo
          scarto sia più ampio del primo in percentuale, e l'ampiezza delle prime 3 fasce
          (massimo della Fascia 1 meno minimo della Fascia 3).
        </p>
        <div style={{ overflowX: 'auto', border: `1px solid ${theme.border}`, borderRadius: '0.5rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={gapThStyle}>Indicatore</th>
                {roleGapStats.map(row => (
                  <th key={row.role} style={gapThStyleRight}>
                    <span style={{
                      padding: '0.2rem 0.55rem',
                      borderRadius: '0.25rem',
                      backgroundColor: ROLE_COLORS[row.role] || theme.textMuted,
                      color: 'white',
                      fontWeight: '700',
                      fontSize: '0.85rem'
                    }}>
                      {ROLE_DISPLAY_CODE[row.role] || row.role}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GAP_METRICS.map((metric, index) => (
                <tr key={metric.label} style={{ backgroundColor: index % 2 === 0 ? theme.surface : theme.surfaceAlt }}>
                  <td style={gapTdStyle}>
                    {metric.sub ? <GapHeaderLabel main={metric.label} sub={metric.sub} /> : metric.label}
                  </td>
                  {roleGapStats.map(row => (
                    <td key={row.role} style={gapTdStyleRight}>{metric.format(metric.getValue(row))}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role selector */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
        {ROLE_ORDER.map(role => {
          const roleColor = ROLE_COLORS[role] || theme.textMuted;
          const isSelected = selectedRole === role;
          return (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              title={ROLE_LABELS[role]}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                border: `2px solid ${roleColor}`,
                borderRadius: '0.375rem',
                backgroundColor: isSelected ? roleColor : 'transparent',
                color: isSelected ? 'white' : roleColor,
                cursor: 'pointer',
                transition: 'all 0.2s',
                minWidth: '40px',
                textAlign: 'center'
              }}
            >
              {ROLE_DISPLAY_CODE[role] || role}
            </button>
          );
        })}
      </div>

      <div style={{ color: theme.textMuted, fontSize: '0.8rem', marginBottom: '1.25rem' }}>
        {ROLE_LABELS[selectedRole]} - {totalEligible} giocatori idonei in {selectedSeason}
      </div>

      {/* Fasce grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: '1rem'
      }}>
        {fasce.map((players, index) => {
          const accent = fasciaColor(index);
          const best = players[0]?.Fantamedia;
          const worst = players[players.length - 1]?.Fantamedia;

          return (
            <div key={index} style={{
              backgroundColor: theme.surface,
              border: `1px solid ${theme.border}`,
              borderTop: `3px solid ${accent}`,
              borderRadius: '0.5rem',
              padding: '0.75rem',
              minHeight: '80px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: '700', color: theme.text, fontSize: '0.95rem' }}>
                  Fascia {index + 1}
                </span>
                {players.length > 0 && (
                  <span style={{ fontSize: '0.75rem', color: theme.textMuted }}>
                    {worst.toFixed(2)} - {best.toFixed(2)}
                  </span>
                )}
              </div>

              {players.length === 0 ? (
                <div style={{ color: theme.textFaint, fontSize: '0.8rem', fontStyle: 'italic' }}>
                  Nessun giocatore
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  {players.map(player => (
                    <div
                      key={player.player_id}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}
                    >
                      <span
                        onClick={() => navigate(`/player/${player.player_id}`)}
                        title="Vedi dettagli giocatore"
                        style={{
                          color: theme.blue,
                          cursor: 'pointer',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {player.Nome}
                      </span>
                      <span style={{ color: theme.textMuted, flexShrink: 0 }}>
                        {player.Fantamedia.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Two-line header cell: the descriptive name, with the underlying stat name (the raw fascia
// terminology) as a smaller, muted subtitle right below it - keeps the table readable to
// someone unfamiliar with "fascia" jargon while still naming the exact stat for anyone who is.
const GapHeaderLabel = ({ main, sub }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
    <span>{main}</span>
    <span style={{ fontWeight: '500', fontSize: '0.68rem', textTransform: 'none', letterSpacing: 'normal', color: theme.textFaint }}>
      {sub}
    </span>
  </div>
);

const gapThStyle = {
  textAlign: 'left',
  padding: '0.65rem 0.9rem',
  fontSize: '0.8rem',
  fontWeight: '700',
  color: theme.textMuted,
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
  backgroundColor: theme.surfaceAlt,
  border: `1px solid ${theme.border}`,
  whiteSpace: 'nowrap'
};

const gapThStyleRight = { ...gapThStyle, textAlign: 'right' };

const gapTdStyle = {
  padding: '0.65rem 0.9rem',
  color: theme.text,
  fontSize: '0.9rem',
  fontWeight: '600',
  whiteSpace: 'nowrap',
  border: `1px solid ${theme.borderSoft}`
};

const gapTdStyleRight = { ...gapTdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: '700', fontSize: '1rem' };

export default PercentiliTab;
