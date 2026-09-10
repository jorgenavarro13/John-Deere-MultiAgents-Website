import { describe, expect, it } from 'vitest';
import {
  buildRecommendationPayload,
  findProfile,
  formatBudgetInput,
  formatDuration,
  formatFuel,
  hasSimilarResults,
  parseBudgetInput,
  recommendationSignature,
  shapeRecommendation,
  terrainRequest,
} from './fleetRecommendation.js';
import { mockRecommendationResponse } from './__fixtures__/fleetRecommendation.js';

const terrain = { rows: 16, columns: 22, hasObstacles: false, obstaclePct: 5 };

describe('request payload', () => {
  it('matches the contract in Servidor/web.py', () => {
    const payload = buildRecommendationPayload(terrain, '1500000', 'web-1');
    expect(payload).toEqual({
      schemaVersion: 1,
      requestId: 'web-1',
      terrain: { rows: 16, columns: 22, border: 1, minObstacles: 0, maxObstacles: 0 },
      budget: { amount: 1500000, currency: 'MXN' },
    });
  });

  it('never sends unit costs, a cost version or a computed fleet price', () => {
    const payload = buildRecommendationPayload(terrain, '1500000', 'web-1');
    const serialized = JSON.stringify(payload);
    for (const forbidden of ['harvesterCost', 'cartCost', 'costVersion', 'estimatedCost']) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it('turns the restricted-area percentage into an obstacle count', () => {
    const withObstacles = { rows: 10, columns: 10, hasObstacles: true, obstaclePct: 5 };
    expect(terrainRequest(withObstacles)).toMatchObject({ minObstacles: 5, maxObstacles: 5 });
  });

  it('sends an integer budget amount', () => {
    expect(buildRecommendationPayload(terrain, '1000.9', 'x').budget.amount).toBe(1000);
  });
});

describe('staleness signature', () => {
  it('changes when the terrain changes', () => {
    const before = recommendationSignature(terrain, '1000');
    expect(recommendationSignature({ ...terrain, rows: 20 }, '1000')).not.toBe(before);
    expect(recommendationSignature({ ...terrain, hasObstacles: true }, '1000')).not.toBe(before);
  });

  it('changes when the budget changes', () => {
    expect(recommendationSignature(terrain, '1000')).not.toBe(
      recommendationSignature(terrain, '2000')
    );
  });

  it('is stable for the same inputs', () => {
    expect(recommendationSignature(terrain, '1000')).toBe(
      recommendationSignature({ ...terrain }, 1000)
    );
  });
});

describe('shaping the response', () => {
  it('picks the balanced profile as the main recommendation', () => {
    const shaped = shapeRecommendation(mockRecommendationResponse());
    expect(shaped.main).toMatchObject({ harvesters: 3, carts: 3, estimatedCost: 1140000 });
    expect(shaped.alternatives).toHaveLength(3);
  });

  it('merges profiles that describe the same fleet into one card', () => {
    const response = mockRecommendationResponse();
    // Both "lower consumption" and "minimum machinery" land on 1H/1C.
    response.profiles[1] = { ...response.profiles[2], profile: 'lower_consumption' };
    const shaped = shapeRecommendation(response);
    expect(shaped.alternatives).toHaveLength(2);
    const merged = shaped.alternatives.find((a) => a.profiles.length > 1);
    expect(merged.profiles).toEqual(['lower_consumption', 'minimum_machinery']);
    expect(merged.title).toBe('Menor consumo y Menor maquinaria');
  });

  it('drops an alternative that repeats the main fleet', () => {
    const response = mockRecommendationResponse();
    response.profiles[3] = { ...response.profiles[0], profile: 'minimum_duration' };
    const shaped = shapeRecommendation(response);
    expect(shaped.alternatives.map((a) => a.profile)).toEqual([
      'lower_consumption',
      'minimum_machinery',
    ]);
  });

  it('never offers an option the budget does not cover', () => {
    const response = mockRecommendationResponse();
    response.profiles[3] = {
      ...response.profiles[3],
      estimatedCost: 9000000,
      budgetRemaining: -7500000,
    };
    const shaped = shapeRecommendation(response);
    expect(shaped.alternatives.map((a) => a.profile)).not.toContain('minimum_duration');
    expect(shaped.alternatives.every((a) => a.budgetRemaining >= 0)).toBe(true);
  });

  it('returns nothing usable when no balanced profile survives', () => {
    expect(shapeRecommendation({ profiles: [], budget: { amount: 10 } })).toBeNull();
  });

  it('flags close results instead of talking about confidence', () => {
    const main = { metrics: { duration: 100 } };
    expect(hasSimilarResults(main, [{ metrics: { duration: 103 } }])).toBe(true);
    expect(hasSimilarResults(main, [{ metrics: { duration: 180 } }])).toBe(false);
  });

  it('finds the card behind a stored profile name', () => {
    const shaped = shapeRecommendation(mockRecommendationResponse());
    expect(findProfile(shaped, 'balanced')).toBe(shaped.main);
    expect(findProfile(shaped, 'minimum_duration').carts).toBe(3);
    expect(findProfile(shaped, 'nope')).toBeNull();
  });
});

describe('formatting', () => {
  it('keeps only digits in the budget field', () => {
    expect(parseBudgetInput('$1,200,000 MXN')).toBe('1200000');
    expect(parseBudgetInput('')).toBe('');
  });

  it('groups thousands as the user types', () => {
    expect(formatBudgetInput('1500000')).toBe('1,500,000');
    expect(formatBudgetInput('')).toBe('');
  });

  it('states duration and fuel in plain units', () => {
    expect(formatDuration(265.4)).toBe('265 ciclos');
    expect(formatFuel(519.85)).toBe('520 L');
    expect(formatDuration(undefined)).toBe('—');
  });
});

describe('responsive layout', () => {
  // The step is rendered by the wizard at full width and on a phone. jsdom has
  // no layout engine, so the guarantee is asserted on the stylesheet itself:
  // every multi-column grid collapses and the buttons go full width.
  it('collapses the step to a single column on small screens', async () => {
    const { readFileSync } = await import('node:fs');
    const css = readFileSync('src/pages/Simulation/Fleet.css', 'utf8');

    const mobile = css.slice(css.indexOf('@media (max-width: 768px)'));
    expect(mobile).toContain('.fleet-modes');
    expect(mobile).toContain('flex-direction: column');
    expect(mobile).toContain('.fleet-indicators');
    expect(mobile).toContain('.fleet-alternatives');
    expect(mobile).toMatch(/grid-template-columns:\s*1fr/);
    expect(mobile).toMatch(/\.fleet-actions \.jd-button \{[^}]*width: 100%/);
    // The primary action comes first once the row becomes a column.
    expect(mobile).toContain('flex-direction: column-reverse');

    // No declaration pins a fixed width that would overflow a phone; the only
    // pixel width in the file is the breakpoint itself.
    expect(css).not.toMatch(/^\s+(?:min-|max-)?width:\s*\d{3,}px/m);
    // The grids size themselves from the viewport instead.
    expect(css).toContain('repeat(auto-fit, minmax(');
  });
});

describe('reading the numbers for the card', () => {
  it('bands repeated traffic by field size, not by raw count', async () => {
    const { terrainImpact } = await import('./fleetRecommendation.js');
    // The same 300 re-entries mean very different things on two fields.
    expect(terrainImpact(300, 1000)).toBe('Tránsito bajo');
    expect(terrainImpact(300, 300)).toBe('Tránsito moderado');
    expect(terrainImpact(300, 100)).toBe('Tránsito alto');
    expect(terrainImpact(undefined, 100)).toBeNull();
    expect(terrainImpact(10, 0)).toBeNull();
  });

  it('reports the share of the budget the fleet uses', async () => {
    const { budgetShare } = await import('./fleetRecommendation.js');
    expect(budgetShare(760000, 2000000)).toBe(38);
    expect(budgetShare(1140000, 1500000)).toBe(76);
    expect(budgetShare(100, 0)).toBe(0);
  });

  it('carries the derived figures on the shaped main card', () => {
    const shaped = shapeRecommendation(mockRecommendationResponse());
    expect(shaped.main.share).toBe(76);
    expect(shaped.main.impact).toBe('Tránsito bajo');
    expect(shaped.reason).toBe(
      'Esta configuración equilibra tiempo de trabajo, consumo y uso de maquinaria.'
    );
  });
});
