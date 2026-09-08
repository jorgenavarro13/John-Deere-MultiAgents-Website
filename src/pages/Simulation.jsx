import React, { useState } from 'react'
import Fleet, { recommendFleet } from './Simulation/Fleet.jsx';
import Resume from './Simulation/Resume.jsx';
import Terrain from './Simulation/Terrain.jsx';
import StepsSimulation from './Simulation/StepsSimulation.jsx';

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
    <div >
        <StepsSimulation s={current_index}/>

        { step == "terrain" && <Terrain data={terrainData} onChange={updateTerrain}/> }
        { step == "fleet" && <Fleet data={fleetData} onChange={updateFleet}/> }
        { step == "resume" && <Resume terrain={terrainData} fleet={effectiveFleet}/> }

        <button onClick={handleNext}>{current_index < steps.length -1 ? "NEXT" : "SIMULATE"}</button>
    </div>
  );
}

export default Simulation;
