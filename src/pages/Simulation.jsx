import React, { useState } from 'react'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Fleet from './Simulation/Fleet.jsx';
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

    const rows = 10;
    const columns = 10;

    const harvesters = 1;
    const carts = 0;



  return (
    <div >
        <StepsSimulation/>
        { step == "terrain" &&<Terrain/>}
        { step == "fleet" &&<Fleet/>}
        { step == "resume" &&<Resume/>}
        <button onClick={handleNext}>{current_index < steps.length -1 ? "NEXT" : "SIMULATE"}</button>
    </div>
  );
}

export default Simulation;
