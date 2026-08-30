import React, { useState } from 'react'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './Game.css'

function Game() {
    return (
        <div>
            <h1>Hola</h1>
            <div>
                <video width="640" height="360" controls>
                    <source src="/public/video/Demo.mp4" type="video/mp4"></source>
                </video>
            </div>
        </div>
    );
}

export default Game;