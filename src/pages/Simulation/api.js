// The simulation server (`python3 Servidor/server.py --web-port 8080`)
export const API_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:8080';

// Optional bearer token; only needed if the server runs with `--web-token`.
const API_TOKEN = import.meta.env.VITE_API_TOKEN || '';

function postHeaders(hasBody) {
  const h = {};
  if (hasBody) h['Content-Type'] = 'application/json';
  if (API_TOKEN) h.Authorization = `Bearer ${API_TOKEN}`;
  return h;
}

// The rolling per-tick sample buffer, used to backfill a chart on load.
// `since` is exclusive: pass the last tick already plotted, or -1 for everything.
export async function fetchHistory(since = -1) {
  const res = await fetch(`${API_URL}/api/history?since=${since}`);
  if (!res.ok) throw new Error(`GET /api/history -> ${res.status}`);
  return res.json();
}

// The current tick as KPIs + per-machine rows.
export async function fetchState() {
  const res = await fetch(`${API_URL}/api/state`);
  if (!res.ok) throw new Error(`GET /api/state -> ${res.status}`);
  return res.json();
}

// Flat crop / zones / obstacles arrays + machine positions, for the minimap.
// Meant to be polled at a low rate (~2 s).
export async function fetchField() {
  const res = await fetch(`${API_URL}/api/field`);
  if (!res.ok) throw new Error(`GET /api/field -> ${res.status}`);
  return res.json();
}

// One summary row per run since the server started, plus the live one — for
// the cross-run comparison.
export async function fetchRuns() {
  const res = await fetch(`${API_URL}/api/runs`);
  if (!res.ok) throw new Error(`GET /api/runs -> ${res.status}`);
  return res.json();
}

// POST /api/commands/{action} — the transport controls.
//   start    build the first run and set it going (un-pause on an existing run)
//   pause    freeze on the current tick
//   continue resume from the tick where it stopped
//   reset    same field back to tick 1, held paused
//   restart  rebuild + run (pass { newSeed: true } for a fresh field)
// A rebuild ('start' cold / 'reset' / 'restart') answers { queued: true } and
// lands on the next state message with a bumped runId.
export async function sendCommand(action, body) {
  const res = await fetch(`${API_URL}/api/commands/${action}`, {
    method: 'POST',
    headers: postHeaders(Boolean(body)),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`POST /api/commands/${action} → ${res.status}`);
  return res.json();
}

// POST /api/config — apply run parameters, then rebuild and run. This is how
// the wizard selection is injected instead of relying on server defaults.
// Accepts any of: rows, cols, harvesters, carts, minObstacles, maxObstacles,
// newSeed.
export async function sendConfig(params) {
  const res = await fetch(`${API_URL}/api/config`, {
    method: 'POST',
    headers: postHeaders(true),
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`POST /api/config → ${res.status}`);
  return res.json();
}

// Server-Sent Events: one `/api/state` payload per tick. Returns the
// EventSource so the caller can close it on unmount.
export function openStateStream({ onState, onError }) {
  const es = new EventSource(`${API_URL}/api/state/stream`);
  es.onmessage = (e) => {
    try {
      onState(JSON.parse(e.data));
    } catch {
      /* keep-alive comments and partial frames are ignored */
    }
  };
  if (onError) es.onerror = onError;
  return es;
}

// OpenClaw credentials and gateway access remain on the simulation server.
export async function sendChat(message, conversationId, signal, onText) {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: postHeaders(true),
    body: JSON.stringify({ message, conversationId }),
    signal,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'No se pudo conectar con el asistente.');
  }
  // Allow a server from before the streaming update during a rolling restart.
  if (!res.headers.get('content-type')?.includes('application/x-ndjson')) {
    const data = await res.json();
    if (typeof data.reply !== 'string' || !data.reply.trim()) throw new Error('El asistente no devolvió una respuesta.');
    onText(data.reply);
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let reply = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      let newline;
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        if (!line.trim()) continue;
        const event = JSON.parse(line);
        if (event.type === 'error') throw new Error(event.error);
        if (event.type === 'delta') { reply += event.text; onText(reply); }
        if (event.type === 'done') return;
      }
      if (done) throw new Error('La respuesta se interrumpió. Revisa la simulación antes de repetir una acción.');
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

// POST /api/fleet-recommendations — ask the server for affordable fleet
// profiles for a terrain and a budget. Contract (Servidor/web.py):
//   request  { schemaVersion: 1, requestId, terrain{rows,columns,border,
//              minObstacles,maxObstacles,foodRatio?}, budget{amount,currency} }
//   response { schemaVersion, requestId, status: 'completed', costVersion,
//              terrain, budget, profiles[] }
// Unit costs live in Python; the page never sends or computes them.
// Rejections carry a JSON body with `status` and `error`; both are surfaced to
// the caller through FleetRecommendationError so the UI can pick its wording
// without ever printing the server's own message.
export class FleetRecommendationError extends Error {
  constructor(kind, httpStatus, serverStatus) {
    super(kind);
    this.name = 'FleetRecommendationError';
    this.kind = kind; // 'insufficient_budget' | 'error'
    this.httpStatus = httpStatus ?? null;
    this.serverStatus = serverStatus ?? null;
  }
}

export async function requestFleetRecommendation(payload, { signal } = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}/api/fleet-recommendations`, {
      method: 'POST',
      headers: postHeaders(true),
      body: JSON.stringify(payload),
      signal,
    });
  } catch (e) {
    if (e?.name === 'AbortError') throw e;
    throw new FleetRecommendationError('error', null, 'network');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // The only rejection the user can act on is a budget that buys no fleet
    // able to finish the job; everything else is a plain failure.
    const insufficient =
      res.status === 400 && /insufficient/i.test(String(data.error || ''));
    throw new FleetRecommendationError(
      insufficient ? 'insufficient_budget' : 'error',
      res.status,
      data.status || null
    );
  }
  return data;
}
