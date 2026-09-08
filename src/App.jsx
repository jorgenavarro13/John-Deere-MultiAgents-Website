import { useState } from 'react'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css'
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import Simulation from './pages/Simulation.jsx';


function App() {
        const urlCompleta = window.location.href;
        const rutaLimpia = window.location.pathname;

        // 2. Imprimir los valores en la consola del navegador (F12)
        console.log("URL Completa:", urlCompleta);
        console.log("Pathname:", rutaLimpia);

  return (
    <div className="app-container">
      <Router >
        <Navbar  />

        <div >
          <Routes>
          <Route
              path="/home" element={<Home />}
            />

          <Route
              path="/simulation" element={<Simulation />}
            />

          </Routes>
        </div>

        <Footer/>
      </Router>
    </div>
  );
}

export default App;
