import React, {useEffect, useState} from 'react';
import './Navbar.css';


function Navbar() {

    const [isMenuOpen, setIsMenuOpen] = useState(false); 
  
    const toggleMenu = () =>{
        setIsMenuOpen (!isMenuOpen);
    }
  return (
    <nav >
      <div className="navbar-container">
        <div className="left-container"> 
            <div className="green-rectangle"></div>
            <div className="yellow-rectangle"></div>
        </div> 
        <img 
            src="/public/deere-logo-agriculture.svg" 
            alt="John Deere Logo" 
          />
        
        <div className="menu-icon" onClick={toggleMenu}>
        {isMenuOpen ? "x" : "☰"}
        </div>        

      </div>
    </nav>
  );
}

export default Navbar;