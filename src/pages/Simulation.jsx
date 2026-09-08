import React, { useState } from 'react'
import Fleet, { recommendFleet } from './Simulation/Fleet.jsx';
import Resume from './Simulation/Resume.jsx';
import Terrain from './Simulation/Terrain.jsx';
import StepsSimulation from './Simulation/StepsSimulation.jsx';
import './Simulation.css';

function Simulation() {

    const [current_index, setCurrentIndex] = useState(0);
    const steps = ["terrain", "fleet", "resume"];
    const step = steps[current_index];

    const handleNext = () => {
        if (current_index < steps.length - 1) {
            setCurrentIndex(current_index+1);
        } else {
            console.log("Siguiente");
        }
    };

    // Goes back to the previous step so the user can correct a configuration
    // already entered. The wizard state is kept, so the fields stay filled.
    const handleBack = () => {
        if (current_index > 0) {
            setCurrentIndex(current_index - 1);
        }
    };

    // Shared state for the whole wizard. Every step reads/writes here,
    // so Resume can show the final selection.
    const [terrainData, setTerrainData] = useState({
        rows: 10,
        columns: 10,
        hasObstacles: false,
        obstaclePct: 5,
    });

    const [fleetData, setFleetData] = useState({
        mode: 'manual',        // 'manual' | 'budget'
        harvesters: 3,
        tractors: 2,
        budget: 1000000,
    });

    const updateTerrain = (patch) => setTerrainData((prev) => ({ ...prev, ...patch }));
    const updateFleet = (patch) => setFleetData((prev) => ({ ...prev, ...patch }));

    // When the user asked for a recommendation, the effective numbers come
    // from the budget instead of the manual inputs.
    const effectiveFleet = fleetData.mode === 'budget'
        ? { ...fleetData, ...recommendFleet(fleetData.budget) }
        : fleetData;

  return (
    <div className="simulation-page">
        <StepsSimulation s={current_index}/>

        <div className="simulation-step">
            { step == "terrain" && <Terrain data={terrainData} onChange={updateTerrain}/> }
            { step == "fleet" && <Fleet data={fleetData} onChange={updateFleet}/> }
            { step == "resume" && <Resume terrain={terrainData} fleet={effectiveFleet}/> }
        </div>

        <div className="simulation-actions">
            <button
                className="jd-button jd-button-secondary"
                onClick={handleBack}
                disabled={current_index === 0}
            >
                <span aria-hidden="true">←</span> Atrás
            </button>

            <button className="jd-button" onClick={handleNext}>{current_index < steps.length -1 ? "Siguiente" : "Simular"}</button>
        </div>
    </div>
  );
}

export default Simulation;
