import React, { useState } from 'react'
import Fleet from './Simulation/Fleet.jsx';
import Resume from './Simulation/Resume.jsx';
import Terrain from './Simulation/Terrain.jsx';
import StepsSimulation from './Simulation/StepsSimulation.jsx';
import Viewer from './Simulation/Viewer.jsx';
import './Simulation.css';
import FarmChat from './Simulation/FarmChat.jsx';

function Simulation() {

    const [current_index, setCurrentIndex] = useState(0);
    const steps = ["terrain", "fleet", "resume"];
    const step = steps[current_index];
    const [completed, setCompleted] = useState(false);

    const handleNext = () => {
        if (current_index < steps.length - 1) {
            setCurrentIndex(current_index+1);
        } else {
            setCompleted(true);
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

    // `harvesters` / `tractors` are the only fields the simulation start reads,
    // in either mode. The rest describe how the numbers were arrived at:
    // `budget` is the operating budget typed in "Ayúdame a elegir" (digits
    // only), `selectedProfile` the server profile the user picked and
    // `recommendationRequestId` the request it came from.
    const [fleetData, setFleetData] = useState({
        mode: 'manual',        // 'manual' | 'recommended'
        harvesters: 3,
        tractors: 2,
        budget: '',
        selectedProfile: null,
        recommendationRequestId: null,
    });

    const updateTerrain = (patch) => {
        setTerrainData((prev) => ({ ...prev, ...patch }));
        // A recommended fleet belongs to the exact terrain that was analysed.
        // Changing that terrain removes permission to continue until the user
        // requests and accepts a fresh recommendation.
        setFleetData((prev) => prev.mode === 'recommended'
            ? { ...prev, selectedProfile: null, recommendationRequestId: null }
            : prev
        );
    };
    const updateFleet = (patch) => setFleetData((prev) => ({ ...prev, ...patch }));

    // Both modes converge on the same two numbers: a recommendation is applied
    // into `fleetData` when the user accepts it, so Resume and Viewer read one
    // shape and never need to know which mode produced it.
    const effectiveFleet = fleetData;
    const recommendationSelected = fleetData.mode !== 'recommended' || Boolean(
        fleetData.selectedProfile && fleetData.recommendationRequestId
    );
    const nextDisabled = step === 'fleet' && !recommendationSelected;

  return (
    <div className="simulation-page">
    <FarmChat />
    
    {/* The viewer is mounted only once the wizard is done. Keeping it alive
        behind `display: none` also keeps the Unity runtime alive, and Unity
        installs its keyboard handlers on the document: with the build loaded,
        it swallows every keystroke and no field on the wizard accepts text. */}
    {completed &&
        <div className="visualization-page">
            <Viewer terrain={terrainData} fleet={effectiveFleet}/>
        </div>
    }

    {!completed &&
        <div className="simulation-wizard">
            <StepsSimulation s={current_index}/>
        

            <div className="simulation-step">
                { step == "terrain" && <Terrain data={terrainData} onChange={updateTerrain}/> }
                { step == "fleet" && <Fleet data={fleetData} onChange={updateFleet} terrain={terrainData}/> }
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

                <button
                    className="jd-button"
                    onClick={handleNext}
                    disabled={nextDisabled}
                >
                    {current_index < steps.length -1 ? "Siguiente" : "Simular"}
                </button>
            </div>
        </div>
    }
    </div>
  );
}

export default Simulation;
