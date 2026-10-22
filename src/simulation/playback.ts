import { RouteResult, DEFAULT_REVIEW_DEMO_CONFIG, DemoScenarioConfig, REVIEW_DEMO_NODES, runReviewDemoScenario } from './reviewDemoEngine';

export function positionAt(route: RouteResult, elapsed: number) {
  let remaining = Math.max(0, elapsed);
  for (const segment of route.segments) {
    if (remaining < segment.driveSec) {
      const fraction = remaining / segment.driveSec;
      return { position: segment.from.map((value, i) => value + (segment.to[i] - value) * fraction) as [number, number], phase: 'Driving' };
    }
    remaining -= segment.driveSec;
    if (remaining < segment.waitSec) {
      const priority = route.method === 'traffic-aware' && route.priorityEvents.length > 0;
      const phase = !priority ? 'Normal signal wait' : remaining < 10 ? 'Minimum phase' : remaining < 13 ? 'Yellow clearance' : 'All-red clearance';
      return { position: segment.to, phase };
    }
    remaining -= segment.waitSec;
  }
  return { position: route.coordinates.at(-1)!, phase: 'Arrived' };
}

export function advanceClock(elapsed: number, delta: number, duration: number, running: boolean) {
  return running ? Math.min(duration, elapsed + Math.max(0, delta)) : elapsed;
}

export function runExperiments(count = 30, config: DemoScenarioConfig = DEFAULT_REVIEW_DEMO_CONFIG) {
  if (!Number.isInteger(count) || count < 1 || count > 1000) throw new Error('Experiment count must be 1 to 1000');
  const rows = Array.from({ length: count }, (_, index) => {
    const scenario = { ...config, seed: config.seed + index, incidentNodeId: REVIEW_DEMO_NODES[index % REVIEW_DEMO_NODES.length].id, trafficIntensity: (['low', 'medium', 'high'] as const)[index % 3], weather: (index % 2 ? 'rain' : 'clear') as 'rain' | 'clear' };
    const result = runReviewDemoScenario(scenario);
    return { seed: scenario.seed, incident: scenario.incidentNodeId, baseline: result.baselineResponseSec, optimized: result.optimizedResponseSec, computationMs: result.computationTimeMs };
  });
  const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
  const p90 = (values: number[]) => [...values].sort((a, b) => a - b)[Math.ceil(values.length * 0.9) - 1];
  const baselineMean = mean(rows.map(row => row.baseline));
  const optimizedMean = mean(rows.map(row => row.optimized));
  return { rows, baselineMean, optimizedMean, baselineP90: p90(rows.map(row => row.baseline)), optimizedP90: p90(rows.map(row => row.optimized)), improvement: baselineMean ? (baselineMean - optimizedMean) / baselineMean * 100 : 0 };
}
