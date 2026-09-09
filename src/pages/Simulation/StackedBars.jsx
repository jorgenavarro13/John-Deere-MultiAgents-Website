import React from 'react';

// Horizontal 100%-stacked bars, one row per machine — the "time in each state"
// breakdown from /api/state's stateHistogram. Colours are assigned per state
// name so the same state reads the same across rows.
const STATE_COLORS = {
  harvesting: '#7ab648',
  'to zone': '#4e7d3a',
  returning: '#e5b955',
  'waiting cart': '#c9803e',
  waiting: '#c9803e',
  unloading: '#5a8fb0',
  transferring: '#5a8fb0',
  moving: '#9aa0a6',
  idle: '#cdd2cd',
  down: '#8a2a2a',
};
const FALLBACK = ['#7c6ea8', '#3f7a2e', '#b0894e', '#5a8fb0', '#a8607c', '#6b8f71'];

function colorFor(state, i) {
  return STATE_COLORS[state] || FALLBACK[i % FALLBACK.length];
}

// rows: [{ label, states: { [stateName]: ticks } }]
function StackedBars({ rows }) {
  if (!rows || !rows.length) {
    return <div className="chart-empty">Sin datos todavía…</div>;
  }

  const names = [];
  rows.forEach((r) => Object.keys(r.states || {}).forEach((n) => {
    if (!names.includes(n)) names.push(n);
  }));

  return (
    <div className="stacked-bars">
      {rows.map((r) => {
        const total = Object.values(r.states || {}).reduce((a, b) => a + b, 0) || 1;
        return (
          <div key={r.label} className="stacked-row">
            <span className="stacked-label">{r.label}</span>
            <div className="stacked-track">
              {names.map((n, i) => {
                const v = r.states?.[n] || 0;
                if (!v) return null;
                return (
                  <span
                    key={n}
                    className="stacked-seg"
                    style={{ width: `${(v / total) * 100}%`, background: colorFor(n, i) }}
                    title={`${n}: ${v} ticks (${Math.round((v / total) * 100)}%)`}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="stacked-legend">
        {names.map((n, i) => (
          <span key={n} className="stacked-legend-item">
            <span className="stacked-legend-dot" style={{ background: colorFor(n, i) }} />
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}

export default StackedBars;
