import React, { useMemo } from 'react';

// Dependency-free SVG line chart. Draws one or more series of { x, y } points
// on a responsive viewBox, with horizontal gridlines, y-axis labels and a
// marker on each series' most recent point.
//
// Props:
//   series   [{ label, color, points: [{ x, y }] }]  (or use `points` + `color`
//            for a single unlabelled series)
//   yMin     fixed lower bound (default 0)
//   yMax     fixed upper bound; auto-fit + rounded when omitted
//   formatY  value -> y-axis tick label
//   area     fill under the line (default: only when there is a single series)
//   legend   show a swatch row above the chart (default: when >1 series)
const W = 900;
const H = 260;
const pad = { top: 16, right: 16, bottom: 28, left: 48 };

function niceMax(v) {
  if (v <= 1) return 1;
  const step = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / step) * step;
}

function LineChart({
  series,
  points,
  color = 'var(--jd-green)',
  yMin = 0,
  yMax,
  formatY = (v) => v.toFixed(2),
  area,
  legend,
}) {
  const list = useMemo(() => {
    const raw = series && series.length ? series : points ? [{ label: '', color, points }] : [];
    return raw.filter((s) => s.points && s.points.length);
  }, [series, points, color]);

  const showArea = area ?? list.length === 1;
  const showLegend = legend ?? list.length > 1;

  const geom = useMemo(() => {
    if (!list.length) return null;

    const allX = list.flatMap((s) => s.points.map((p) => p.x));
    const allY = list.flatMap((s) => s.points.map((p) => p.y));
    const xMin = Math.min(...allX);
    const xMax = Math.max(...allX);
    const hi = yMax ?? niceMax(Math.max(...allY, yMin + 1e-9));
    const xSpan = xMax - xMin || 1;
    const ySpan = hi - yMin || 1;

    const plotW = W - pad.left - pad.right;
    const plotH = H - pad.top - pad.bottom;
    const sx = (x) => pad.left + ((x - xMin) / xSpan) * plotW;
    const sy = (y) => pad.top + (1 - (y - yMin) / ySpan) * plotH;

    const drawn = list.map((s) => {
      const line = s.points.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ');
      const last = s.points[s.points.length - 1];
      return {
        color: s.color,
        line,
        area: `${sx(s.points[0].x)},${sy(yMin)} ${line} ${sx(last.x)},${sy(yMin)}`,
        dot: { x: sx(last.x), y: sy(last.y) },
      };
    });

    const yTicks = Array.from({ length: 5 }, (_, i) => {
      const v = yMin + (i / 4) * ySpan;
      return { v, y: sy(v) };
    });

    return { drawn, yTicks, xMin, xMax };
  }, [list, yMin, yMax]);

  if (!geom) {
    return (
      <div className="chart">
        <div className="chart-empty">Sin datos todavía…</div>
      </div>
    );
  }

  return (
    <div className="chart">
      {showLegend && (
        <div className="chart-legend">
          {list.map((s) => (
            <span key={s.label} className="chart-legend-item">
              <span className="chart-legend-dot" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}

      <svg className="line-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img">
        {geom.yTicks.map((t, i) => (
          <g key={i}>
            <line className="chart-grid" x1={pad.left} x2={W - pad.right} y1={t.y} y2={t.y} />
            <text className="chart-axis-label" x={pad.left - 8} y={t.y + 4} textAnchor="end">
              {formatY(t.v)}
            </text>
          </g>
        ))}

        {geom.drawn.map((d, i) => (
          <g key={i}>
            {showArea && <polygon className="chart-area" points={d.area} fill={d.color} />}
            <polyline className="chart-line" points={d.line} stroke={d.color} />
            <circle className="chart-dot" cx={d.dot.x} cy={d.dot.y} r="4" fill={d.color} />
          </g>
        ))}

        <text className="chart-axis-label" x={pad.left} y={H - 8} textAnchor="start">
          tick {geom.xMin}
        </text>
        <text className="chart-axis-label" x={W - pad.right} y={H - 8} textAnchor="end">
          tick {geom.xMax}
        </text>
      </svg>
    </div>
  );
}

export default LineChart;
