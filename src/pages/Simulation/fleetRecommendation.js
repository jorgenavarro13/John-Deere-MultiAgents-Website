// Everything the "Ayúdame a elegir" flow needs that is not React: building the
// request the server documents in `Servidor/web.py`, turning its `profiles`
// array into the two or three cards the page shows, and formatting numbers.
//
// The page never computes money. It sends a budget and a terrain; every unit
// cost, every estimate and every remaining balance comes back from Python.

// The server rejects a budget whose currency is not its own configured one.
export const CURRENCY = import.meta.env?.VITE_FLEET_CURRENCY || 'MXN';

// The wizard collects a percentage of restricted area; the simulation server
// takes an obstacle count. This mirrors `buildConfig` in Viewer.jsx so the
// terrain a recommendation is computed for is the terrain that will be run.
export function terrainRequest(terrain) {
  const rows = Math.max(1, Number(terrain?.rows) || 1);
  const columns = Math.max(1, Number(terrain?.columns) || 1);
  const pct = terrain?.hasObstacles
    ? Math.min(100, Math.max(0, Number(terrain.obstaclePct) || 0))
    : 0;
  const obstacles = pct > 0 ? Math.max(1, Math.round((rows * columns * pct) / 100)) : 0;
  return {
    rows,
    columns,
    border: 1,
    minObstacles: obstacles,
    maxObstacles: obstacles,
  };
}

export function buildRecommendationPayload(terrain, budget, requestId) {
  return {
    schemaVersion: 1,
    requestId,
    terrain: terrainRequest(terrain),
    budget: { amount: Math.trunc(Number(budget) || 0), currency: CURRENCY },
  };
}

// Identifies the inputs a recommendation is only valid for. When any of these
// change the answer on screen no longer describes what the user configured.
export function recommendationSignature(terrain, budget) {
  const t = terrainRequest(terrain);
  return [
    t.rows,
    t.columns,
    t.border,
    t.minObstacles,
    t.maxObstacles,
    Math.trunc(Number(budget) || 0),
  ].join('|');
}

