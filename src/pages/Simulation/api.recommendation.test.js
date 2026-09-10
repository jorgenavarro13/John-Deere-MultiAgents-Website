import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FleetRecommendationError, requestFleetRecommendation } from './api.js';

// The bodies below were captured from a live
// `python3 Servidor/server.py --web-port 8080` with fleet recommendations on,
// so the client's reading of the contract is checked against what the server
// actually answers rather than against a guess.
const LIVE = {
  completed: {
    schemaVersion: 1,
    requestId: 'web-live',
    status: 'completed',
    costVersion: 'dev-v1',
    terrain: { rows: 12, columns: 14, foodRatio: 1.0, border: 1, minObstacles: 3, maxObstacles: 5 },
    budget: { amount: 2000000, currency: 'MXN' },
    profiles: [
      { profile: 'balanced', harvesters: 2, carts: 2, estimatedCost: 760000,
        budgetRemaining: 1240000,
        metrics: { duration: 132.8, fuel: 209.62, co2: 561.78, repeatedTraffic: 159.6, harvesterWaitRate: 0.0434 } },
    ],
  },
  insufficient: { schemaVersion: 1, requestId: 'web-poor', status: 'error',
    error: 'budget is insufficient for every evaluated fleet' },
  busy: { schemaVersion: 1, requestId: 'web-busy', status: 'busy',
    error: 'a fleet recommendation is already running' },
  timeout: { schemaVersion: 1, requestId: 'web-slow', status: 'timeout',
    error: 'recommendation timed out; its worker may still finish internally' },
  disabled: { schemaVersion: 1, requestId: 'web-off', status: 'disabled',
    error: 'fleet recommendations are disabled' },
};

const respond = (status, body) =>
  vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body });

beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
afterEach(() => { vi.unstubAllGlobals(); });

async function expectKind(status, body, kind) {
  vi.stubGlobal('fetch', respond(status, body));
  await expect(requestFleetRecommendation({}, {})).rejects.toMatchObject({ kind });
}

describe('the recommendation client', () => {
  it('posts JSON to /api/fleet-recommendations and returns the payload', async () => {
    vi.stubGlobal('fetch', respond(200, LIVE.completed));
    const payload = { schemaVersion: 1, requestId: 'web-live' };
    const data = await requestFleetRecommendation(payload, {});
    const [url, init] = fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/fleet-recommendations$/);
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual(payload);
    expect(data.profiles[0].profile).toBe('balanced');
  });

  it('recognises an insufficient budget, which the page must not call an error', async () => {
    await expectKind(400, LIVE.insufficient, 'insufficient_budget');
  });

  it('treats every other rejection as a plain failure', async () => {
    await expectKind(400, { error: 'budget currency must be MXN' }, 'error');
    await expectKind(429, LIVE.busy, 'error');
    await expectKind(504, LIVE.timeout, 'error');
    await expectKind(503, LIVE.disabled, 'error');
    await expectKind(500, { error: 'fleet recommendation failed' }, 'error');
  });

  it('turns a dead connection into the same plain failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(requestFleetRecommendation({}, {})).rejects.toBeInstanceOf(
      FleetRecommendationError
    );
  });

  it('lets an abort through untouched so the caller can ignore it', async () => {
    const abort = new Error('aborted');
    abort.name = 'AbortError';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abort));
    await expect(requestFleetRecommendation({}, {})).rejects.toMatchObject({ name: 'AbortError' });
  });
});
