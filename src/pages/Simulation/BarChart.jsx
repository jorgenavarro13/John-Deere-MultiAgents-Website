import React from 'react';

// Simple vertical bar chart in HTML/CSS — crisp for a handful of live values
// (tank levels, cart loads, per-run KPIs). Optional horizontal threshold line.
//
// Props:
//   bars        [{ label, value, color?, sub? }]
//   max         full-scale value (default: max bar value)
//   threshold   { value, label } to draw a dashed line across
//   formatValue value -> label shown above each bar
function BarChart({ bars, max, threshold, formatValue = (v) => v }) {
  if (!bars || !bars.length) {
    return <div className="chart-empty">Sin datos todavía…</div>;
  }

  const top = max ?? Math.max(...bars.map((b) => b.value), 1);
  const pct = (v) => `${Math.max(0, Math.min(100, (v / top) * 100))}%`;

  return (
    <div className="bar-chart">
      <div className="bar-chart-plot">
        {threshold != null && (
          <div className="bar-threshold" style={{ bottom: pct(threshold.value) }}>
            <span>{threshold.label}</span>
          </div>
        )}
        {bars.map((b) => (
          <div key={b.label} className="bar-col">
            <span className="bar-value">{formatValue(b.value)}</span>
            <div
              className="bar"
              style={{ height: pct(b.value), background: b.color || 'var(--jd-green)' }}
            />
          </div>
        ))}
      </div>
      <div className="bar-chart-labels">
        {bars.map((b) => (
          <div key={b.label} className="bar-tick">
            <span className="bar-label">{b.label}</span>
            {b.sub && <span className="bar-sub">{b.sub}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default BarChart;
