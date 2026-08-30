import { useState } from 'react'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css'
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';


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

          </Routes>
        </div>

        <Footer/>
      </Router>
    </div>
  );
}

export default App;
