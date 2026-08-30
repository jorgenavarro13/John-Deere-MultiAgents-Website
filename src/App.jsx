import { useState } from 'react'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css'
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import Game from './pages/Game.jsx';


function App() {

  return (
    <div className="app-container">
      <Router >
        <Navbar  />

        <div >
          <Routes>

            <Route 
              path="/" element={<Home />} 
            />

            <Route
              path="/game" element={<Game />}
            />

          </Routes>
        </div>

        <Footer/>
      </Router>
    </div>
  );
}

export default App;
