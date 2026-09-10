import React, { useEffect, useRef, useState } from 'react'
import './Fleet.css'
import useFleetRecommendation from './useFleetRecommendation.js';
import {
  CURRENCY,
  findProfile,
  formatBudgetInput,
  formatDuration,
  formatFuel,
  formatMoney,
  parseBudgetInput,
} from './fleetRecommendation.js';

// Small, flat silhouettes so the two counts read at a glance. Decorative: the
// machine each number refers to is already named next to it in text.
function MachineIcon({ kind }) {
  return (
    <svg className="fleet-icon" viewBox="0 0 48 32" aria-hidden="true" focusable="false">
      {kind === 'harvester' ? (
        <>
          <path d="M4 20h9l3-9h13v9h15v6H4z" />
          <path d="M2 11h6v7H2z" opacity=".55" />
        </>
      ) : (
        <>
          <path d="M6 21h8l2-8h10v8h16v5H6z" />
          <rect x="26" y="8" width="18" height="9" rx="2" opacity=".55" />
        </>
      )}
      <circle cx="13" cy="27" r="4" />
      <circle cx="36" cy="27" r="4" />
    </svg>
  );
}

// Controlled component: state lives in the parent (Simulation.jsx).
// `data` holds { mode, harvesters, tractors, budget, selectedProfile,
// recommendationRequestId }; `onChange` receives a patch, e.g.
// onChange({ mode: 'manual' }). `terrain` is read-only here: it is what the
// recommendation is computed for, and editing it invalidates a result.
//
// The wizard has always called the support vehicles `tractors`; the server and
// every recommendation payload call them `carts`. The translation happens where
// the two meet — here, and in Viewer.buildConfig — and nowhere else.
function Fleet({ data, onChange, terrain }) {

  const { mode, harvesters, tractors, budget, selectedProfile } = data;
  const isRecommended = mode === 'recommended';

  const { phase, result, stale, requestId, run, cancel, reset } =
    useFleetRecommendation({ terrain, budget });

  const [showAlternatives, setShowAlternatives] = useState(false);
  const [editingBudget, setEditingBudget] = useState(false);
  const budgetInput = useRef(null);

  const budgetAmount = Number(parseBudgetInput(budget)) || 0;
  const canAsk = budgetAmount > 0;

  // A recommendation that no longer matches the terrain or the budget must not
  // be applied; the user is asked for a fresh one instead.
  const chosen = findProfile(result, selectedProfile);
  const applied =
    Boolean(chosen) &&
    !stale &&
    Number(harvesters) === chosen.harvesters &&
    Number(tractors) === chosen.carts;

  useEffect(() => {
    if (editingBudget) budgetInput.current?.focus();
  }, [editingBudget]);

  const askForRecommendation = () => {
    setShowAlternatives(false);
    setEditingBudget(false);
    run();
  };

  const changeBudget = () => {
    setEditingBudget(true);
    setShowAlternatives(false);
  };

  const onBudgetChange = (event) => {
    // The numbers already on screen described the previous budget.
    onChange({
      budget: parseBudgetInput(event.target.value),
      selectedProfile: null,
      recommendationRequestId: null,
    });
  };

  const applyFleet = (option) => {
    onChange({
      harvesters: option.harvesters,
      tractors: option.carts,
      selectedProfile: option.profile,
      recommendationRequestId: requestId,
    });
  };

  const chooseMode = (next) => {
    if (next === mode) return;
    onChange({ mode: next });
    if (next === 'manual') {
      setEditingBudget(false);
      setShowAlternatives(false);
    }
  };

  const metricsOf = (option) => (option && option.metrics) || {};

  return (
    <div className="fleet-container">
      <h1>Configura tu equipo</h1>

      <fieldset className="fleet-modes-group">
        <legend className="fleet-question">¿Cómo quieres elegir tu flotilla?</legend>

        <div className="fleet-modes">
          <label className={`fleet-mode${!isRecommended ? ' is-active' : ''}`}>
            <input
              type="radio"
              name="fleet-mode"
              value="manual"
              className="fleet-mode-input"
              checked={!isRecommended}
              onChange={() => chooseMode('manual')}
            />
            <span className="fleet-mode-body">
              <span className="fleet-mode-title">Elegir manualmente</span>
              <span className="fleet-mode-text">
                Indica cuántas máquinas quieres usar.
              </span>
            </span>
          </label>

          <label className={`fleet-mode${isRecommended ? ' is-active' : ''}`}>
            <input
              type="radio"
              name="fleet-mode"
              value="recommended"
              className="fleet-mode-input"
              checked={isRecommended}
              onChange={() => chooseMode('recommended')}
            />
            <span className="fleet-mode-body">
              <span className="fleet-mode-title">Ayúdame a elegir</span>
              <span className="fleet-mode-text">
                Encontramos una flotilla para tu presupuesto.
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      {!isRecommended && (
        <div className="fleet-panel">
          <p className="fleet-lead">
            Selecciona la cantidad de maquinaria que deseas utilizar.
          </p>

          <div className="fleet-field">
            <label className="jd-label" htmlFor="harvesters">Cosechadoras</label>
            <input
              className="jd-input"
              type="number"
              id="harvesters"
              min="0"
              value={harvesters}
              onChange={(e) => onChange({ harvesters: e.target.value })}
            />
          </div>

          <div className="fleet-field">
            <label className="jd-label" htmlFor="tractors">Tractores de apoyo</label>
            <input
              className="jd-input"
              type="number"
              id="tractors"
              min="0"
              value={tractors}
              onChange={(e) => onChange({ tractors: e.target.value })}
            />
          </div>
        </div>
      )}

      {isRecommended && (
        <div className="fleet-panel">

          {/* --- budget form ------------------------------------------- */}
          {(phase === 'idle' || editingBudget) && (
            <div className="fleet-budget-form">
              <p className="fleet-lead">
                Ingresa tu presupuesto y encontraremos una opción adecuada para tu terreno.
              </p>

              <div className="fleet-field">
                <label className="jd-label" htmlFor="budget">Presupuesto disponible</label>
                <div className="fleet-money">
                  <span className="fleet-money-symbol" aria-hidden="true">$</span>
                  <input
                    className="jd-input"
                    type="text"
                    inputMode="numeric"
                    id="budget"
                    ref={budgetInput}
                    autoComplete="off"
                    value={formatBudgetInput(budget)}
                    onChange={onBudgetChange}
                  />
                  <span className="fleet-money-currency">{CURRENCY}</span>
                </div>
              </div>

              <p className="fleet-disclaimer">
                Los costos utilizados son estimaciones configurables para esta
                simulación y no representan precios comerciales.
              </p>

              <button
                type="button"
                className="jd-button"
                onClick={askForRecommendation}
                disabled={!canAsk}
              >
                Ver recomendación
              </button>
            </div>
          )}

          {/* --- loading ----------------------------------------------- */}
          {phase === 'loading' && !editingBudget && (
            <div className="fleet-state" role="status" aria-live="polite">
              <span className="fleet-spinner" aria-hidden="true" />
              <h2>Estamos preparando tu recomendación</h2>
              <p>Buscamos una combinación que se adapte a tu terreno y presupuesto.</p>
              <button type="button" className="jd-button jd-button-secondary" onClick={cancel}>
                Cancelar
              </button>
            </div>
          )}

          {/* --- insufficient budget ----------------------------------- */}
          {phase === 'insufficient' && !editingBudget && (
            <div className="fleet-state" role="status" aria-live="polite">
              <h2>Ajustemos el presupuesto</h2>
              <p>
                El presupuesto ingresado no alcanza para formar una flotilla capaz
                de completar el trabajo.
              </p>
              <button type="button" className="jd-button" onClick={changeBudget}>
                Cambiar presupuesto
              </button>
            </div>
          )}

          {/* --- connection or server failure -------------------------- */}
          {phase === 'error' && !editingBudget && (
            <div className="fleet-state" role="alert">
              <h2>No pudimos preparar la recomendación</h2>
              <p>
                Revisa la conexión e intenta nuevamente. También puedes elegir tu
                equipo manualmente.
              </p>
              <div className="fleet-actions">
                <button type="button" className="jd-button" onClick={askForRecommendation}>
                  Intentar nuevamente
                </button>
                <button
                  type="button"
                  className="jd-button jd-button-secondary"
                  onClick={() => { reset(); chooseMode('manual'); }}
                >
                  Elegir manualmente
                </button>
              </div>
            </div>
          )}

          {/* --- result ------------------------------------------------ */}
          {phase === 'result' && result && !editingBudget && (
            <div className="fleet-result">
              <h2 className="fleet-result-title">Flotilla recomendada</h2>

              {stale && (
                <p className="fleet-stale" role="status">
                  Cambiaste tu terreno o tu presupuesto. Pide una nueva
                  recomendación para verla actualizada.
                </p>
              )}

              {/* One card, read top to bottom: what to use, what it costs,
                  how it performs, and why it was chosen. */}
              <article className="fleet-card">
                <p className="fleet-badge">Mejor equilibrio</p>

                <div className="fleet-headline">
                  <span className="fleet-count">
                    <MachineIcon kind="harvester" />
                    <strong>{result.main.harvesters}</strong>
                    <span>{result.main.harvesters === 1 ? 'cosechadora' : 'cosechadoras'}</span>
                  </span>
                  <span className="fleet-plus" aria-hidden="true">+</span>
                  <span className="fleet-count">
                    <MachineIcon kind="cart" />
                    <strong>{result.main.carts}</strong>
                    <span>
                      {result.main.carts === 1 ? 'tractor de apoyo' : 'tractores de apoyo'}
                    </span>
                  </span>
                </div>

                <p className="fleet-headline-text">
                  Esta flotilla ofrece un buen equilibrio entre tiempo de trabajo,
                  consumo y cantidad de maquinaria.
                </p>

                <section className="fleet-budget-block">
                  <div className="fleet-budget-row">
                    <span className="fleet-budget-label">Inversión estimada</span>
                    <span className="fleet-budget-amount">
                      {formatMoney(result.main.estimatedCost)}
                    </span>
                  </div>
                  <div
                    className="fleet-meter"
                    role="progressbar"
                    aria-label={`${result.main.share}% del presupuesto`}
                    aria-valuenow={result.main.share}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  >
                    <span style={{ width: `${result.main.share}%` }} />
                  </div>
                  <p className="fleet-budget-caption">
                    {formatMoney(result.main.estimatedCost)} de {formatMoney(result.budget)}
                    {' · '}{result.main.share}% del presupuesto
                  </p>
                  <div className="fleet-budget-row fleet-budget-row-quiet">
                    <span className="fleet-budget-label">Saldo disponible</span>
                    <span>{formatMoney(result.main.budgetRemaining)}</span>
                  </div>
                  <p className="fleet-cost-note">
                    Los costos son estimaciones utilizadas para esta simulación.
                  </p>
                </section>

                <dl className="fleet-indicators">
                  <div>
                    <dd>{formatDuration(metricsOf(result.main).duration)}</dd>
                    <dt>Duración estimada</dt>
                  </div>
                  <div>
                    <dd>{formatFuel(metricsOf(result.main).fuel)}</dd>
                    <dt>Combustible estimado</dt>
                  </div>
                  {result.main.impact && (
                    <div>
                      <dd>{result.main.impact}</dd>
                      <dt>Tránsito repetido estimado</dt>
                    </div>
                  )}
                </dl>

                <p className="fleet-reason">{result.reason}</p>
              </article>

              {result.similar && (
                <div className="fleet-similar">
                  <h3>Encontramos opciones con resultados similares</h3>
                  <p>
                    Puedes elegir entre priorizar el uso de recursos o terminar el
                    trabajo en menos tiempo.
                  </p>
                </div>
              )}

              {/* One filled action only; the rest step down in weight. */}
              <div className="fleet-actions">
                <button type="button" className="fleet-link" onClick={changeBudget}>
                  Cambiar presupuesto
                </button>
                {result.alternatives.length > 0 && (
                  <button
                    type="button"
                    className="jd-button jd-button-secondary"
                    aria-expanded={showAlternatives}
                    onClick={() => setShowAlternatives((v) => !v)}
                  >
                    Ver alternativas
                  </button>
                )}
                {stale ? (
                  <button type="button" className="jd-button" onClick={askForRecommendation}>
                    Ver recomendación
                  </button>
                ) : applied ? (
                  <span className="fleet-selected" aria-label="Flotilla seleccionada">
                    Flotilla seleccionada <span aria-hidden="true">✓</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="jd-button"
                    onClick={() => applyFleet(result.main)}
                  >
                    Usar esta flotilla
                  </button>
                )}
              </div>

              {showAlternatives && result.alternatives.length > 0 && (
                <ul className="fleet-alternatives">
                  {result.alternatives.map((option) => (
                    <li key={option.profiles.join('-')} className="fleet-alternative">
                      <h3>{option.title}</h3>
                      <p>{option.text}</p>
                      <p className="fleet-alternative-fleet">
                        <strong>{option.harvesters}</strong> cosechadoras
                        {' + '}
                        <strong>{option.carts}</strong> tractores
                      </p>
                      <dl className="fleet-indicators fleet-indicators-compact">
                        <div>
                          <dd>{formatMoney(option.estimatedCost)}</dd>
                          <dt>Inversión estimada</dt>
                        </div>
                        <div>
                          <dd>{formatDuration(metricsOf(option).duration)}</dd>
                          <dt>Duración estimada</dt>
                        </div>
                        <div>
                          <dd>{formatFuel(metricsOf(option).fuel)}</dd>
                          <dt>Combustible estimado</dt>
                        </div>
                      </dl>
                      {applied && chosen === option ? (
                        <span className="fleet-selected fleet-selected-alternative">
                          Flotilla seleccionada <span aria-hidden="true">✓</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="jd-button jd-button-secondary"
                          onClick={() => applyFleet(option)}
                          disabled={stale}
                        >
                          Elegir esta opción
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {applied && (
                <p className="fleet-applied" role="status" aria-live="polite">
                  Esta flotilla se usará en la simulación.
                </p>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}

export default Fleet;
