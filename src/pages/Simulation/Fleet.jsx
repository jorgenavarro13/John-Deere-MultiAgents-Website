import React from 'react'
import './Fleet.css'

// Rough cost per unit, used only to derive a recommendation from the budget.
const HARVESTER_COST = 300000;
const TRACTOR_COST = 80000;

// Shared so the parent (Simulation.jsx) can compute the effective fleet
// for the Resume step. This is going to be changed later for the formula.
export function recommendFleet(budget) {
  const b = Number(budget) || 0;
  const harvesters = Math.floor(b / HARVESTER_COST);
  const tractors = Math.floor((b - harvesters * HARVESTER_COST) / TRACTOR_COST);
  return { harvesters, tractors };
}

// Controlled component: state lives in the parent (Simulation.jsx).
// `data` holds { mode, harvesters, tractors, budget }.
// `onChange` receives a patch object, e.g. onChange({ mode: 'budget' }).
function Fleet({ data, onChange }) {

  const { mode, harvesters, tractors, budget } = data;
  const isBudget = mode === 'budget';

  const rec = recommendFleet(budget);
  const shownHarvesters = isBudget ? rec.harvesters : harvesters;
  const shownTractors = isBudget ? rec.tractors : tractors;

  return (
    <div className="fleet-container">
      <h1>Configuración de equipo</h1>

      {/* Mode selector */}
      <div className="fleet-modes">
        <button
          type="button"
          onClick={() => onChange({ mode: 'manual' })}
          className={`fleet-mode${mode === 'manual' ? ' is-active' : ''}`}
        >
          <h3>Ya cuento con el equipo</h3>
          <p>Selecciona manualmente la cantidad de cosechadoras y tractores.</p>
        </button>

        <button
          type="button"
          onClick={() => onChange({ mode: 'budget' })}
          className={`fleet-mode${isBudget ? ' is-active' : ''}`}
        >
          <h3>Obtener recomendación</h3>
          <p>Ingresa el dinero disponible y calculamos el equipo recomendado.</p>
        </button>
      </div>

      {/* Budget input (only in recommendation mode) */}
      {isBudget && (
        <div className="fleet-field">
          <label className="jd-label" htmlFor="budget">Dinero disponible</label>
          <div className="fleet-money">
            <span className="fleet-money-symbol">$</span>
            <input
              className="jd-input"
              type="number"
              id="budget"
              min="0"
              value={budget}
              onChange={(e) => onChange({ budget: e.target.value })}
            />
          </div>
        </div>
      )}

      {/* Harvesters */}
      <div className="fleet-field">
        <label className="jd-label" htmlFor="harvesters">Cosechadoras</label>
        <input
          className="jd-input"
          type="number"
          id="harvesters"
          min="0"
          value={shownHarvesters}
          onChange={(e) => onChange({ harvesters: e.target.value })}
          disabled={isBudget}
        />
        {isBudget && <p className="fleet-note">Calculado a partir del presupuesto.</p>}
      </div>

      {/* Tractores */}
      <div className="fleet-field">
        <label className="jd-label" htmlFor="tractors">Tractores</label>
        <input
          className="jd-input"
          type="number"
          id="tractors"
          min="0"
          value={shownTractors}
          onChange={(e) => onChange({ tractors: e.target.value })}
          disabled={isBudget}
        />
        {isBudget && <p className="fleet-note">Calculado a partir del presupuesto.</p>}
      </div>

    </div>
  );
}

export default Fleet;
