import React from 'react';
import { useNavigate } from 'react-router-dom';
import { theme } from '../theme';

// Explains, in plain Italian, the two things about "La Mia Rosa" that aren't obvious from the
// UI alone: how the formazione (titolari + riserve) gets assigned automatically as you buy
// players, and how the 0-100 punteggio modulo shown when comparing formations is computed. See
// docs/formation-assignment.md for the underlying algorithm this is a plain-language version of.
const AboutPage = () => {
  const navigate = useNavigate();

  const sectionTitleStyle = {
    margin: '0 0 0.5rem 0',
    fontSize: '1.05rem',
    fontWeight: '600',
    color: theme.pink
  };

  const listStyle = {
    margin: '0.5rem 0 0 0',
    paddingLeft: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem'
  };

  const codeStyle = {
    backgroundColor: theme.surfaceAlt,
    border: `1px solid ${theme.border}`,
    borderRadius: '0.25rem',
    padding: '0.1rem 0.35rem',
    fontFamily: 'monospace',
    fontSize: '0.85rem'
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.85rem',
    marginTop: '0.5rem'
  };

  const thStyle = {
    textAlign: 'left',
    padding: '0.4rem 0.5rem',
    borderBottom: `2px solid ${theme.border}`,
    color: theme.textMuted,
    fontWeight: '600'
  };

  const tdStyle = {
    padding: '0.4rem 0.5rem',
    borderBottom: `1px solid ${theme.borderSoft}`
  };

  const roleRows = [
    ['Pc', 'Punta centrale', 1, 'più specialistico'],
    ['A', 'Attaccante', 2, ''],
    ['W', 'Ala', 3, ''],
    ['T', 'Trequartista', 3, ''],
    ['C', 'Centrocampista', 4, ''],
    ['E', 'Esterno', 5, ''],
    ['M', 'Mediano', 5, ''],
    ['Ds', 'Difensore sinistro', 6, ''],
    ['Dd', 'Difensore destro', 6, ''],
    ['B', 'Braccetto', 7, ''],
    ['Dc', 'Difensore centrale', 8, ''],
    ['P', 'Portiere', 9, 'più generico/flessibile']
  ];

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <button style={backButtonStyle} onClick={() => navigate('/')}>
          ← Torna a Giocatori
        </button>
        <h1 style={titleStyle}>ℹ️ Come funziona la Formazione</h1>
      </div>

      <div style={cardStyle}>
        <p style={{ margin: 0 }}>
          In "La Mia Rosa" non scegli manualmente chi schierare: titolari e riserve vengono
          assegnati automaticamente ogni volta che compri (o rimuovi) un giocatore, in base al
          modulo che hai selezionato e ai ruoli Mantra di ciascun giocatore della tua rosa.
        </p>
      </div>

      <div style={cardStyle}>
        <h2 style={sectionTitleStyle}>1. Come vengono scelti i titolari</h2>
        <p style={{ margin: 0 }}>
          Ogni modulo (es. 4-3-3) ha 11 slot fissi, ognuno dei quali accetta uno o più ruoli
          Mantra (uno slot può accettare, ad esempio, sia "Dc" che "B"). Quando la tua rosa
          cambia, l'app rifà da capo questo procedimento:
        </p>
        <ol style={listStyle}>
          <li>
            Gli 11 slot del modulo vengono ordinati dal più "specialistico" al più "generico" -
            portiere e difensori centrali vengono riempiti per primi, attaccanti e trequartisti
            per ultimi. Così i giocatori con meno alternative di ruolo hanno la priorità, prima
            che gli slot più flessibili "rubino" candidati validi anche altrove.
          </li>
          <li>
            Per ogni slot, tra i giocatori ancora liberi ed idonei, viene scelto il migliore
            candidato guardando prima il ruolo più raro che ciascuno potrebbe coprire (per non
            sprecare in un ruolo comune un giocatore che sa fare anche qualcosa di più raro), e
            in caso di parità l'<span style={codeStyle}>FVM</span> più alto.
          </li>
          <li>
            Il giocatore scelto occupa lo slot e non è più disponibile per gli altri; si passa
            allo slot successivo, finché tutti gli 11 posti sono coperti o non ci sono più
            candidati idonei.
          </li>
        </ol>
        <p style={{ margin: '0.5rem 0 0 0' }}>
          I giocatori il cui ruolo non corrisponde a <em>nessuno</em> slot del modulo scelto
          finiscono nella lista "Giocatori con ruoli non utilizzati" - non è detto sia un
          problema del giocatore, spesso significa solo che quel modulo specifico non ha spazio
          per il suo ruolo.
        </p>
      </div>

      <div style={cardStyle}>
        <h2 style={sectionTitleStyle}>2. Come vengono scelte le riserve</h2>
        <p style={{ margin: 0 }}>
          Le riserve si calcolano ripetendo esattamente lo stesso procedimento, ma solo sui
          giocatori rimasti fuori dagli 11 titolari - ottenendo una riserva per ogni slot (il
          miglior sostituto disponibile per quel ruolo, non un intero "banchetto" ordinato). I
          giocatori che non entrano né tra i titolari né tra le riserve restano comunque
          visibili nella tua rosa completa.
        </p>
      </div>

      <div style={cardStyle}>
        <h2 style={sectionTitleStyle}>3. Il punteggio del modulo</h2>
        <p style={{ margin: 0 }}>
          Ogni modulo riceve un punteggio (che vedi ad esempio nella schermata di acquisto,
          mostrato come "prima → dopo" per capire se comprare un giocatore migliora
          l'adattamento della tua rosa a quel modulo) calcolato in tre parti:
        </p>
        <ul style={listStyle}>
          <li>
            <strong>Titolari - fino a 50 punti.</strong> Proporzionale a quante delle 11
            posizioni titolari riesci a coprire:{' '}
            <span style={codeStyle}>50 × (titolari coperti / 11)</span>.
          </li>
          <li>
            <strong>Riserve - fino a 30 punti.</strong> Proporzionale a quante posizioni
            risultano coperte contando titolari <em>e</em> riserve insieme (fino a un massimo di
            11): <span style={codeStyle}>30 × (min(11, titolari + riserve) / 11)</span>.
          </li>
          <li>
            <strong>Penalità giocatori inutilizzabili - fino a -30 punti.</strong> Proporzionale
            a quanti giocatori della tua rosa non hanno alcun ruolo compatibile con questo
            modulo, rispetto alla dimensione totale della rosa:{' '}
            <span style={codeStyle}>min(30, 30 × (giocatori inutilizzabili / rosa totale))</span>.
          </li>
        </ul>
        <p style={{ margin: '0.5rem 0 0 0' }}>
          Il punteggio finale è la somma dei primi due meno la penalità (mai sotto lo 0). In
          pratica, con una rosa completa e ben distribuita il massimo raggiungibile è 80: i 50
          punti dei titolari più i 30 delle riserve, senza alcuna penalità.
        </p>
      </div>

      <div style={cardStyle}>
        <h2 style={sectionTitleStyle}>Quanto è "raro" ogni ruolo</h2>
        <p style={{ margin: 0 }}>
          Questa scala (chiamata "appetibilità") è quella usata per decidere quali slot
          riempire per primi e, a parità di slot, quale ruolo di un giocatore polivalente usare:
        </p>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Ruolo</th>
              <th style={thStyle}>Significato</th>
              <th style={thStyle}>Punteggio</th>
            </tr>
          </thead>
          <tbody>
            {roleRows.map(([code, label, score, note]) => (
              <tr key={code}>
                <td style={tdStyle}><span style={codeStyle}>{code}</span></td>
                <td style={tdStyle}>{label}</td>
                <td style={tdStyle}>{score}{note ? ` (${note})` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Styles - matching PlayerPage.js's page-with-cards layout for a consistent look.
const containerStyle = {
  maxWidth: '900px',
  margin: '0 auto',
  padding: '2rem',
  minHeight: '100vh',
  backgroundColor: theme.bg,
  color: theme.text,
  fontFamily: 'system-ui, -apple-system, sans-serif'
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '1.5rem',
  marginBottom: '2rem',
  flexWrap: 'wrap'
};

const backButtonStyle = {
  padding: '0.5rem 1rem',
  backgroundColor: theme.pink,
  color: 'white',
  border: 'none',
  borderRadius: '0.375rem',
  cursor: 'pointer',
  fontSize: '0.875rem',
  fontWeight: '500',
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center'
};

const titleStyle = {
  fontSize: '1.5rem',
  fontWeight: '700',
  color: theme.text,
  margin: 0
};

const cardStyle = {
  backgroundColor: theme.surface,
  borderRadius: '0.75rem',
  padding: '1.5rem',
  marginBottom: '1.5rem',
  border: `1px solid ${theme.border}`,
  fontSize: '0.9rem',
  lineHeight: 1.6
};

export default AboutPage;
