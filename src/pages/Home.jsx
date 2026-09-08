import React from 'react'
import { Link } from 'react-router-dom';
import { heroBg } from '../assets/index.js';
import './Home.css'

const heroStyle = {
  backgroundImage:
    `linear-gradient(100deg, rgba(10, 20, 15, 0.85) 0%, rgba(10, 20, 15, 0.55) 45%, rgba(10, 20, 15, 0.15) 100%), url(${heroBg})`,
};

function Home() {

  return (
    <div className="home-hero" style={heroStyle}>
      <div className="home-hero-content">
        <h1 className="home-title">
          Simula operaciones<br />
          <span className="home-title-accent">agrícolas.</span>
        </h1>

        <p className="home-description">
          Define el terreno y configura la maquinaria.
          La simulación multiagente representa la operación en el
          campo y permite evaluar rutas, tiempos, uso de recursos y costos estimados
          para comparar escenarios y tomar mejores decisiones de planificación.
        </p>

        <Link to="/simulation" className="home-cta">
          Iniciar simulación <span className="home-cta-arrow">→</span>
        </Link>
      </div>
    </div>
  );
}

export default Home;
