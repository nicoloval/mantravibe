import React, { useState, useEffect } from 'react';
import { theme } from '../theme';

// Tiny 2-point trend line (previous season -> current season) for a single stat.
const Sparkline = ({ prev, cur, width = 46, height = 18 }) => {
  if (typeof prev !== 'number' || typeof cur !== 'number' || prev < 0 || cur < 0) return null;
  const max = Math.max(prev, cur, 0);
  const min = Math.min(prev, cur, 0);
  const range = (max - min) || 1;
  const y = (v) => height - 3 - ((v - min) / range) * (height - 6);
  const x0 = 3;
  const x1 = width - 3;
  const trendColor = cur > prev ? theme.success : cur < prev ? theme.danger : theme.textFaint;
  return (
    <svg width={width} height={height} style={{ display: 'block', flexShrink: 0 }}>
      <line x1={x0} y1={y(prev)} x2={x1} y2={y(cur)} stroke={trendColor} strokeWidth="2" strokeLinecap="round" />
      <circle cx={x0} cy={y(prev)} r="2" fill={theme.textFaint} />
      <circle cx={x1} cy={y(cur)} r="2.5" fill={trendColor} />
    </svg>
  );
};

const isMissingData = (value) => {
  if (value === undefined || value === null) return true;
  return typeof value === 'number' && value < 0;
};

const formatValue = (value) => {
  if (typeof value === 'number') {
    if (isMissingData(value)) return 'N/A';
    return Number.isInteger(value) ? value.toString() : value.toFixed(2);
  }
  return String(value || '-');
};

// Per-match averages (goals/assists/xG/xA/minutes divided by appearances) - a raw per-season
// total isn't comparable between a season that's only a few matches old and a full previous
// one, so showing it plain was mostly noise rather than an actual trend/comparison. Dividing by
// Presenze keeps both seasons (and every player, regardless of appearances) on the same
// per-appearance scale. Gol Subiti only applies to goalkeepers - filtered by role below.
const PER_MATCH_BASES = ['Minuti Giocati', 'Gol', 'Assist', 'Gol Subiti', 'xG', 'xA'];
const PER_MATCH_LABELS = {
  'Minuti Giocati': 'Min/Partita',
  'Gol': 'Gol/Partita',
  'Assist': 'Assist/Partita',
  'Gol Subiti': 'Gol Sub./Partita',
  'xG': 'xG/Partita',
  'xA': 'xA/Partita'
};

const getPerMatchAverage = (player, base, season) => {
  const presenze = player[`Presenze ${season}`];
  const raw = player[`${base} ${season}`];
  if (isMissingData(presenze) || isMissingData(raw) || presenze <= 0) return undefined;
  return raw / presenze;
};

const formatPerMatchValue = (value, base) => {
  if (typeof value !== 'number') return '-';
  // Minutes-per-appearance reads as a whole number (e.g. "68"), like the raw minutes field
  // does; goals/assists/xG/xA per appearance are fractional, so keep 2 decimals.
  return base === 'Minuti Giocati' ? Math.round(value).toString() : value.toFixed(2);
};

