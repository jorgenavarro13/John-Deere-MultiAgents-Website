import React from 'react'

// Controlled component: state lives in the parent (Simulation.jsx).
// `data` holds { rows, columns, hasObstacles, obstaclePct }.
// `onChange` receives a patch object, e.g. onChange({ rows: 5 }).
function Terrain({ data, onChange }) {

  const { rows, columns, hasObstacles, obstaclePct } = data;

  const r = Number(rows) || 0;
  const c = Number(columns) || 0;

  return (
    <div className="terrain-container">
      <h1>Terrain</h1>

      <div className="terrain-layout" style={{ display: 'flex', gap: '48px' }}>

        {/* Controls */}
        <div className="terrain-controls">

          <div>
            <label htmlFor="rows">Filas</label>
            <p>Alto del campo en celdas</p>
            <input
              type="number"
              id="rows"
              min="1"
              value={rows}
              onChange={(e) => onChange({ rows: e.target.value })}
              required
            />
          </div>

          <div>
            <label htmlFor="columns">Columnas</label>
            <p>Ancho del campo en celdas</p>
            <input
              type="number"
              id="columns"
              min="1"
              value={columns}
              onChange={(e) => onChange({ columns: e.target.value })}
              required
            />
          </div>

          <div>
            <label htmlFor="obstacles">
              <input
                type="checkbox"
                id="obstacles"
                checked={hasObstacles}
                onChange={(e) => onChange({ hasObstacles: e.target.checked })}
              />
              Incluir obstáculos o zonas restringidas
            </label>
            <p>Se modelarán áreas de exclusión en el terreno</p>

            {hasObstacles && (
              <div>
                <label htmlFor="obstaclePct">Un </label>
                <input
                  type="number"
                  id="obstaclePct"
                  min="0"
                  max="100"
                  value={obstaclePct}
                  onChange={(e) => onChange({ obstaclePct: e.target.value })}
                />
                <span>%</span>
              </div>
            )}
          </div>

        </div>

        {/* Preview */}
        <div className="terrain-preview">
          <h2>Vista previa del terreno</h2>
          <div
            className="terrain-preview-box"
            style={{
              background: '#d9d9d9',
              padding: '40px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: r * 5,
                height: c * 5,
                background: '#1e3d2b',
              }}
            />
          </div>
        </div>

      </div>
    </div>
  );
}

export default Terrain;
