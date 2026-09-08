import React, { useState } from 'react'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './Home.css'
import {demo1} from '../assets/index.js';


function Home() {

  return (
    <div className="home-container">
        <br />
     <h1 class="text-4xl font-bold">John Deere MultiAgentes</h1>
        <br />

     <div>
        <video className="video-demo" controls>
            <source src={demo1} type="video/mp4"></source>
        </video>
        
     </div>
    </div>
  );
}

export default Home;
