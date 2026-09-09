import React, { useEffect, useMemo, useRef, useState } from 'react';
import LineChart from './LineChart.jsx';
import BarChart from './BarChart.jsx';
import StackedBars from './StackedBars.jsx';
import FieldMap from './FieldMap.jsx';
import usePoll from './usePoll.js';
import { fetchHistory, fetchField, fetchRuns } from './api.js';
import './Graphics.css';

const MAX_POINTS = 600; // ~1 min of ticks at the default 0.1s pace

const C = {
  green: '#7ab648',
  greenDark: '#2f5d24',
  yellow: '#e5b955',
  blue: '#5a8fb0',
  orange: '#c9803e',
  red: '#8a2a2a',
  grey: '#9aa0a6',
};

// Fold one /api/state payload into a history-sample-shaped row.
function sampleFromState(s) {
  const k = s.kpi || {};
  const m = s.metrics || {};
  return {
    tick: s.tick,
    utilization: k.utilization,
    fieldComplete: k.fieldComplete,
    cropLeft: k.cropLeft,
    fuelPerUnit: k.fuelPerUnit,
    openRequests: k.openRequests,
    harvested: m.harvested,
    delivered: m.delivered,
    inTransit: m.inTransit,
    stranded: m.stranded,
    fuel: m.fuel,
    co2: m.co2,
    collisions: m.collisions,
    trafficRefusals: m.trafficRefusals,
  };
}

const seriesOf = (samples, pick) => samples.map((s) => ({ x: s.tick, y: pick(s) ?? 0 }));

