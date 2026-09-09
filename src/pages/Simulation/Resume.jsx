import React from 'react'
import './Resume.css'

// Reads the values collected in the previous steps. They come from the
// shared state in Simulation.jsx via the `terrain` and `fleet` props.
function Resume({ terrain, fleet }) {

  return (
    <div className="resume-container">
      <h1>Resumen de la simulación</h1>

      <div className="resume-cards">

        <div className="resume-card">
          <h2>Terreno</h2>
          <ul className="resume-list">
            <li>Filas <span className="resume-value">{terrain.rows}</span></li>
            <li>Columnas <span className="resume-value">{terrain.columns}</span></li>
            <li>
              Obstáculos{' '}
              <span className="resume-value">
                {terrain.hasObstacles ? `Sí (${terrain.obstaclePct}%)` : 'No'}
              </span>
            </li>
          </ul>
        </div>

        <div className="resume-card">
          <h2>Equipo</h2>
          <ul className="resume-list">
            <li>
              Modo{' '}
              <span className="resume-value">
                {fleet.mode === 'budget'
                  ? 'Obtener recomendación'
                  : 'Ya cuento con el equipo'}
              </span>
            </li>
            {fleet.mode === 'budget' && (
              <li>Dinero disponible <span className="resume-value">{fleet.budget}</span></li>
            )}
            <li>Cosechadoras <span className="resume-value">{fleet.harvesters}</span></li>
            <li>Tractores <span className="resume-value">{fleet.tractors}</span></li>
          </ul>
        </div>

      </div>
    </div>
  );
}

export default Resume;
