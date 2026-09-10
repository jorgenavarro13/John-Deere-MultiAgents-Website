import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Simulation from './Simulation.jsx';
import { requestFleetRecommendation, sendConfig } from './Simulation/api.js';
import { mockRecommendationResponse } from './Simulation/__fixtures__/fleetRecommendation.js';

// The whole wizard, with only the outside world faked: the API module, the
// state stream and the Unity runtime. Viewer.jsx itself is the real one, so
// what these tests observe is exactly what the simulation server receives.
vi.mock('./Simulation/api.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    requestFleetRecommendation: vi.fn(),
    sendConfig: vi.fn().mockResolvedValue({ applied: {}, queued: true }),
    sendCommand: vi.fn().mockResolvedValue({ status: 'running', queued: false }),
    sendChat: vi.fn(),
    openStateStream: vi.fn(() => ({ close: vi.fn() })),
  };
});

vi.mock('./Simulation/useSimulationStream.js', () => ({
  default: () => ({ state: null, status: 'connecting' }),
}));

// The assistant panel is unrelated to the fleet step and pulls in its own
// streaming transport; the wizard is what is under test here.
vi.mock('./Simulation/FarmChat.jsx', () => ({ default: () => null }));

vi.mock('react-unity-webgl', () => ({
  Unity: () => <div data-testid="unity" />,
  useUnityContext: () => ({ unityProvider: {}, isLoaded: true, loadingProgression: 1 }),
}));

const next = (user, label = 'Siguiente') =>
  user.click(screen.getByRole('button', { name: label }));

async function fillTerrain(user) {
  const rows = screen.getByLabelText('Filas');
  const columns = screen.getByLabelText('Columnas');
  await user.clear(rows);
  await user.type(rows, '16');
  await user.clear(columns);
  await user.type(columns, '22');
  await next(user);
}

async function startSimulation(user) {
  await next(user);          // fleet -> resume
  await next(user, 'Simular');
  await user.click(await screen.findByRole('button', { name: 'Iniciar simulación' }));
  await waitFor(() => expect(sendConfig).toHaveBeenCalled());
  return sendConfig.mock.calls.at(-1)[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  sendConfig.mockResolvedValue({ applied: {}, queued: true });
  requestFleetRecommendation.mockImplementation(async (payload) => ({
    ...mockRecommendationResponse(),
    requestId: payload.requestId,
  }));
});

