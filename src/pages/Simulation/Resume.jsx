import React from 'react'

// Reads the values collected in the previous steps. They come from the
// shared state in Simulation.jsx via the `terrain` and `fleet` props.
function Resume({ terrain, fleet }) {

  return (
    <div>
      <h1>Resume page</h1>

      <h2>Terreno</h2>
      <ul>
        <li>Filas: {terrain.rows}</li>
        <li>Columnas: {terrain.columns}</li>
        <li>
          Obstáculos:{' '}
          {terrain.hasObstacles ? `Sí (${terrain.obstaclePct}%)` : 'No'}
        </li>
      </ul>

      <h2>Equipo</h2>
      <ul>
        <li>
          Modo:{' '}
          {fleet.mode === 'budget'
            ? 'Obtener recomendación'
            : 'Ya cuento con el equipo'}
        </li>
        {fleet.mode === 'budget' && <li>Dinero disponible: {fleet.budget}</li>}
        <li>Harvesters: {fleet.harvesters}</li>
        <li>Tractores: {fleet.tractors}</li>
      </ul>
    </div>
  );
}

export default Resume;
