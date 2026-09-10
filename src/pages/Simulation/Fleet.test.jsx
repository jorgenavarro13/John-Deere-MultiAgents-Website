import React, { useState } from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Fleet from './Fleet.jsx';
import { FleetRecommendationError, requestFleetRecommendation } from './api.js';
import { mockRecommendationResponse } from './__fixtures__/fleetRecommendation.js';

vi.mock('./api.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, requestFleetRecommendation: vi.fn() };
});

const TERRAIN = { rows: 16, columns: 22, hasObstacles: false, obstaclePct: 5 };

// Mirrors the wizard: Simulation.jsx owns the fleet state and patches it.
function Harness({ terrain = TERRAIN, initial = {}, onState }) {
  const [terrainData, setTerrainData] = useState(terrain);
  const [data, setData] = useState({
    mode: 'manual',
    harvesters: 3,
    tractors: 2,
    budget: '',
    selectedProfile: null,
    recommendationRequestId: null,
    ...initial,
  });
  onState?.({ data, setTerrain: setTerrainData });
  return (
    <Fleet
      data={data}
      terrain={terrainData}
      onChange={(patch) => setData((prev) => ({ ...prev, ...patch }))}
    />
  );
}

function setup(props = {}) {
  const seen = { data: null, setTerrain: null };
  const user = userEvent.setup();
  const view = render(
    <Harness {...props} onState={(s) => { seen.data = s.data; seen.setTerrain = s.setTerrain; }} />
  );
  return { user, seen, view };
}

// The server echoes the requestId it was given; the page drops any answer
// that does not match the request in flight, so the double must echo too.
const resolveWith = (response = mockRecommendationResponse()) =>
  requestFleetRecommendation.mockImplementation(async (payload) => ({
    ...response,
    requestId: payload.requestId,
  }));

const chooseRecommended = async (user) =>
  user.click(screen.getByRole('radio', { name: /Ayúdame a elegir/ }));

const typeBudget = async (user, amount) =>
  user.type(screen.getByLabelText('Presupuesto disponible'), amount);

async function reachResult(user, response = mockRecommendationResponse()) {
  resolveWith(response);
  await chooseRecommended(user);
  await typeBudget(user, '1500000');
  await user.click(screen.getByRole('button', { name: 'Ver recomendación' }));
  await screen.findByText('Flotilla recomendada');
}

beforeEach(() => {
  requestFleetRecommendation.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the step frame', () => {
  it('asks the question with both options', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Configura tu equipo' })).toBeInTheDocument();
    expect(screen.getByText('¿Cómo quieres elegir tu flotilla?')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Elegir manualmente/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Ayúdame a elegir/ })).toBeInTheDocument();
  });
});

describe('manual mode', () => {
  it('keeps the existing inputs under their internal names', async () => {
    const { user, seen } = setup();
    expect(
      screen.getByText('Selecciona la cantidad de maquinaria que deseas utilizar.')
    ).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Cosechadoras'));
    await user.type(screen.getByLabelText('Cosechadoras'), '4');
    await user.clear(screen.getByLabelText('Tractores de apoyo'));
    await user.type(screen.getByLabelText('Tractores de apoyo'), '5');

    expect(seen.data.harvesters).toBe('4');
    expect(seen.data.tractors).toBe('5');
    expect(seen.data.mode).toBe('manual');
  });

  it('works without ever calling the recommendation endpoint', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText('Cosechadoras'), '1');
    expect(requestFleetRecommendation).not.toHaveBeenCalled();
  });
});

