import React, { useMemo } from 'react'
import './Terrain.css'

// Usable size of the map frame in px, used only to decide whether individual
// cells are still large enough to be worth drawing. Kept in sync with the
// .terrain-map rule in Terrain.css.
const MAP_WIDTH = 336;
const MAP_HEIGHT = 200;
const MIN_CELL_PX = 4;

// Above this many nodes the obstacles are drawn as fewer, larger patches so the
// browser is not asked to lay out thousands of elements.
const MAX_OBSTACLE_NODES = 150;

// Deterministic PRNG (mulberry32). The seed comes from the terrain settings, so
// the obstacles only move when the user actually changes the configuration —
// not on every keystroke.
function makeRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Builds an ILLUSTRATIVE distribution of restricted cells. The simulation does
// not generate obstacles yet, so these positions are not the ones it will use —
// only the covered area matches the configured percentage.
function buildObstacles(rows, columns, pct) {
  const total = rows * columns;
  const target = Math.round((total * pct) / 100);
  if (target <= 0) return [];

  // When the real count is too high, draw fewer but larger square patches so the
  // covered area still tracks the percentage.
  const count = Math.min(target, MAX_OBSTACLE_NODES);
  const side = Math.max(1, Math.round(Math.sqrt(target / count)));

  const random = makeRandom(rows * 73856093 + columns * 19349663 + pct * 83492791);
  const patches = [];

  for (let i = 0; i < count; i++) {
    const col = Math.floor(random() * Math.max(1, columns - side + 1));
    const row = Math.floor(random() * Math.max(1, rows - side + 1));
    patches.push({
      id: i,
      left: (col / columns) * 100,
      top: (row / rows) * 100,
      width: (side / columns) * 100,
      height: (side / rows) * 100,
    });
  }

  return patches;
}

// Controlled component: state lives in the parent (Simulation.jsx).
// `data` holds { rows, columns, hasObstacles, obstaclePct }.
// `onChange` receives a patch object, e.g. onChange({ rows: 5 }).
function Terrain({ data, onChange }) {

  const { rows, columns, hasObstacles, obstaclePct } = data;

  const r = Number(rows) || 0;
  const c = Number(columns) || 0;

  const hasSize = r >= 1 && c >= 1;
  const pct = hasObstacles ? Math.min(100, Math.max(0, Number(obstaclePct) || 0)) : 0;

  // Cells are only drawn while they stay readable; past that the grid turns into
  // moiré noise and the plot reads better as solid soil.
  const cellPx = hasSize ? Math.min(MAP_WIDTH / c, MAP_HEIGHT / r) : 0;
  const showGrid = cellPx >= MIN_CELL_PX;

  const obstacles = useMemo(
    () => (hasSize && pct > 0 ? buildObstacles(r, c, pct) : []),
    [hasSize, r, c, pct]
  );

  return (
    <div className="terrain-container">
      <h1>Configuración del terreno</h1>

      <div className="terrain-layout">

        {/* Controls */}
        <div className="terrain-controls">

          <div className="terrain-field">
            <label className="jd-label" htmlFor="rows">Filas</label>
            <p className="jd-hint">Alto del campo en celdas</p>
            <input
              className="jd-input"
              type="number"
              id="rows"
              min="1"
              value={rows}
              onChange={(e) => onChange({ rows: e.target.value })}
              required
            />
          </div>

          <div className="terrain-field">
            <label className="jd-label" htmlFor="columns">Columnas</label>
            <p className="jd-hint">Ancho del campo en celdas</p>
            <input
              className="jd-input"
              type="number"
              id="columns"
              min="1"
              value={columns}
              onChange={(e) => onChange({ columns: e.target.value })}
              required
            />
          </div>

          <div className="terrain-field">
            <label className="terrain-checkbox" htmlFor="obstacles">
              <input
                type="checkbox"
                id="obstacles"
                checked={hasObstacles}
                onChange={(e) => onChange({ hasObstacles: e.target.checked })}
              />
              Incluir obstáculos o zonas restringidas
            </label>
            <p className="jd-hint">Se modelarán áreas de exclusión en el terreno</p>

            {hasObstacles && (
              <div className="terrain-pct">
                <label className="jd-label" htmlFor="obstaclePct">Un </label>
                <input
                  className="jd-input"
                  type="number"
                  id="obstaclePct"
                  min="0"
                  max="100"
                  value={obstaclePct}
                  onChange={(e) => onChange({ obstaclePct: e.target.value })}
                />
                <span className="terrain-pct-symbol">%</span>
              </div>
            )}
          </div>

        </div>

        {/* Preview */}
        <div className="terrain-preview">
          <h2>Vista previa del terreno</h2>

          <div className="terrain-map">
            {hasSize ? (
              // Columns are the width of the field, rows its height.
              <div
                className={`terrain-plot${showGrid ? ' has-grid' : ''}`}
                style={{
                  '--cols': c,
                  '--rows': r,
                  '--cell-w': `${100 / c}%`,
                  '--cell-h': `${100 / r}%`,
                }}
              >
                {obstacles.map((o) => (
                  <span
                    key={o.id}
                    className="terrain-obstacle"
                    style={{
                      left: `${o.left}%`,
                      top: `${o.top}%`,
                      width: `${o.width}%`,
                      height: `${o.height}%`,
                    }}
                  />
                ))}
              </div>
            ) : (
              <p className="terrain-map-empty">
                Define filas y columnas para ver el terreno
              </p>
            )}
          </div>

          <p className="terrain-caption">
            {hasSize
              ? `${c} × ${r} celdas · ${c * r} en total`
              : 'Sin dimensiones'}
            {pct > 0 && ` · ${pct} % restringido`}
          </p>

          {pct > 0 && (
            <div className="terrain-legend">
              <span className="terrain-legend-item">
                <span className="terrain-swatch terrain-swatch-soil" /> Cultivable
              </span>
              <span className="terrain-legend-item">
                <span className="terrain-swatch terrain-swatch-bush" /> Restringido
                <em>(distribución ilustrativa)</em>
              </span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default Terrain;
