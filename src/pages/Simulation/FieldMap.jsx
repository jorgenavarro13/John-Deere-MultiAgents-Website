import React, { useMemo } from 'react';

// Minimap of the field from /api/field: standing / cut / rock cells, plus the
// live harvester and cart positions. Square cells, so the SVG keeps its aspect
// ratio inside the card.
const CROP_FILL = {
  '1': 'var(--jd-grass)',
  '0': 'var(--jd-soil-light)',
  '-1': 'var(--jd-gray)',
};

function FieldMap({ field }) {
  const geom = useMemo(() => {
    if (!field || !field.ready || !field.rows || !field.columns) return null;
    const { rows, columns } = field;
    const cells = rows * columns;
    const dense = cells <= 2500 && Array.isArray(field.crop) && field.crop.length === cells;
    return { rows, columns, dense };
  }, [field]);

  if (!geom) {
    return <div className="chart-empty">Sin campo todavía…</div>;
  }

  const { rows, columns, dense } = geom;

  return (
    <svg
      className="field-map"
      viewBox={`0 0 ${columns} ${rows}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
    >
      <rect x="0" y="0" width={columns} height={rows} fill="var(--jd-soil-light)" />

      {dense &&
        field.crop.map((v, i) => {
          if (v === 0) return null; // background already covers "cut"
          const row = Math.floor(i / columns);
          const col = i % columns;
          return (
            <rect
              key={i}
              x={col}
              y={row}
              width="1"
              height="1"
              fill={CROP_FILL[String(v)] || 'var(--jd-soil-light)'}
            />
          );
        })}

      {!dense &&
        (field.obstacles || []).map((o, i) => (
          <rect key={`o${i}`} x={o.column} y={o.row} width="1" height="1" fill="var(--jd-gray)" />
        ))}

      {(field.carts || []).map((c) => (
        <rect
          key={c.id}
          x={c.column + 0.2}
          y={c.row + 0.2}
          width="0.6"
          height="0.6"
          rx="0.12"
          fill="#5a8fb0"
        />
      ))}

      {(field.harvesters || []).map((h) => (
        <circle key={h.id} cx={h.column + 0.5} cy={h.row + 0.5} r="0.36" fill="var(--jd-yellow)" />
      ))}
    </svg>
  );
}

export default FieldMap;
