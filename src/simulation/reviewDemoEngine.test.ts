import { describe, expect, it } from 'vitest';
import {
  DEFAULT_REVIEW_DEMO_CONFIG,
  calculateRoute,
  exportDemoResultCsv,
  runReviewDemoScenario,
  REVIEW_DEMO_NODES,
} from './reviewDemoEngine';
import { positionAt, advanceClock, runExperiments } from './playback';

describe('Review 2 digital twin demo engine', () => {
  it('agrees on shortest distance for every pair with Dijkstra and A*', () => {
    for (const a of REVIEW_DEMO_NODES) for (const b of REVIEW_DEMO_NODES) {
      expect(calculateRoute(a.id, b.id, 'astar', DEFAULT_REVIEW_DEMO_CONFIG).distanceKm).toBe(calculateRoute(a.id, b.id, 'dijkstra', DEFAULT_REVIEW_DEMO_CONFIG).distanceKm);
    }
  });

  it('never discounts congestion just because traffic-aware routing is selected', () => {
    const config = { ...DEFAULT_REVIEW_DEMO_CONFIG, signalPriorityEnabled: false };
    const baseline = calculateRoute('koramangala_5th', 'sony_signal', 'dijkstra', config);
    const adaptive = calculateRoute('koramangala_5th', 'sony_signal', 'traffic-aware', config);
    expect(adaptive.nodeIds).toEqual(baseline.nodeIds);
    expect(adaptive.congestionDelaySec).toBe(baseline.congestionDelaySec);
    expect(adaptive.travelTimeSec).toBe(baseline.travelTimeSec);
  });

  it('interpolates by segment time and respects pause, completion and reset', () => {
    const route = calculateRoute('koramangala_5th', 'sony_signal', 'dijkstra', DEFAULT_REVIEW_DEMO_CONFIG);
    const segment = route.segments[0];
    expect(positionAt(route, segment.driveSec / 2).position[0]).toBeCloseTo((segment.from[0] + segment.to[0]) / 2);
    expect(positionAt(route, segment.driveSec + 1).phase).toBe('Normal signal wait');
    expect(advanceClock(10, 5, 100, false)).toBe(10);
    expect(advanceClock(98, 5, 100, true)).toBe(100);
    expect(positionAt(route, 0).position).toEqual(segment.from);
  });

  it('rejects invalid fleet counts and locations', () => {
    expect(() => runReviewDemoScenario({ ...DEFAULT_REVIEW_DEMO_CONFIG, ambulanceCount: 0 })).toThrow();
    expect(() => calculateRoute('missing', 'st_johns', 'astar', DEFAULT_REVIEW_DEMO_CONFIG)).toThrow();
  });

  it('uses the seed and computes response metrics independently of hospital travel', () => {
    const a = runReviewDemoScenario(DEFAULT_REVIEW_DEMO_CONFIG);
    const b = runReviewDemoScenario({ ...DEFAULT_REVIEW_DEMO_CONFIG, hospitalNodeId: 'nimhans' });
    expect(a.baselineResponseSec).toBe(b.baselineResponseSec);
    expect(a.optimizedResponseSec).toBe(b.optimizedResponseSec);
    expect(a.baseline.travelTimeSec).not.toBe(b.baseline.travelTimeSec);
    const c = runReviewDemoScenario({ ...DEFAULT_REVIEW_DEMO_CONFIG, seed: 99 });
    expect(a.baseline.travelTimeSec).not.toBe(c.baseline.travelTimeSec);
    const batch = runExperiments(5);
    expect(batch.baselineMean).toBe(batch.rows.reduce((sum, row) => sum + row.baseline, 0) / 5);
  });
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
