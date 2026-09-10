// A recorded `/api/fleet-recommendations` success, shaped exactly like the
// payload `recommend_fleet_profiles` builds in
// `johndeere/recommendation/evaluator.py`. Test fixture only — nothing in the
// application imports this module.
export function mockRecommendationResponse(overrides = {}) {
  return {
    schemaVersion: 1,
    requestId: 'web-test',
    status: 'completed',
    costVersion: 'test-v1',
    terrain: {
      rows: 16,
      columns: 22,
      foodRatio: 1.0,
      border: 1,
      minObstacles: 0,
      maxObstacles: 0,
    },
    budget: { amount: 1500000, currency: 'MXN' },
    profiles: [
      {
        profile: 'balanced',
        harvesters: 3,
        carts: 3,
        estimatedCost: 1140000,
        budgetRemaining: 360000,
        metrics: {
          duration: 265.0,
          fuel: 519.85,
          co2: 1393.2,
          repeatedTraffic: 12.0,
          harvesterWaitRate: 0.0812,
        },
      },
      {
        profile: 'lower_consumption',
        harvesters: 2,
        carts: 2,
        estimatedCost: 760000,
        budgetRemaining: 740000,
        metrics: {
          duration: 361.0,
          fuel: 430.2,
          co2: 1152.9,
          repeatedTraffic: 7.0,
          harvesterWaitRate: 0.1103,
        },
      },
      {
        profile: 'minimum_machinery',
        harvesters: 1,
        carts: 1,
        estimatedCost: 380000,
        budgetRemaining: 1120000,
        metrics: {
          duration: 690.0,
          fuel: 465.4,
          co2: 1247.3,
          repeatedTraffic: 2.0,
          harvesterWaitRate: 0.0201,
        },
      },
      {
        profile: 'minimum_duration',
        harvesters: 4,
        carts: 3,
        estimatedCost: 1440000,
        budgetRemaining: 60000,
        metrics: {
          duration: 212.0,
          fuel: 611.7,
          co2: 1639.4,
          repeatedTraffic: 21.0,
          harvesterWaitRate: 0.1547,
        },
      },
    ],
    ...overrides,
  };
}
