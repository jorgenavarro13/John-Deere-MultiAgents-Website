// Configuration is sent to the simulation server as a JSON object
export default function buildConfig(terrain, fleet) {
  const rows = Math.max(1, Number(terrain.rows) || 1);
  const cols = Math.max(1, Number(terrain.columns) || 1);
  const pct = terrain.hasObstacles ? Math.min(100, Math.max(0, Number(terrain.obstaclePct) || 0)) : 0;
  const obstacles = pct > 0 ? Math.max(1, Math.round((rows * cols * pct) / 100)) : 0;

  return {
    rows,
    cols,
    harvesters: Math.max(1, Number(fleet.harvesters) || 1),
    carts: Math.max(1, Number(fleet.tractors) || 1),
    minObstacles: obstacles,
    maxObstacles: obstacles,
  };
}

