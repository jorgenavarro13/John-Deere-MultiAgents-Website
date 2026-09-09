import React from 'react'
import './StepsSimulation.css'

// Display labels only. The identifiers below drive the wizard logic and must
// stay in sync with the `steps` array in Simulation.jsx.
const STEP_LABELS = {
    terrain: 'Terreno',
    fleet: 'Equipo',
    resume: 'Resumen',
};

function StepsSimulation({s}) {

    const steps = ["terrain", "fleet", "resume"];

  return (
    <div>
        <ol className ="steps-container" >

            {steps.map((step, i) => (
                <li
                    key={step}
                    className={`step-box ${step === steps[s] ? 'active' : ''} ${i < s ? 'done' : ''}`}
                >
                    <span className="step-marker">{i + 1}</span>
                    <span className="step-label">{STEP_LABELS[step]}</span>
                </li>
            ))}
        </ol>
    </div>
  );
}

export default StepsSimulation;
