import { describe, expect, it } from 'vitest';
import {
  DEFAULT_REVIEW_DEMO_CONFIG,
  calculateRoute,
  exportDemoResultCsv,
  runReviewDemoScenario,
} from './reviewDemoEngine';

describe('Review 2 digital twin demo engine', () => {
  it('calculates a valid Dijkstra baseline route', () => {
    const route = calculateRoute('koramangala_5th', 'st_johns', 'dijkstra', {
      ...DEFAULT_REVIEW_DEMO_CONFIG,
      signalPriorityEnabled: false,
    });

    expect(route.nodeIds[0]).toBe('koramangala_5th');
    expect(route.nodeIds.at(-1)).toBe('st_johns');
    expect(route.distanceKm).toBeGreaterThan(0);
    expect(route.travelTimeSec).toBeGreaterThan(0);
  });

  it('applies simulated signal priority only to the traffic-aware corridor', () => {
    const baseline = calculateRoute('koramangala_5th', 'st_johns', 'dijkstra', {
      ...DEFAULT_REVIEW_DEMO_CONFIG,
      signalPriorityEnabled: false,
    });
    const optimized = calculateRoute('koramangala_5th', 'st_johns', 'traffic-aware', {
      ...DEFAULT_REVIEW_DEMO_CONFIG,
      signalPriorityEnabled: true,
    });

    expect(optimized.priorityEvents.length).toBeGreaterThan(0);
    expect(optimized.signalWaitSec).toBeLessThan(baseline.signalWaitSec);
  });

  it('runs a deterministic review scenario with measurable comparison outputs', () => {
    const result = runReviewDemoScenario(DEFAULT_REVIEW_DEMO_CONFIG);
    const repeat = runReviewDemoScenario(DEFAULT_REVIEW_DEMO_CONFIG);

    expect(result.selectedAmbulance.vehicle_number).toBe(repeat.selectedAmbulance.vehicle_number);
    expect(result.baseline.travelTimeSec).toBe(repeat.baseline.travelTimeSec);
    expect(result.optimized.travelTimeSec).toBe(repeat.optimized.travelTimeSec);
    expect(result.candidateRoutes).toHaveLength(3);
    expect(result.explanation.length).toBeGreaterThanOrEqual(3);
  });

  it('exports a CSV report with baseline and optimized metrics', () => {
    const result = runReviewDemoScenario(DEFAULT_REVIEW_DEMO_CONFIG);
    const csv = exportDemoResultCsv(result);

    expect(csv).toContain('Conventional Baseline');
    expect(csv).toContain('AmbuNet Optimized');
    expect(csv).toContain(String(result.responseImprovementPct));
  });
});
