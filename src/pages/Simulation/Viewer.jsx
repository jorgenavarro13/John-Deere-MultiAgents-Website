import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Unity, useUnityContext } from 'react-unity-webgl';
import Graphics from './Graphics.jsx';
import useSimulationStream from './useSimulationStream.js';
import { sendCommand, sendConfig } from './api.js';
import './Viewer.css';

import buildConfig from './buildConfig.js';

// Phases
function phaseOf(state) {
  if (!state || !state.ready) return 'cold';
  if (state.finished) return 'finished';
  if (state.status === 'paused') return 'paused';
  return 'running';
}

function humanError(e) {
  if (e instanceof TypeError) return 'No se pudo contactar con el servidor de simulación.';
  return e.message || 'La petición falló.';
}

const PHASE_LABEL = { running: 'En marcha', paused: 'En pausa', finished: 'Finalizada' };

function transportLabel({ status, queued, phase, state }) {
  if (status === 'offline') return 'Servidor no disponible';
  if (status === 'connecting') return 'Conectando…';
  if (queued) return 'Construyendo campo…';
  if (phase === 'cold') return 'Sin simulación';
  return `${PHASE_LABEL[phase]} · tick ${state.tick}`;
}

// A new campaign needs a fresh scene: this Unity build keeps objects whose
// IDs disappear from snapshots. Unmounting Unity releases the previous runtime.
function UnityScene() {
  const BASE_URL = import.meta.env.VITE_GAME_URL;
  const { unityProvider, isLoaded, loadingProgression } = useUnityContext({
    loaderUrl:    `${BASE_URL}/WebDevelopmentTest3.loader.js`,
    dataUrl:      `${BASE_URL}/WebDevelopmentTest3.data`,
    frameworkUrl: `${BASE_URL}/WebDevelopmentTest3.framework.js`,
    codeUrl:      `${BASE_URL}/WebDevelopmentTest3.wasm`,
  });
  const loadingPct = Math.round(loadingProgression * 100);

  return <>
    {!isLoaded && <div className="viewer-loading">
      <div className="viewer-loading-bar"><span style={{ width: `${loadingPct}%` }} /></div>
      <p>Cargando simulación… {loadingPct}%</p>
    </div>}
    <Unity unityProvider={unityProvider} className="viewer-unity" tabIndex={0} />
  </>;
}

function Viewer({ terrain, fleet, onNewSimulation }) {
  const [view, setView] = useState('simulation'); // 'simulation' | 'graphics'
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [queued, setQueued] = useState(false);
  const rebuildBaseline = useRef(null);
  const rebuildSentAt = useRef(0);

  const { state, status } = useSimulationStream();
  const phase = phaseOf(state);

  const config = useMemo(() => buildConfig(terrain, fleet), [terrain, fleet]);

  // Start / cold reset
  useEffect(() => {
    if (!queued) return undefined;
    if (state?.ready && state.runId !== rebuildBaseline.current) {
      setQueued(false);
      return undefined;
    }
    const wait = Math.max(500, 8000 - (Date.now() - rebuildSentAt.current));
    const t = setTimeout(() => {
      setQueued(false);
      setError('El servidor no aplicó la configuración. Revisa el registro del servidor.');
    }, wait);
    return () => clearTimeout(t);
  }, [queued, state]);

  async function call(fn, { rebuild = false } = {}) {
    setBusy(true);
    setError(null);
    try {
      if (rebuild) {
        rebuildBaseline.current = state?.runId ?? null;
        rebuildSentAt.current = Date.now();
        setQueued(true);
      }
      await fn();
    } catch (e) {
      setError(humanError(e));
      setQueued(false);
    } finally {
      setBusy(false);
    }
  }

  // Start / Continue
  const onStart = () => {
    if (phase === 'paused') return call(() => sendCommand('continue'));
    return call(() => sendConfig(config), { rebuild: true });
  };
  const onStop = () => call(() => sendCommand('pause'));
  const onReset = () => call(() => sendCommand('reset'), { rebuild: true });

  const startLabel = phase === 'paused' ? 'Continuar' : 'Iniciar simulación';

  return (
    <div className="viewer">
      <header className="viewer-header">
        <h1>Simulación</h1>

        <div className="viewer-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={view === 'simulation'}
            className={`viewer-tab ${view === 'simulation' ? 'is-active' : ''}`}
            onClick={() => setView('simulation')}
          >
            Simulación
          </button>
          <button
            role="tab"
            aria-selected={view === 'graphics'}
            className={`viewer-tab ${view === 'graphics' ? 'is-active' : ''}`}
            onClick={() => setView('graphics')}
          >
            Gráficas
          </button>
        </div>
      </header>

      <div className="viewer-transport">
        <button className="jd-button" onClick={onStart} disabled={busy || phase === 'running'}>
          {startLabel}
        </button>
        <button
          className="jd-button jd-button-secondary"
          onClick={onStop}
          disabled={busy || phase !== 'running'}
        >
          Detener
        </button>

        <button
          className="jd-button jd-button-secondary"
          onClick={onReset}
          disabled={busy || phase === 'cold'}
        >
          Reiniciar
        </button>

        <span className="viewer-transport-state">
          {transportLabel({ status, queued, phase, state })}
        </span>
        <button className="jd-button viewer-new-simulation" onClick={onNewSimulation}>
          Iniciar nueva simulación
        </button>
      </div>
      {error && <p className="viewer-transport-error">{error}</p>}

      <div className="viewer-panel" hidden={view !== 'simulation'}>
        <div className="viewer-stage">
          
          <UnityScene key={state?.runId ?? 'waiting'} />


        </div>
      </div>

      <div className="viewer-panel" hidden={view !== 'graphics'}>
        <Graphics state={state} status={status} />
      </div>
    </div>
  );
}

export default Viewer;
