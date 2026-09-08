import React, { useState } from 'react'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';



function Terrain({rows, columns, harvesters, carts}) {

  const [rowsTerrain, setRowsTerrain] = useState(rows);
  const [columnsTerrain, setColumnsTerrain] = useState(columns);


  return (
    <div className="terrain-container">
      <h1>Terrain</h1>   


      <div >
            <label>Rows: </label>
            <input
              type="number"
              id="rows"
              value={rowsTerrain}
              onChange={(e) => setRowsTerrain(e.target.value)}
              placeholder="Insert the number of rows"
              required
            />
      </div>

      <div >
            <label>Columns: </label>
            <input
              type="number"
              id="columns"
              value={columnsTerrain}
              onChange={(e) => setColumnsTerrain(e.target.value)}
              placeholder="Insert the number of columns"
              required
            />
      </div>

    </div>     
  );
}

export default Terrain;
