import React from 'react'
import './Resume.css'
import { formatMoney } from './fleetRecommendation.js'

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
                {fleet.mode === 'recommended'
                  ? 'Ayúdame a elegir'
                  : 'Elegir manualmente'}
              </span>
            </li>
            {fleet.mode === 'recommended' && fleet.budget !== '' && (
              <li>
                Presupuesto disponible{' '}
                <span className="resume-value">{formatMoney(fleet.budget)}</span>
              </li>
            )}
            <li>Cosechadoras <span className="resume-value">{fleet.harvesters}</span></li>
            <li>Tractores de apoyo <span className="resume-value">{fleet.tractors}</span></li>
          </ul>
        </div>

      </div>
    </div>
  );
}

export default Resume;
