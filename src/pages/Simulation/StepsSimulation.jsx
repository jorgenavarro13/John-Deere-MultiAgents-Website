import React, { useState } from 'react'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './StepsSimulation.css'



function StepsSimulation({s}) {

    const steps = ["terrain", "fleet", "resume"];

  return (
    <div>
        <div className ="steps-container" >

            {steps.map((step) => (
                <div className={`step-box ${step === steps[s] ? 'active' : ''}`}>
                    <h1>{step}</h1>
                </div>
            ))}
        </div>
    </div>
  );
}

export default StepsSimulation;