export function newRequestId() {
  const random = globalThis.crypto?.randomUUID?.();
  return random ? `web-${random}` : `web-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// --- profiles -------------------------------------------------------------

// Server profile names never reach the screen; these are their public faces.
const ALTERNATIVE_LABELS = {
  lower_consumption: {
    title: 'Menor consumo',
    text: 'Utiliza menos combustible, aunque puede requerir más tiempo.',
  },
  minimum_machinery: {
    title: 'Menor maquinaria',
    text: 'Utiliza una flotilla más pequeña y se mantiene dentro de tu presupuesto.',
  },
  minimum_duration: {
    title: 'Terminar antes',
    text: 'Completa el trabajo en menos tiempo, con mayor consumo y uso de maquinaria.',
  },
};

const ALTERNATIVE_ORDER = ['lower_consumption', 'minimum_machinery', 'minimum_duration'];

const fleetKey = (p) => `${p.harvesters}x${p.carts}`;

function affordable(profile, budget) {
  // The server already filters by budget; this is belt and braces so a stale
  // or partial payload can never offer a fleet the user cannot pay for.
  return (
    profile &&
    Number.isFinite(profile.estimatedCost) &&
    profile.budgetRemaining >= 0 &&
    profile.estimatedCost <= budget
  );
}

// Two alternatives can land on the same fleet. When they do they become one
// card carrying both labels instead of two identical ones.
function joinTitles(titles) {
  if (titles.length === 1) return titles[0];
  return `${titles.slice(0, -1).join(', ')} y ${titles[titles.length - 1]}`;
}

/**
 * Shape a `/api/fleet-recommendations` response into what the page renders.
 * Returns { main, alternatives, similar } or null when nothing is usable.
 */
export function shapeRecommendation(response) {
  const profiles = Array.isArray(response?.profiles) ? response.profiles : [];
  const budget = Number(response?.budget?.amount) || 0;
  const usable = profiles.filter((p) => affordable(p, budget));
  const main = usable.find((p) => p.profile === 'balanced');
  if (!main) return null;

  const merged = new Map();
  for (const name of ALTERNATIVE_ORDER) {
    const profile = usable.find((p) => p.profile === name);
    if (!profile) continue;
    if (fleetKey(profile) === fleetKey(main)) continue; // same fleet as the main card
    const key = fleetKey(profile);
    const existing = merged.get(key);
    if (existing) {
      existing.profiles.push(name);
      existing.titles.push(ALTERNATIVE_LABELS[name].title);
    } else {
      merged.set(key, {
        profiles: [name],
        titles: [ALTERNATIVE_LABELS[name].title],
        text: ALTERNATIVE_LABELS[name].text,
        profile,
      });
    }
  }

  const alternatives = [...merged.values()].map((entry) => ({
    // The first contributing profile is what "Elegir esta opción" records.
    profile: entry.profiles[0],
    profiles: entry.profiles,
    title: joinTitles(entry.titles),
    text: entry.text,
    harvesters: entry.profile.harvesters,
    carts: entry.profile.carts,
    estimatedCost: entry.profile.estimatedCost,
    budgetRemaining: entry.profile.budgetRemaining,
    metrics: entry.profile.metrics || {},
  }));

  const area =
    (Number(response?.terrain?.rows) || 0) * (Number(response?.terrain?.columns) || 0);

  const shaped = {
    costVersion: response.costVersion ?? null,
    budget,
    area,
    main: {
      profile: 'balanced',
      harvesters: main.harvesters,
      carts: main.carts,
      estimatedCost: main.estimatedCost,
      budgetRemaining: main.budgetRemaining,
      metrics: main.metrics || {},
      share: budgetShare(main.estimatedCost, budget),
      impact: terrainImpact(main.metrics?.repeatedTraffic, area),
    },
    alternatives,
    similar: hasSimilarResults(main, alternatives),
  };

  shaped.reason = explainRecommendation(shaped.main, alternatives);
  return shaped;
}

// --- reading the numbers ---------------------------------------------------

// `repeatedTraffic` counts how many times the fleet re-enters a cell it has
// already worked — the double pass that compacts the soil. Its raw value grows
// with the field, so it only means something per cell of terrain. The bands
// below turn that ratio into the one phrase a grower cares about.
const TRAFFIC_BANDS = [
  { limit: 0.75, label: 'Tránsito bajo' },
  { limit: 1.5, label: 'Tránsito moderado' },
];

export function terrainImpact(repeatedTraffic, area) {
  const traffic = Number(repeatedTraffic);
  if (!Number.isFinite(traffic) || !area) return null;
  const perCell = traffic / area;
  const band = TRAFFIC_BANDS.find((b) => perCell < b.limit);
  return band ? band.label : 'Tránsito alto';
}

// How much of the budget the recommendation actually spends.
export function budgetShare(estimatedCost, budget) {
  if (!budget) return 0;
  return Math.min(100, Math.round((Number(estimatedCost) / budget) * 100));
}

// Why this fleet and not a bigger one. When an affordable alternative uses more
// machinery for little time saved, that comparison *is* the reason; otherwise
// the balance between the three things being traded off is.
const MARGINAL_GAIN = 0.15;

export function explainRecommendation(main, alternatives) {
  const duration = Number(main?.metrics?.duration);
  const fuel = Number(main?.metrics?.fuel);
  const vehicles = main.harvesters + main.carts;

  const bigger = alternatives.filter((alt) => alt.harvesters + alt.carts > vehicles);
  const marginal = bigger.some((alt) => {
    const altDuration = Number(alt.metrics?.duration);
    const altFuel = Number(alt.metrics?.fuel);
    if (!Number.isFinite(altDuration) || !Number.isFinite(duration) || duration <= 0) return false;
    const saved = (duration - altDuration) / duration;
    return saved < MARGINAL_GAIN && altFuel > fuel;
  });

  return marginal
    ? 'Agregar otra máquina reduciría poco el tiempo de trabajo y aumentaría el consumo estimado.'
    : 'Esta configuración equilibra tiempo de trabajo, consumo y uso de maquinaria.';
}

// The endpoint reports no confidence field, so "similar results" is read off
// the numbers themselves: a different fleet that finishes in about the same
// time as the balanced one means the choice is really about priorities.
const SIMILARITY_MARGIN = 0.05;

export function hasSimilarResults(main, alternatives) {
  const base = Number(main?.metrics?.duration);
  if (!Number.isFinite(base) || base <= 0) return false;
  return alternatives.some((alt) => {
    const duration = Number(alt.metrics?.duration);
    if (!Number.isFinite(duration)) return false;
    return Math.abs(duration - base) / base <= SIMILARITY_MARGIN;
  });
}

// Look up a card by the profile name stored in the wizard state.
export function findProfile(shaped, profileName) {
  if (!shaped) return null;
  if (!profileName || profileName === 'balanced') return shaped.main;
  return shaped.alternatives.find((a) => a.profiles.includes(profileName)) || null;
}

// --- formatting -----------------------------------------------------------

const money = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: CURRENCY,
  maximumFractionDigits: 0,
});

export const formatMoney = (value) =>
  Number.isFinite(Number(value)) ? `${money.format(Number(value))} ${CURRENCY}` : '—';

export const formatDuration = (value) =>
  Number.isFinite(Number(value))
    ? `${Math.round(Number(value)).toLocaleString('es-MX')} ciclos`
    : '—';

export const formatFuel = (value) =>
  Number.isFinite(Number(value))
    ? `${Math.round(Number(value)).toLocaleString('es-MX')} L`
    : '—';

// Digits only, so the budget field cannot carry a currency symbol or letters
// into an endpoint that requires an integer amount.
export const parseBudgetInput = (raw) => String(raw ?? '').replace(/\D/g, '');

export const formatBudgetInput = (raw) => {
  const digits = parseBudgetInput(raw);
  return digits ? Number(digits).toLocaleString('es-MX') : '';
};