// One row: label | prev avg | prev raw | spark | cur avg | cur raw - fixed tracks so every row
// lines up regardless of how many digits a given value has; Presenze/Ammonizioni just leave the
// "raw" sub-columns empty rather than using a different layout. On mobile the fixed-width
// tracks (222px+ before the flexible label even gets a share) don't fit inside a narrow card,
// so the parenthetical column is dropped there and the row collapses to 4 columns.
const StatTrendRow = ({ label, primaryPrev, primaryCur, parenPrev = '', parenCur = '', sparkPrev, sparkCur, prevMissing = false, curMissing = false, isMobile }) => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: isMobile
      ? 'minmax(0, 1fr) 2.5rem 46px 2.5rem'
      : 'minmax(0, 1fr) 2.5rem 3rem 46px 2.5rem 3rem',
    alignItems: 'center',
    columnGap: '0.25rem',
    padding: '0.25rem 0.375rem',
    backgroundColor: theme.surface,
    borderRadius: '0.25rem',
    fontVariantNumeric: 'tabular-nums'
  }}>
    <span style={{ fontSize: '0.75rem', color: theme.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    <span
      style={{ fontSize: '0.8rem', fontWeight: '600', color: prevMissing ? theme.danger : theme.textMuted, textAlign: 'right' }}
      title={parenPrev || undefined}
    >
      {primaryPrev}
    </span>
    {!isMobile && (
      <span style={{ fontSize: '0.7rem', color: theme.textFaint, textAlign: 'right' }}>
        {parenPrev}
      </span>
    )}
    <Sparkline prev={sparkPrev} cur={sparkCur} />
    <span
      style={{ fontSize: '0.8rem', fontWeight: '700', color: curMissing ? theme.danger : theme.text, textAlign: 'right' }}
      title={parenCur || undefined}
    >
      {primaryCur}
    </span>
    {!isMobile && (
      <span style={{ fontSize: '0.7rem', color: theme.textFaint, textAlign: 'right' }}>
        {parenCur}
      </span>
    )}
  </div>
);

// Self-contained prev-season -> current-season trend box (Presenze, Voto, per-match rates for
// Gol/Assist/Gol Subiti/xG/xA, Ammonizioni), each with a two-point sparkline. Used by both the
// Giocatori cards and the player detail page so a player's trend reads identically everywhere -
// see MantraGiocatoriTab.js's card rendering for the sibling call site.
const StatTrendTable = ({ player, curSeason, prevSeason }) => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const isMobile = windowWidth <= 768;

  if (!player) return null;

  const isGoalkeeper = player.Ruolo === 'POR';
  const bases = ['Presenze', ...PER_MATCH_BASES.filter(base => base !== 'Gol Subiti' || isGoalkeeper), 'Ammonizioni'];

  const rows = bases.flatMap((base) => {
    const isPerMatch = PER_MATCH_BASES.includes(base);
    const rawPrev = player[`${base} ${prevSeason}`];
    const rawCur = player[`${base} ${curSeason}`];
    const avgPrev = isPerMatch ? getPerMatchAverage(player, base, prevSeason) : undefined;
    const avgCur = isPerMatch ? getPerMatchAverage(player, base, curSeason) : undefined;
    // The sparkline tracks the per-match average (comparable across seasons of different
    // length); Presenze/Ammonizioni have no average and just track their raw count instead.
    const sparkPrev = isPerMatch ? avgPrev : rawPrev;
    const sparkCur = isPerMatch ? avgCur : rawCur;
    const prevMissing = isMissingData(rawPrev);
    const curMissing = isMissingData(rawCur);
    const label = isPerMatch ? PER_MATCH_LABELS[base] : base;
    // Presenze/Ammonizioni have no per-match average, so no raw total to show alongside it.
    const parenPrev = isPerMatch ? `(${formatValue(rawPrev)})` : '';
    const parenCur = isPerMatch ? `(${formatValue(rawCur)})` : '';

    const row = (
      <StatTrendRow
        key={base}
        label={label}
        primaryPrev={isPerMatch ? formatPerMatchValue(avgPrev, base) : formatValue(rawPrev)}
        primaryCur={isPerMatch ? formatPerMatchValue(avgCur, base) : formatValue(rawCur)}
        parenPrev={parenPrev}
        parenCur={parenCur}
        sparkPrev={sparkPrev}
        sparkCur={sparkCur}
        prevMissing={prevMissing}
        curMissing={curMissing}
        isMobile={isMobile}
      />
    );

    if (base !== 'Presenze') return [row];

    // Voto row - Media Voto (the raw referee-style grade, primary number) paired with
    // Fantamedia (the fantasy-adjusted score, parenthetical) rather than the generic avg/raw
    // total pairing above, since both are already per-match averages from fantacalcio.it -
    // there's no separate "raw total" for either.
    const mvPrev = player[`Media Voto ${prevSeason}`];
    const mvCur = player[`Media Voto ${curSeason}`];
    const fmPrev = player[`Fantamedia ${prevSeason}`];
    const fmCur = player[`Fantamedia ${curSeason}`];
    const votoRow = (
      <StatTrendRow
        key="Voto"
        label="Voto"
        primaryPrev={formatValue(mvPrev)}
        primaryCur={formatValue(mvCur)}
        parenPrev={isMissingData(fmPrev) ? '' : `(${formatValue(fmPrev)})`}
        parenCur={isMissingData(fmCur) ? '' : `(${formatValue(fmCur)})`}
        sparkPrev={mvPrev}
        sparkCur={mvCur}
        prevMissing={isMissingData(mvPrev)}
        curMissing={isMissingData(mvCur)}
        isMobile={isMobile}
      />
    );

    return [row, votoRow];
  });

  return (
    <div style={{
      backgroundColor: theme.surfaceAlt,
      padding: '0.5rem',
      borderRadius: '0.375rem'
    }}>
      <div style={{ fontSize: '0.7rem', fontWeight: '600', color: theme.textFaint, marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
        {prevSeason} → {curSeason}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {rows}
      </div>
    </div>
  );
};

export default StatTrendTable;