function Graphics({ state, status }) {
  const [samples, setSamples] = useState([]);
  const [runId, setRunId] = useState(null);
  const [runsMetric, setRunsMetric] = useState('utilization');
  const runIdRef = useRef(null);

  // 1. Backfill the timelines from the history buffer on mount.
  useEffect(() => {
    let cancelled = false;
    fetchHistory(-1)
      .then((h) => {
        if (cancelled) return;
        runIdRef.current = h.runId;
        setRunId(h.runId);
        setSamples(h.samples.slice(-MAX_POINTS));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Append each tick from the shared stream.
  useEffect(() => {
    if (!state || !state.ready || !state.kpi) return;
    if (state.runId !== runIdRef.current) {
      runIdRef.current = state.runId;
      setRunId(state.runId);
      setSamples([sampleFromState(state)]);
      return;
    }
    setSamples((prev) => {
      if (prev.length && prev[prev.length - 1].tick === state.tick) return prev;
      const next = [...prev, sampleFromState(state)];
      return next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next;
    });
  }, [state]);

  // 3. Low-rate polls for the heavier payloads.
  const field = usePoll(fetchField, 2000, String(runId ?? ''));
  const runsData = usePoll(fetchRuns, 5000);

  const series = useMemo(() => {
    const cropMax = Math.max(...samples.map((s) => s.cropLeft ?? 0), 1);
    return {
      utilization: seriesOf(samples, (s) => s.utilization),
      progress: samples.map((s) => ({
        x: s.tick,
        y: s.fieldComplete != null ? s.fieldComplete : 1 - (s.cropLeft ?? 0) / cropMax,
      })),
      harvested: seriesOf(samples, (s) => s.harvested),
      delivered: seriesOf(samples, (s) => s.delivered),
      inTransit: seriesOf(samples, (s) => s.inTransit),
      stranded: seriesOf(samples, (s) => s.stranded),
      efficiency: samples.map((s) => ({
        x: s.tick,
        y: s.fuelPerUnit != null ? s.fuelPerUnit : (s.fuel ?? 0) / Math.max(1, s.delivered ?? 0),
      })),
      openRequests: seriesOf(samples, (s) => s.openRequests),
      trafficRefusals: seriesOf(samples, (s) => s.trafficRefusals),
      collisions: seriesOf(samples, (s) => s.collisions),
    };
  }, [samples]);

  // Live per-machine snapshots straight off the stream.
  const harvesters = state?.harvesters || [];
  const carts = state?.carts || [];
  const reqThreshold = state?.policy?.requestThreshold ?? 0.5;

  const tankBars = harvesters.map((h) => {
    const pct = h.tankPct ?? h.load / h.capacity;
    return {
      label: h.id,
      value: h.load,
      color: pct >= reqThreshold ? C.orange : C.green,
      sub: `${Math.round(pct * 100)}%`,
    };
  });
  const tankCapacity = Math.max(...harvesters.map((h) => h.capacity || 0), 1);

  const cartBars = carts.map((c) => ({
    label: c.id,
    value: c.load,
    color: C.blue,
    sub: `${Math.round((c.loadPct ?? c.load / c.capacity) * 100)}%`,
  }));
  const cartCapacity = Math.max(...carts.map((c) => c.capacity || 0), 1);

  const fuelBars = [
    ...harvesters.map((h) => ({ label: h.id, value: h.fuel ?? 0, color: C.green })),
    ...carts.map((c) => ({ label: c.id, value: c.fuel ?? 0, color: C.blue })),
  ];

  const stateRows = Object.entries(state?.stateHistogram || {}).map(([label, states]) => ({
    label,
    states,
  }));

  const runs = runsData?.runs || [];
  const runBars = runs.map((r) => ({
    label: `#${r.runId}`,
    value:
      runsMetric === 'utilization'
        ? (r.utilization ?? 0) * 100
        : runsMetric === 'fuelPerUnit'
        ? r.fuelPerUnit ?? 0
        : r.harvested ?? 0,
    color: r.live ? C.yellow : C.green,
    sub: r.live ? 'en vivo' : `${r.ticks}t`,
  }));
  const runFormat =
    runsMetric === 'utilization'
      ? (v) => `${Math.round(v)}%`
      : runsMetric === 'fuelPerUnit'
      ? (v) => v.toFixed(2)
      : (v) => `${Math.round(v)}`;

  const util = series.utilization.length
    ? series.utilization[series.utilization.length - 1].y
    : null;
  const prog = series.progress.length ? series.progress[series.progress.length - 1].y : null;

  return (
    <div className="graphics">
      <header className="graphics-header">
        <div>
          <h1>Gráficas</h1>
          <p className="graphics-sub">Datos en vivo del servidor de simulación</p>
        </div>
        <span className={`graphics-status graphics-status--${status}`}>
          {status === 'live' && `En vivo · run ${runId ?? '—'}`}
          {status === 'connecting' && 'Conectando…'}
          {status === 'offline' && 'Servidor no disponible'}
        </span>
      </header>

      <div className="graphics-grid">
        <section className="chart-card">
          <div className="chart-card-head">
            <h2>Utilización de la flota</h2>
            <span className="chart-metric">{util == null ? '—' : `${Math.round(util * 100)}%`}</span>
          </div>
          <p className="chart-caption">Proporción de la flota trabajando (1 − ratio de inactividad).</p>
          <LineChart points={series.utilization} yMin={0} yMax={1} formatY={(v) => `${Math.round(v * 100)}%`} />
        </section>

        <section className="chart-card">
          <div className="chart-card-head">
            <h2>Progreso de cosecha</h2>
            <span className="chart-metric">{prog == null ? '—' : `${Math.round(prog * 100)}%`}</span>
          </div>
          <p className="chart-caption">Fracción del cultivo en pie ya cosechada.</p>
          <LineChart
            points={series.progress}
            color={C.greenDark}
            yMin={0}
            yMax={1}
            formatY={(v) => `${Math.round(v * 100)}%`}
          />
        </section>

        <section className="chart-card chart-card--wide">
          <div className="chart-card-head">
            <h2>Flujo de grano</h2>
          </div>
          <p className="chart-caption">Unidades cosechadas, entregadas, en tránsito y varadas.</p>
          <LineChart
            series={[
              { label: 'Cosechado', color: C.greenDark, points: series.harvested },
              { label: 'Entregado', color: C.green, points: series.delivered },
              { label: 'En tránsito', color: C.yellow, points: series.inTransit },
              { label: 'Varado', color: C.red, points: series.stranded },
            ]}
            formatY={(v) => `${Math.round(v)}`}
          />
        </section>

        <section className="chart-card">
          <div className="chart-card-head">
            <h2>Eficiencia de combustible</h2>
            <span className="chart-metric">
              {series.efficiency.length
                ? `${series.efficiency[series.efficiency.length - 1].y.toFixed(2)} L/u`
                : '—'}
            </span>
          </div>
          <p className="chart-caption">Litros quemados por unidad de grano entregada.</p>
          <LineChart points={series.efficiency} color={C.orange} yMin={0} formatY={(v) => v.toFixed(1)} />
        </section>

        <section className="chart-card">
          <div className="chart-card-head">
            <h2>Combustible acumulado por máquina</h2>
          </div>
          <p className="chart-caption">Litros quemados por cada cosechadora y tractor.</p>
          <BarChart bars={fuelBars} formatValue={(v) => `${Math.round(v)} L`} />
        </section>

        <section className="chart-card">
          <div className="chart-card-head">
            <h2>Nivel de los tanques</h2>
          </div>
          <p className="chart-caption">Grano a bordo de cada cosechadora. Naranja: pide tractor.</p>
          <BarChart
            bars={tankBars}
            max={tankCapacity}
            threshold={{ value: reqThreshold * tankCapacity, label: 'pide tractor' }}
            formatValue={(v) => Math.round(v)}
          />
        </section>

        <section className="chart-card">
          <div className="chart-card-head">
            <h2>Carga de los tractores</h2>
          </div>
          <p className="chart-caption">Grano a bordo de cada tractor de descarga.</p>
          <BarChart bars={cartBars} max={cartCapacity} formatValue={(v) => Math.round(v)} />
        </section>

        <section className="chart-card chart-card--wide">
          <div className="chart-card-head">
            <h2>Tiempo en cada estado</h2>
          </div>
          <p className="chart-caption">Reparto de ticks por estado, por máquina.</p>
          <StackedBars rows={stateRows} />
        </section>

        <section className="chart-card">
          <div className="chart-card-head">
            <h2>Cuellos de botella logísticos</h2>
          </div>
          <p className="chart-caption">Solicitudes abiertas, rechazos de tráfico y colisiones.</p>
          <LineChart
            series={[
              { label: 'Solicitudes', color: C.blue, points: series.openRequests },
              { label: 'Rechazos tráfico', color: C.orange, points: series.trafficRefusals },
              { label: 'Colisiones', color: C.red, points: series.collisions },
            ]}
            yMin={0}
            formatY={(v) => `${Math.round(v)}`}
          />
        </section>

        <section className="chart-card chart-card--wide">
          <div className="chart-card-head">
            <h2>Mapa del campo</h2>
            <span className="chart-metric-small">
              {field?.ready ? `tick ${field.tick}` : ''}
            </span>
          </div>
          <p className="chart-caption">
            Verde: cultivo en pie · marrón: cosechado · gris: roca · ● cosechadora · ▪ tractor.
          </p>
          <FieldMap field={field} />
        </section>

        <section className="chart-card chart-card--wide">
          <div className="chart-card-head">
            <h2>Comparación de corridas</h2>
            <select
              className="jd-input chart-select"
              value={runsMetric}
              onChange={(e) => setRunsMetric(e.target.value)}
            >
              <option value="utilization">Utilización</option>
              <option value="fuelPerUnit">L / unidad</option>
              <option value="harvested">Cosechado</option>
            </select>
          </div>
          <p className="chart-caption">Una barra por corrida desde que arrancó el servidor.</p>
          <BarChart bars={runBars} formatValue={runFormat} />
        </section>
      </div>

      {status === 'offline' && (
        <p className="graphics-hint">
          Inicia el servidor con <code>python3 Servidor/server.py --web-port 8080</code> y
          recarga esta vista.
        </p>
      )}
    </div>
  );
}

export default Graphics;
