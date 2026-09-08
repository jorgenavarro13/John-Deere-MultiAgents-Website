import React, { useState } from 'react'

// Rough cost per unit, used only to derive a recommendation from the budget.
const HARVESTER_COST = 300000;
const TRACTOR_COST = 80000;

function Fleet() {

  // "manual" = user already has the equipment, "budget" = recommend from money available
  const [mode, setMode] = useState('manual');

  const [harvesters, setHarvesters] = useState(3);
  const [tractors, setTractors] = useState(2);
  const [budget, setBudget] = useState(1000000);

  const isBudget = mode === 'budget';

  // Recommendation: spend budget on harvesters first, rest on tractors.

  // This is going to be changed later for the formula
  const recHarvesters = Math.floor((Number(budget) || 0) / HARVESTER_COST);
  const recTractors = Math.floor(
    ((Number(budget) || 0) - recHarvesters * HARVESTER_COST) / TRACTOR_COST
  );

  const shownHarvesters = isBudget ? recHarvesters : harvesters;
  const shownTractors = isBudget ? recTractors : tractors;

  return (
    <div className="fleet-container">
      <h1>Configuración de equipo</h1>

      {/* Mode selector */}
      <div className="fleet-modes" style={{ display: 'flex', gap: '24px' }}>
        <button
          type="button"
          onClick={() => setMode('manual')}
          style={{ background: mode === 'manual' ? '#a9c9a4' : '#d9d9d9' }}
        >
          <h3>Ya cuento con el equipo</h3>
          <p>Selecciona manualmente la cantidad de cosechadoras y tractores.</p>
        </button>

        <button
          type="button"
          onClick={() => setMode('budget')}
          style={{ background: isBudget ? '#a9c9a4' : '#d9d9d9' }}
        >
          <h3>Obtener recomendación</h3>
          <p>Ingresa el dinero disponible y calculamos el equipo recomendado.</p>
        </button>
      </div>

      {/* Budget input (only in recommendation mode) */}
      {isBudget && (
        <div>
          <label htmlFor="budget">Dinero disponible</label>
          <br/>
          <input
            type="number"
            id="budget"
            min="0"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          />
        </div>
      )}

      {/* Harvesters */}
      <div>
        <label htmlFor="harvesters">Harvesters</label>
        <br/>
        <input
          type="number"
          id="harvesters"
          min="0"
          value={shownHarvesters}
          onChange={(e) => setHarvesters(e.target.value)}
          disabled={isBudget}
        />
      </div>

      {/* Tractores */}
      <div>
        <label htmlFor="tractors">Tractores</label>
        <br/>
        <input
          type="number"
          id="tractors"
          min="0"
          value={shownTractors}
          onChange={(e) => setTractors(e.target.value)}
          disabled={isBudget}
        />
      </div>

    </div>
  );
}

export default Fleet;