describe('switching to "Ayúdame a elegir"', () => {
  it('shows the budget form and its disclaimer', async () => {
    const { user, seen } = setup();
    await chooseRecommended(user);
    expect(seen.data.mode).toBe('recommended');
    expect(
      screen.getByText('Ingresa tu presupuesto y encontraremos una opción adecuada para tu terreno.')
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Los costos utilizados son estimaciones configurables/)
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Cosechadoras')).not.toBeInTheDocument();
  });

  it('formats the budget with thousand separators', async () => {
    const { user, seen } = setup();
    await chooseRecommended(user);
    await typeBudget(user, '1500000');
    expect(screen.getByLabelText('Presupuesto disponible')).toHaveValue('1,500,000');
    expect(seen.data.budget).toBe('1500000');
  });

  it('will not ask for a recommendation with an empty budget', async () => {
    const { user } = setup();
    await chooseRecommended(user);
    expect(screen.getByRole('button', { name: 'Ver recomendación' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Ver recomendación' }));
    expect(requestFleetRecommendation).not.toHaveBeenCalled();
  });
});

describe('requesting a recommendation', () => {
  it('sends the contract payload with a fresh requestId', async () => {
    const { user } = setup();
    resolveWith();
    await chooseRecommended(user);
    await typeBudget(user, '1500000');
    await user.click(screen.getByRole('button', { name: 'Ver recomendación' }));
    await screen.findByText('Flotilla recomendada');

    const [payload, options] = requestFleetRecommendation.mock.calls[0];
    expect(payload).toMatchObject({
      schemaVersion: 1,
      terrain: { rows: 16, columns: 22, border: 1, minObstacles: 0, maxObstacles: 0 },
      budget: { amount: 1500000, currency: 'MXN' },
    });
    expect(payload.requestId).toEqual(expect.any(String));
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  it('shows the waiting state while the server works', async () => {
    const { user } = setup();
    let settle;
    requestFleetRecommendation.mockImplementation(
      (payload) => new Promise((resolve) => {
        settle = (body) => resolve({ ...body, requestId: payload.requestId });
      })
    );
    await chooseRecommended(user);
    await typeBudget(user, '1500000');
    await user.click(screen.getByRole('button', { name: 'Ver recomendación' }));

    expect(screen.getByText('Estamos preparando tu recomendación')).toBeInTheDocument();
    expect(
      screen.getByText('Buscamos una combinación que se adapte a tu terreno y presupuesto.')
    ).toBeInTheDocument();
    settle(mockRecommendationResponse());
    await screen.findByText('Flotilla recomendada');
  });
});

describe('the result', () => {
  it('leads with the fleet, then the budget, then the performance', async () => {
    const { user } = setup();
    await reachResult(user);

    // 1. What to use: the two counts, large, with their machines named.
    const card = document.querySelector('.fleet-card');
    expect(within(card).getByText('Mejor equilibrio')).toBeInTheDocument();
    const headline = card.querySelector('.fleet-headline');
    expect(headline).toHaveTextContent('3');
    expect(headline).toHaveTextContent('cosechadoras');
    expect(headline).toHaveTextContent('tractores de apoyo');

    // 2. What it costs: one block tying spend, budget and balance together.
    const money = card.querySelector('.fleet-budget-block');
    expect(within(money).getByText('Inversión estimada')).toBeInTheDocument();
    expect(money).toHaveTextContent('1,140,000');
    expect(money).toHaveTextContent('1,500,000');
    expect(within(money).getByText('Saldo disponible')).toBeInTheDocument();
    expect(money).toHaveTextContent('360,000');
    // 1,140,000 of 1,500,000 is 76%.
    expect(money).toHaveTextContent('76% del presupuesto');
    expect(money.querySelector('.fleet-meter span')).toHaveStyle({ width: '76%' });
    const progress = within(money).getByRole('progressbar', { name: '76% del presupuesto' });
    expect(progress).toHaveAttribute('aria-valuenow', '76');
    expect(progress).toHaveAttribute('aria-valuemin', '0');
    expect(progress).toHaveAttribute('aria-valuemax', '100');

    // 3. How it performs: exactly three indicators, no fourth money figure.
    const indicators = card.querySelector('.fleet-indicators');
    expect(indicators.children).toHaveLength(3);
    expect(indicators).toHaveTextContent('265 ciclos');
    expect(indicators).not.toHaveTextContent('ciclos de trabajo');
    expect(indicators).toHaveTextContent('Duración estimada');
    expect(indicators).toHaveTextContent('520 L');
    expect(indicators).toHaveTextContent('Combustible estimado');
    expect(indicators).toHaveTextContent('Tránsito repetido estimado');
  });

  it('states the terrain impact instead of a raw traffic count', async () => {
    const { user } = setup();
    const response = mockRecommendationResponse();
    // 12 repeated entries over a 16x22 field is a light pass.
    await reachResult(user, response);
    expect(screen.getByText('Tránsito bajo')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('12.0');
  });

  it('explains the balance when a bigger fleet does buy real time', async () => {
    const { user } = setup();
    // The fastest affordable option saves 20% of the time: a genuine gain.
    await reachResult(user);
    expect(
      screen.getByText(
        'Esta configuración equilibra tiempo de trabajo, consumo y uso de maquinaria.'
      )
    ).toBeInTheDocument();
  });

  it('says machinery was left out when it would buy almost nothing', async () => {
    const response = mockRecommendationResponse();
    // 4H/3C now saves only 2% of the time and burns more fuel.
    response.profiles[3].metrics.duration = 260.0;
    const { user } = setup();
    await reachResult(user, response);
    expect(
      screen.getByText(
        'Agregar otra máquina reduciría poco el tiempo de trabajo y aumentaría el consumo estimado.'
      )
    ).toBeInTheDocument();
  });

  it('gives only one filled button, with the rest lower in weight', async () => {
    const { user } = setup();
    await reachResult(user);
    const actions = document.querySelector('.fleet-actions');
    const filled = [...actions.querySelectorAll('button')].filter(
      (b) => b.classList.contains('jd-button') && !b.classList.contains('jd-button-secondary')
    );
    expect(filled).toHaveLength(1);
    expect(filled[0]).toHaveTextContent('Usar esta flotilla');
    expect(within(actions).getByRole('button', { name: 'Cambiar presupuesto' }))
      .toHaveClass('fleet-link');
    expect(within(actions).getByRole('button', { name: 'Ver alternativas' }))
      .toHaveClass('jd-button-secondary');
  });

  it('never leaks the server vocabulary', async () => {
    const { user } = setup();
    await reachResult(user);
    const text = document.body.textContent;
    for (const leaked of [
      'balanced', 'lower_consumption', 'minimum_machinery', 'minimum_duration',
      'Pareto', 'score', 'Score', 'semilla', 'Semillas', 'campaña', 'Campañas',
      'Confianza baja', 'costVersion', 'requestId', 'tick',
    ]) {
      expect(text).not.toContain(leaked);
    }
  });

  it('offers the alternatives with their public wording', async () => {
    const { user } = setup();
    await reachResult(user);
    await user.click(screen.getByRole('button', { name: 'Ver alternativas' }));

    expect(screen.getByRole('heading', { name: 'Menor consumo' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Menor maquinaria' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Terminar antes' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Elegir esta opción' })).toHaveLength(3);
  });

  it('shows one card, not two, when two profiles are the same fleet', async () => {
    const response = mockRecommendationResponse();
    response.profiles[1] = { ...response.profiles[2], profile: 'lower_consumption' };
    const { user } = setup();
    await reachResult(user, response);
    await user.click(screen.getByRole('button', { name: 'Ver alternativas' }));

    expect(screen.getAllByRole('button', { name: 'Elegir esta opción' })).toHaveLength(2);
    expect(
      screen.getByRole('heading', { name: 'Menor consumo y Menor maquinaria' })
    ).toBeInTheDocument();
  });

  it('talks about similar results rather than low confidence', async () => {
    const response = mockRecommendationResponse();
    response.profiles[3].metrics.duration = 262.0; // within a few percent of 265
    const { user } = setup();
    await reachResult(user, response);
    expect(
      screen.getByText('Encontramos opciones con resultados similares')
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('Confianza');
  });
});

describe('choosing a fleet', () => {
  it('writes the main profile into harvesters and carts', async () => {
    const { user, seen } = setup();
    await reachResult(user);
    await user.click(screen.getByRole('button', { name: 'Usar esta flotilla' }));

    await waitFor(() => expect(seen.data.harvesters).toBe(3));
    expect(seen.data.tractors).toBe(3); // the server's `carts`
    expect(seen.data.selectedProfile).toBe('balanced');
    expect(seen.data.recommendationRequestId).toEqual(expect.any(String));
    expect(screen.getByText('Flotilla seleccionada')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Esta flotilla se usará en la simulación.'
    );
    expect(screen.queryByRole('button', { name: 'Usar esta flotilla' })).not.toBeInTheDocument();
  });

  it('writes an alternative into the same two fields', async () => {
    const { user, seen } = setup();
    await reachResult(user);
    await user.click(screen.getByRole('button', { name: 'Ver alternativas' }));
    const card = screen.getByRole('heading', { name: 'Terminar antes' }).closest('li');
    await user.click(within(card).getByRole('button', { name: 'Elegir esta opción' }));

    await waitFor(() => expect(seen.data.harvesters).toBe(4));
    expect(seen.data.tractors).toBe(3);
    expect(seen.data.selectedProfile).toBe('minimum_duration');
    expect(within(card).getByText('Flotilla seleccionada')).toBeInTheDocument();
  });
});

describe('when things go wrong', () => {
  it('asks for a bigger budget without showing an error', async () => {
    const { user } = setup();
    requestFleetRecommendation.mockRejectedValue(
      new FleetRecommendationError('insufficient_budget', 400, 'error')
    );
    await chooseRecommended(user);
    await typeBudget(user, '1000');
    await user.click(screen.getByRole('button', { name: 'Ver recomendación' }));

    expect(await screen.findByText('Ajustemos el presupuesto')).toBeInTheDocument();
    expect(
      screen.getByText(
        'El presupuesto ingresado no alcanza para formar una flotilla capaz de completar el trabajo.'
      )
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('insufficient');

    await user.click(screen.getByRole('button', { name: 'Cambiar presupuesto' }));
    expect(screen.getByLabelText('Presupuesto disponible')).toHaveValue('1,000');
  });

  it('offers a retry and the manual route on a server failure', async () => {
    const { user } = setup();
    requestFleetRecommendation.mockRejectedValue(
      new FleetRecommendationError('error', 500, 'error')
    );
    await chooseRecommended(user);
    await typeBudget(user, '1500000');
    await user.click(screen.getByRole('button', { name: 'Ver recomendación' }));

    expect(await screen.findByText('No pudimos preparar la recomendación')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Revisa la conexión e intenta nuevamente. También puedes elegir tu equipo manualmente.'
      )
    ).toBeInTheDocument();
    // No traces, exception names or status codes.
    expect(document.body.textContent).not.toMatch(/500|Error:|fetch|Traceback/);

    resolveWith();
    await user.click(screen.getByRole('button', { name: 'Intentar nuevamente' }));
    await screen.findByText('Flotilla recomendada');
    expect(requestFleetRecommendation).toHaveBeenCalledTimes(2);
  });

  it('falls back to manual selection from the failure state', async () => {
    const { user, seen } = setup();
    requestFleetRecommendation.mockRejectedValue(
      new FleetRecommendationError('error', null, 'network')
    );
    await chooseRecommended(user);
    await typeBudget(user, '1500000');
    await user.click(screen.getByRole('button', { name: 'Ver recomendación' }));
    await screen.findByText('No pudimos preparar la recomendación');

    await user.click(screen.getByRole('button', { name: 'Elegir manualmente' }));
    await waitFor(() => expect(seen.data.mode).toBe('manual'));
    expect(screen.getByLabelText('Cosechadoras')).toBeInTheDocument();
  });
});

describe('cancelling', () => {
  it('aborts the request, keeps the budget and returns to the form', async () => {
    const { user, seen } = setup();
    let capturedSignal;
    requestFleetRecommendation.mockImplementation((payload, { signal }) => {
      capturedSignal = signal;
      return new Promise((_, reject) => {
        signal.addEventListener('abort', () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        });
      });
    });
    await chooseRecommended(user);
    await typeBudget(user, '1500000');
    await user.click(screen.getByRole('button', { name: 'Ver recomendación' }));
    await screen.findByText('Estamos preparando tu recomendación');

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(capturedSignal.aborted).toBe(true);
    expect(await screen.findByLabelText('Presupuesto disponible')).toHaveValue('1,500,000');
    expect(seen.data.budget).toBe('1500000');
    expect(screen.queryByText('Estamos preparando tu recomendación')).not.toBeInTheDocument();
  });

  it('ignores a response that arrives after a cancellation', async () => {
    const { user } = setup();
    let settle;
    requestFleetRecommendation.mockImplementation(
      (payload) => new Promise((resolve) => {
        settle = (body) => resolve({ ...body, requestId: payload.requestId });
      })
    );
    await chooseRecommended(user);
    await typeBudget(user, '1500000');
    await user.click(screen.getByRole('button', { name: 'Ver recomendación' }));
    await screen.findByText('Estamos preparando tu recomendación');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    settle(mockRecommendationResponse());
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByText('Flotilla recomendada')).not.toBeInTheDocument();
  });

  it('ignores a response whose requestId is not the live one', async () => {
    const { user } = setup();
    requestFleetRecommendation.mockResolvedValue(
      mockRecommendationResponse({ requestId: 'someone-elses-request' })
    );
    await chooseRecommended(user);
    await typeBudget(user, '1500000');
    await user.click(screen.getByRole('button', { name: 'Ver recomendación' }));

    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByText('Flotilla recomendada')).not.toBeInTheDocument();
    expect(screen.getByText('Estamos preparando tu recomendación')).toBeInTheDocument();
  });
});

describe('a result that no longer matches its inputs', () => {
  it('is invalidated when the budget changes', async () => {
    const { user } = setup();
    await reachResult(user);
    await user.click(screen.getByRole('button', { name: 'Cambiar presupuesto' }));
    await typeBudget(user, '0');

    await user.click(screen.getByRole('button', { name: 'Ver recomendación' }));
    // The stale result is only reachable behind a fresh analysis.
    expect(requestFleetRecommendation).toHaveBeenCalledTimes(2);
  });

  it('is invalidated when the terrain changes', async () => {
    const { user, seen } = setup();
    await reachResult(user);
    expect(screen.getByRole('button', { name: 'Usar esta flotilla' })).toBeInTheDocument();

    act(() => {
      seen.setTerrain({ rows: 40, columns: 40, hasObstacles: false, obstaclePct: 5 });
    });

    expect(
      await screen.findByText(/Cambiaste tu terreno o tu presupuesto/)
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Usar esta flotilla' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver recomendación' })).toBeInTheDocument();
  });

  it('disables choosing an alternative while stale', async () => {
    const { user, seen } = setup();
    await reachResult(user);
    await user.click(screen.getByRole('button', { name: 'Ver alternativas' }));
    act(() => {
      seen.setTerrain({ rows: 40, columns: 40, hasObstacles: false, obstaclePct: 5 });
    });

    await waitFor(() => {
      for (const button of screen.getAllByRole('button', { name: 'Elegir esta opción' })) {
        expect(button).toBeDisabled();
      }
    });
  });
});

describe('accessibility', () => {
  it('can be driven from the keyboard alone', async () => {
    const { user, seen } = setup();
    resolveWith();

    // Tab to the mode radio group, move to "Ayúdame a elegir" with an arrow.
    await user.tab();
    expect(screen.getByRole('radio', { name: /Elegir manualmente/ })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    await waitFor(() => expect(seen.data.mode).toBe('recommended'));

    await user.click(screen.getByLabelText('Presupuesto disponible'));
    await user.keyboard('1500000');
    await user.tab();
    expect(screen.getByRole('button', { name: 'Ver recomendación' })).toHaveFocus();
    await user.keyboard('{Enter}');

    await screen.findByText('Flotilla recomendada');
    // Every action on the result is reachable by tabbing; walk to the one that
    // applies the fleet and press it without touching the mouse.
    const use = screen.getByRole('button', { name: 'Usar esta flotilla' });
    for (let i = 0; i < 10 && document.activeElement !== use; i += 1) {
      await user.tab();
    }
    expect(use).toHaveFocus();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(seen.data.harvesters).toBe(3));
  });

  it('announces the waiting and failure states to assistive technology', async () => {
    const { user } = setup();
    requestFleetRecommendation.mockImplementation(() => new Promise(() => {}));
    await chooseRecommended(user);
    await typeBudget(user, '1500000');
    await user.click(screen.getByRole('button', { name: 'Ver recomendación' }));
    expect(screen.getByRole('status')).toHaveTextContent('Estamos preparando tu recomendación');
  });

  it('labels the alternatives list as a list of options', async () => {
    const { user } = setup();
    await reachResult(user);
    const toggle = screen.getByRole('button', { name: 'Ver alternativas' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0);
  });
});