describe('the wizard end to end', () => {
  it('enables Siguiente only after accepting a recommended fleet', async () => {
    const user = userEvent.setup();
    render(<Simulation />);
    await fillTerrain(user);
    await user.click(screen.getByRole('radio', { name: /Ayúdame a elegir/ }));

    const nextButton = screen.getByRole('button', { name: 'Siguiente' });
    expect(nextButton).toBeDisabled();
    await user.type(screen.getByLabelText('Presupuesto disponible'), '1500000');
    await user.click(screen.getByRole('button', { name: 'Ver recomendación' }));
    await screen.findByText('Flotilla recomendada');
    expect(nextButton).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Usar esta flotilla' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Usar esta flotilla' }));
    expect(nextButton).toBeEnabled();
    expect(screen.getByText('Flotilla seleccionada')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Usar esta flotilla' })).not.toBeInTheDocument();
  });

  it('invalidates an accepted recommendation after returning and changing terrain', async () => {
    const user = userEvent.setup();
    render(<Simulation />);
    await fillTerrain(user);
    await user.click(screen.getByRole('radio', { name: /Ayúdame a elegir/ }));
    await user.type(screen.getByLabelText('Presupuesto disponible'), '1500000');
    await user.click(screen.getByRole('button', { name: 'Ver recomendación' }));
    await screen.findByText('Flotilla recomendada');
    await user.click(screen.getByRole('button', { name: 'Usar esta flotilla' }));
    await next(user);
    await user.click(screen.getByRole('button', { name: 'Atrás' }));
    await user.click(screen.getByRole('button', { name: 'Atrás' }));

    const rows = screen.getByLabelText('Filas');
    await user.clear(rows);
    await user.type(rows, '20');
    await next(user);

    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Ver recomendación' })).toBeInTheDocument();
    expect(screen.queryByText('Flotilla seleccionada')).not.toBeInTheDocument();
  });

  it('does not start the Unity runtime while the wizard is being filled in', async () => {
    const user = userEvent.setup();
    render(<Simulation />);
    // Unity installs keyboard handlers on the document and swallows every
    // keystroke, so it must not exist until the wizard is finished.
    expect(screen.queryByTestId('unity')).not.toBeInTheDocument();
    await fillTerrain(user);
    expect(screen.queryByTestId('unity')).not.toBeInTheDocument();

    const harvesters = screen.getByLabelText('Cosechadoras');
    await user.clear(harvesters);
    await user.type(harvesters, '3');
    expect(harvesters).toHaveValue(3);

    await next(user);
    expect(screen.queryByTestId('unity')).not.toBeInTheDocument();
    await next(user, 'Simular');
    expect(await screen.findByTestId('unity')).toBeInTheDocument();
  });

  it('sends the manual selection to the simulation server', async () => {
    const user = userEvent.setup();
    render(<Simulation />);
    await fillTerrain(user);

    const harvesters = screen.getByLabelText('Cosechadoras');
    await user.clear(harvesters);
    await user.type(harvesters, '3');
    const tractors = screen.getByLabelText('Tractores de apoyo');
    await user.clear(tractors);
    await user.type(tractors, '3');

    expect(await startSimulation(user)).toEqual({
      rows: 16,
      cols: 22,
      harvesters: 3,
      carts: 3,
      minObstacles: 0,
      maxObstacles: 0,
    });
  });

  it('sends an accepted recommendation as exactly the same object', async () => {
    const user = userEvent.setup();
    render(<Simulation />);
    await fillTerrain(user);

    await user.click(screen.getByRole('radio', { name: /Ayúdame a elegir/ }));
    await user.type(screen.getByLabelText('Presupuesto disponible'), '1500000');
    await user.click(screen.getByRole('button', { name: 'Ver recomendación' }));
    await screen.findByText('Flotilla recomendada');
    await user.click(screen.getByRole('button', { name: 'Usar esta flotilla' }));

    const config = await startSimulation(user);
    expect(config).toEqual({
      rows: 16,
      cols: 22,
      harvesters: 3,
      carts: 3,
      minObstacles: 0,
      maxObstacles: 0,
    });
    // Nothing about the recommendation follows the fleet into the run.
    for (const key of ['budget', 'profile', 'selectedProfile', 'requestId',
                       'recommendationRequestId', 'score', 'costVersion']) {
      expect(config).not.toHaveProperty(key);
    }
  });

  it('carries the recommendation into the summary in the same fields as manual', async () => {
    const user = userEvent.setup();
    render(<Simulation />);
    await fillTerrain(user);

    await user.click(screen.getByRole('radio', { name: /Ayúdame a elegir/ }));
    await user.type(screen.getByLabelText('Presupuesto disponible'), '1500000');
    await user.click(screen.getByRole('button', { name: 'Ver recomendación' }));
    await screen.findByText('Flotilla recomendada');
    await user.click(screen.getByRole('button', { name: 'Ver alternativas' }));
    const card = screen.getByRole('heading', { name: 'Menor maquinaria' }).closest('li');
    await user.click(within(card).getByRole('button', { name: 'Elegir esta opción' }));

    await next(user);
    const summary = await screen.findByRole('heading', { name: 'Resumen de la simulación' });
    expect(summary).toBeInTheDocument();
    const equipo = screen.getByRole('heading', { name: 'Equipo' }).closest('.resume-card');
    expect(equipo).toHaveTextContent('Ayúdame a elegir');
    expect(equipo).toHaveTextContent('Cosechadoras 1');
    expect(equipo).toHaveTextContent('Tractores de apoyo 1');
    expect(equipo).toHaveTextContent('1,500,000');
  });

  it('starts the run manually when the recommendation service is unavailable', async () => {
    const user = userEvent.setup();
    const { FleetRecommendationError } = await import('./Simulation/api.js');
    requestFleetRecommendation.mockRejectedValue(
      new FleetRecommendationError('error', 503, 'disabled')
    );
    render(<Simulation />);
    await fillTerrain(user);

    await user.click(screen.getByRole('radio', { name: /Ayúdame a elegir/ }));
    await user.type(screen.getByLabelText('Presupuesto disponible'), '1500000');
    await user.click(screen.getByRole('button', { name: 'Ver recomendación' }));
    await screen.findByText('No pudimos preparar la recomendación');
    await user.click(screen.getByRole('button', { name: 'Elegir manualmente' }));

    const harvesters = await screen.findByLabelText('Cosechadoras');
    await user.clear(harvesters);
    await user.type(harvesters, '2');
    expect(await startSimulation(user)).toMatchObject({ harvesters: 2, rows: 16, cols: 22 });
  });
});
