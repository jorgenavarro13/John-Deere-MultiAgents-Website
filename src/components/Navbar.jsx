import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './Navbar.css';

function Navbar() {

    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    }

    const closeMenu = () => {
        setIsMenuOpen(false);
    }

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <ul className={`navbar-links ${isMenuOpen ? 'navbar-links-open' : ''}`}>
                    <li>
                        <NavLink
                            to="/"
                            end
                            onClick={closeMenu}
                            className={({ isActive }) => `navbar-link${isActive ? ' navbar-link-active' : ''}`}
                        >
                            Inicio
                        </NavLink>
                    </li>
                    <li><span className="navbar-link navbar-link-disabled">Acerca de</span></li>
                    <li><span className="navbar-link navbar-link-disabled">Contacto</span></li>
                </ul>

                <div className="navbar-badge">
                    <img
                        src="/john-deere.svg"
                        alt="John Deere"
                        className="navbar-badge-icon"
                    />
                    <div className="navbar-badge-text">
                        <span>En colaboración con</span>
                        <strong>JOHN DEERE</strong>
                    </div>
                </div>

                <button className="menu-icon" onClick={toggleMenu} aria-label="Abrir menú">
                    {isMenuOpen ? "✕" : "☰"}
                </button>
            </div>
        </nav>
    );
}

export default Navbar;
