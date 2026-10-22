import { Ambulance, Hospital, LocationCoords } from '../types';
import { INITIAL_AMBULANCES, INITIAL_HOSPITALS } from '../lib/mockData';
import { predictTravelSeconds } from './trafficPredictor';

export type RoutingMethod = 'dijkstra' | 'astar' | 'traffic-aware';
export type TrafficIntensity = 'low' | 'medium' | 'high';
export type WeatherMode = 'clear' | 'rain';

export interface RoadNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface RoadEdge {
  from: string;
  to: string;
  distanceKm: number;
  freeFlowKmph: number;
  congestion: number;
  signalDelaySec: number;
  controlledIntersection?: string;
}

export interface RouteResult {
  segments: Array<{ from: [number, number]; to: [number, number]; driveSec: number; waitSec: number }>;
  nodeIds: string[];
  coordinates: [number, number][];
  distanceKm: number;
  travelTimeSec: number;
  signalWaitSec: number;
  congestionDelaySec: number;
  priorityEvents: SignalPriorityEvent[];
  method: RoutingMethod;
}

export interface SignalPriorityEvent {
  intersection: string;
  etaSec: number;
  normalDelaySec: number;
  priorityDelaySec: number;
  action: string;
}

export interface DemoScenarioConfig {
  startNodeId?: string;
  incidentNodeId: string;
  hospitalNodeId: string;
  trafficIntensity: TrafficIntensity;
  weather: WeatherMode;
  signalPriorityEnabled: boolean;
  routingMethod: RoutingMethod;
  ambulanceCount: number;
  normalVehicleCount: number;
  seed: number;
}

export interface CandidateRoute {
  label: string;
  method: RoutingMethod;
  travelTimeSec: number;
  distanceKm: number;
  signalWaitSec: number;
  congestionDelaySec: number;
}

export interface DemoRunResult {
  baselineResponseSec: number;
  optimizedResponseSec: number;
  baselineAmbulance: Ambulance;
  config: DemoScenarioConfig;
  incident: RoadNode;
  hospital: Hospital;
  selectedAmbulance: Ambulance;
  baseline: RouteResult;
  optimized: RouteResult;
  candidateRoutes: CandidateRoute[];
  responseImprovementPct: number;
  distanceDeltaKm: number;
  computationTimeMs: number;
  explanation: string[];
  ambulanceComparisons: Array<{
    vehicleNumber: string;
    baselineEtaSec: number;
    optimizedEtaSec: number;
    status: string;
  }>;
}

export const DEFAULT_REVIEW_DEMO_CONFIG: DemoScenarioConfig = {
  incidentNodeId: 'koramangala_5th',
  hospitalNodeId: 'st_johns',
  trafficIntensity: 'high',
  weather: 'rain',
  signalPriorityEnabled: true,
  routingMethod: 'traffic-aware',
  ambulanceCount: 4,
  normalVehicleCount: 260,
  seed: 42,
};

export const REVIEW_DEMO_NODES: RoadNode[] = [
  { id: 'sony_signal', name: 'Sony World Signal', lat: 12.9369, lng: 77.6268 },
  { id: 'koramangala_5th', name: 'Koramangala 5th Block Incident', lat: 12.9360, lng: 77.6250 },
  { id: 'forum_junction', name: 'Forum Mall Junction', lat: 12.9344, lng: 77.6118 },
  { id: 'st_johns', name: 'St. Johns Medical College Hospital', lat: 12.9304, lng: 77.6200 },
  { id: 'silk_board', name: 'Silk Board Junction', lat: 12.9177, lng: 77.6239 },
  { id: 'madiwala', name: 'Madiwala Checkpost', lat: 12.9218, lng: 77.6177 },
  { id: 'ejipura', name: 'Ejipura Main Road', lat: 12.9455, lng: 77.6261 },
  { id: 'domlur', name: 'Domlur Flyover', lat: 12.9609, lng: 77.6387 },
  { id: 'indiranagar', name: 'Indiranagar 100 ft Road', lat: 12.9719, lng: 77.6412 },
  { id: 'manipal_oar', name: 'Manipal Hospital Old Airport Road', lat: 12.9577, lng: 77.6475 },
  { id: 'nimhans', name: 'NIMHANS Neuro & Trauma Center', lat: 12.9392, lng: 77.5959 },
  { id: 'jayanagar', name: 'Jayanagar 4th Block', lat: 12.9250, lng: 77.5938 },
];

export const REVIEW_DEMO_EDGES: RoadEdge[] = [
  { from: 'koramangala_5th', to: 'sony_signal', distanceKm: 0.28, freeFlowKmph: 24, congestion: 1.3, signalDelaySec: 45, controlledIntersection: 'Sony World Signal' },
  { from: 'sony_signal', to: 'st_johns', distanceKm: 0.9, freeFlowKmph: 26, congestion: 1.15, signalDelaySec: 35, controlledIntersection: 'St. Johns Main Gate' },
  { from: 'koramangala_5th', to: 'forum_junction', distanceKm: 1.45, freeFlowKmph: 28, congestion: 1.55, signalDelaySec: 70, controlledIntersection: 'Forum Junction' },
  { from: 'forum_junction', to: 'st_johns', distanceKm: 1.05, freeFlowKmph: 24, congestion: 1.35, signalDelaySec: 50, controlledIntersection: 'Tavarekere Signal' },
  { from: 'forum_junction', to: 'nimhans', distanceKm: 2.2, freeFlowKmph: 30, congestion: 1.28, signalDelaySec: 45, controlledIntersection: 'Dairy Circle' },
  { from: 'nimhans', to: 'jayanagar', distanceKm: 2.1, freeFlowKmph: 32, congestion: 1.12, signalDelaySec: 35, controlledIntersection: 'South End Circle' },
  { from: 'st_johns', to: 'madiwala', distanceKm: 1.2, freeFlowKmph: 26, congestion: 1.42, signalDelaySec: 55, controlledIntersection: 'Madiwala Underpass' },
  { from: 'madiwala', to: 'silk_board', distanceKm: 1.1, freeFlowKmph: 22, congestion: 1.8, signalDelaySec: 95, controlledIntersection: 'Silk Board Signal' },
  { from: 'sony_signal', to: 'ejipura', distanceKm: 1.0, freeFlowKmph: 25, congestion: 1.2, signalDelaySec: 38, controlledIntersection: 'Ejipura Junction' },
  { from: 'ejipura', to: 'domlur', distanceKm: 2.4, freeFlowKmph: 34, congestion: 1.22, signalDelaySec: 48, controlledIntersection: 'Domlur Flyover Ramp' },
  { from: 'domlur', to: 'manipal_oar', distanceKm: 1.45, freeFlowKmph: 32, congestion: 1.18, signalDelaySec: 42, controlledIntersection: 'Old Airport Road Signal' },
  { from: 'domlur', to: 'indiranagar', distanceKm: 1.6, freeFlowKmph: 30, congestion: 1.25, signalDelaySec: 44, controlledIntersection: '100 ft Road Signal' },
  { from: 'indiranagar', to: 'manipal_oar', distanceKm: 2.1, freeFlowKmph: 30, congestion: 1.38, signalDelaySec: 50, controlledIntersection: 'Kodihalli Signal' },
  { from: 'madiwala', to: 'jayanagar', distanceKm: 3.25, freeFlowKmph: 31, congestion: 1.22, signalDelaySec: 42, controlledIntersection: 'BTM Main Signal' },
];

const nodeById = new Map(REVIEW_DEMO_NODES.map(node => [node.id, node]));

function multiplierFor(config: Pick<DemoScenarioConfig, 'trafficIntensity' | 'weather' | 'normalVehicleCount'>) {
  const traffic = config.trafficIntensity === 'low' ? 0.88 : config.trafficIntensity === 'medium' ? 1.08 : 1.32;
  const weather = config.weather === 'rain' ? 1.16 : 1;
  const vehicleLoad = 1 + Math.min(0.32, Math.max(0, config.normalVehicleCount - 120) / 1000);
  return traffic * weather * vehicleLoad;
}

function haversineKm(a: LocationCoords, b: LocationCoords) {
  const radiusKm = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * radiusKm * Math.asin(Math.sqrt(h));
}

function edgeKey(a: string, b: string) {
  return `${a}->${b}`;
}

function adjacency() {
  const graph = new Map<string, RoadEdge[]>();
  REVIEW_DEMO_EDGES.forEach(edge => {
    graph.set(edge.from, [...(graph.get(edge.from) || []), edge]);
    graph.set(edge.to, [...(graph.get(edge.to) || []), { ...edge, from: edge.to, to: edge.from }]);
  });
  return graph;
}

function routeEdgeMap() {
  const map = new Map<string, RoadEdge>();
  REVIEW_DEMO_EDGES.forEach(edge => {
    map.set(edgeKey(edge.from, edge.to), edge);
    map.set(edgeKey(edge.to, edge.from), { ...edge, from: edge.to, to: edge.from });
  });
  return map;
}

function trafficFactor(edge: RoadEdge, config: DemoScenarioConfig) {
  // Stable per-road demand variation; both algorithms see identical conditions.
  const hash = [...[edge.from, edge.to].sort().join(':')].reduce((n, c) => Math.imul(n ^ c.charCodeAt(0), 16777619), config.seed);
  return multiplierFor(config) * (0.85 + (Math.abs(hash) % 301) / 1000);
}

function edgeCost(edge: RoadEdge, method: RoutingMethod, config: DemoScenarioConfig) {
  const freeFlowSec = (edge.distanceKm / edge.freeFlowKmph) * 3600;
  if (method !== 'traffic-aware') {
    return edge.distanceKm;
  }

  const congestionDelay = predictTravelSeconds(freeFlowSec, edge.congestion, config.trafficIntensity, config.weather === 'rain', config.normalVehicleCount) - freeFlowSec;
  const priorityDelay =
    config.signalPriorityEnabled && method === 'traffic-aware'
      ? Math.min(edge.signalDelaySec, 10 + 3 + 2)
      : edge.signalDelaySec;

  return freeFlowSec + Math.max(0, congestionDelay) + priorityDelay;
}

function shortestPath(startId: string, endId: string, method: RoutingMethod, config: DemoScenarioConfig) {
  if (!nodeById.has(startId) || !nodeById.has(endId)) throw new Error('Unknown road node');
  const heuristicScale = Math.min(...REVIEW_DEMO_EDGES.map(edge => edge.distanceKm / haversineKm(nodeById.get(edge.from)!, nodeById.get(edge.to)!)));
  const graph = adjacency();
  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const open = new Set(REVIEW_DEMO_NODES.map(node => node.id));

  REVIEW_DEMO_NODES.forEach(node => {
    distances.set(node.id, Number.POSITIVE_INFINITY);
    previous.set(node.id, null);
  });
  distances.set(startId, 0);

  while (open.size > 0) {
    let current: string | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    open.forEach(nodeId => {
      const distance = distances.get(nodeId) ?? Number.POSITIVE_INFINITY;
      const heuristic =
        method === 'astar'
          ? haversineKm(nodeById.get(nodeId)!, nodeById.get(endId)!) * heuristicScale
          : 0;
      if (distance + heuristic < bestScore) {
        bestScore = distance + heuristic;
        current = nodeId;
      }
    });

    if (!current || current === endId) break;
    open.delete(current);

    (graph.get(current) || []).forEach(edge => {
      if (!open.has(edge.to)) return;
      const alt = (distances.get(current!) ?? 0) + edgeCost(edge, method, config);
      if (alt < (distances.get(edge.to) ?? Number.POSITIVE_INFINITY)) {
        distances.set(edge.to, alt);
        previous.set(edge.to, current);
      }
    });
  }

  const path: string[] = [];
  let cursor: string | null = endId;
  while (cursor) {
    path.unshift(cursor);
    cursor = previous.get(cursor) || null;
  }

  if (path[0] !== startId) {
    throw new Error('No connected route');
  }
  return path;
}

export function calculateRoute(startId: string, endId: string, method: RoutingMethod, config: DemoScenarioConfig): RouteResult {
  const path = shortestPath(startId, endId, method, config);
  const edgeMap = routeEdgeMap();
  const segments: RouteResult['segments'] = [];
  let distanceKm = 0;
  let travelTimeSec = 0;
  let signalWaitSec = 0;
  let congestionDelaySec = 0;
  const priorityEvents: SignalPriorityEvent[] = [];

  path.slice(0, -1).forEach((nodeId, index) => {
    const nextId = path[index + 1];
    const edge = edgeMap.get(edgeKey(nodeId, nextId));
    if (!edge) {
      const a = nodeById.get(nodeId)!;
      const b = nodeById.get(nextId)!;
      const fallbackKm = haversineKm(a, b) * 1.28;
      const fallbackSec = (fallbackKm / 25) * 3600;
      distanceKm += fallbackKm;
      travelTimeSec += fallbackSec;
      return;
    }

    const freeFlowSec = (edge.distanceKm / edge.freeFlowKmph) * 3600;
    const congestionSec = Math.max(0, freeFlowSec * (edge.congestion * trafficFactor(edge, config) - 1));
    const priorityDelay =
      config.signalPriorityEnabled && method === 'traffic-aware'
        ? Math.min(edge.signalDelaySec, 10 + 3 + 2)
        : edge.signalDelaySec;

    distanceKm += edge.distanceKm;
    congestionDelaySec += congestionSec;
    signalWaitSec += priorityDelay;
    travelTimeSec += freeFlowSec + congestionSec + priorityDelay;
    const from = nodeById.get(nodeId)!;
    const to = nodeById.get(nextId)!;
    segments.push({ from: [from.lat, from.lng], to: [to.lat, to.lng], driveSec: freeFlowSec + congestionSec, waitSec: priorityDelay });

    if (config.signalPriorityEnabled && method === 'traffic-aware' && edge.controlledIntersection) {
      priorityEvents.push({
        intersection: edge.controlledIntersection,
        etaSec: Math.round(travelTimeSec),
        normalDelaySec: edge.signalDelaySec,
        priorityDelaySec: priorityDelay,
        action: 'Synthetic timing: 10s minimum phase, 3s yellow, 2s all-red, priority crossing, restore.',
      });
    }
  });

  return {
    segments,
    nodeIds: path,
    coordinates: path.map(nodeId => {
      const node = nodeById.get(nodeId)!;
      return [node.lat, node.lng] as [number, number];
    }),
    distanceKm: Number(distanceKm.toFixed(2)),
    travelTimeSec: Math.ceil(travelTimeSec),
    signalWaitSec: Math.round(signalWaitSec),
    congestionDelaySec: Math.round(congestionDelaySec),
    priorityEvents,
    method,
  };
}

function nearestNode(coords: LocationCoords) {
  return REVIEW_DEMO_NODES.reduce((best, node) => {
    const distance = haversineKm(coords, node);
    return distance < best.distanceKm ? { node, distanceKm: distance } : best;
  }, { node: REVIEW_DEMO_NODES[0], distanceKm: Number.POSITIVE_INFINITY }).node;
}

function hospitalFromNode(nodeId: string) {
  const target = nodeById.get(nodeId)!;
  return INITIAL_HOSPITALS.reduce((best, hospital) => {
    const score = haversineKm(target, { lat: hospital.lat, lng: hospital.lng });
    return score < best.score ? { hospital, score } : best;
  }, { hospital: INITIAL_HOSPITALS[0], score: Number.POSITIVE_INFINITY }).hospital;
}

function routeFromAmbulance(ambulance: Ambulance, incidentNodeId: string, method: RoutingMethod, config: DemoScenarioConfig) {
  const startNode = nearestNode({ lat: ambulance.current_lat, lng: ambulance.current_lng });
  const route = calculateRoute(startNode.id, incidentNodeId, method, config);
  const snapPenaltySec = Math.round(haversineKm({ lat: ambulance.current_lat, lng: ambulance.current_lng }, startNode) * 95);
  const connectorKm = haversineKm({ lat: ambulance.current_lat, lng: ambulance.current_lng }, startNode);
  return { ...route, distanceKm: route.distanceKm + connectorKm, coordinates: [[ambulance.current_lat, ambulance.current_lng] as [number, number], ...route.coordinates], segments: [{ from: [ambulance.current_lat, ambulance.current_lng] as [number, number], to: [startNode.lat, startNode.lng] as [number, number], driveSec: snapPenaltySec, waitSec: 0 }, ...route.segments], travelTimeSec: route.travelTimeSec + snapPenaltySec };
}

export function runReviewDemoScenario(config: DemoScenarioConfig = DEFAULT_REVIEW_DEMO_CONFIG): DemoRunResult {
  if (!Number.isInteger(config.ambulanceCount) || config.ambulanceCount < 1 || config.ambulanceCount > 10) throw new Error('Fleet size must be 1 to 10');
  if (!Number.isFinite(config.normalVehicleCount) || config.normalVehicleCount < 0 || config.normalVehicleCount > 1000) throw new Error('Vehicle demand must be 0 to 1000');
  if (!Number.isInteger(config.seed)) throw new Error('Seed must be an integer');
  if (!nodeById.has(config.incidentNodeId) || !nodeById.has(config.hospitalNodeId)) throw new Error('Invalid scenario location');
  const started = performance.now();
  const incident = nodeById.get(config.incidentNodeId) || nodeById.get(DEFAULT_REVIEW_DEMO_CONFIG.incidentNodeId)!;
  const hospital = hospitalFromNode(config.hospitalNodeId);
  const candidateAmbulances = INITIAL_AMBULANCES
    .filter(ambulance => ambulance.status === 'idle')
    .slice(0, config.ambulanceCount).map((ambulance, index) => {
      const node = config.startNodeId ? nodeById.get(config.startNodeId) : REVIEW_DEMO_NODES[(index * 3 + 2) % REVIEW_DEMO_NODES.length];
      if (!node) throw new Error('Invalid ambulance starting node');
      return { ...ambulance, current_lat: node.lat, current_lng: node.lng };
    });

  const ambulanceComparisons = candidateAmbulances.map(ambulance => {
    const baselineEta = routeFromAmbulance(ambulance, incident.id, 'dijkstra', { ...config, signalPriorityEnabled: false });
    const optimizedEta = routeFromAmbulance(ambulance, incident.id, config.routingMethod, config);
    return {
      vehicleNumber: ambulance.vehicle_number,
      baselineEtaSec: baselineEta.travelTimeSec,
      optimizedEtaSec: optimizedEta.travelTimeSec,
      status: ambulance.status,
    };
  });

  const selectedComparison = ambulanceComparisons.reduce((best, current) =>
    current.optimizedEtaSec < best.optimizedEtaSec ? current : best
  );
  const selectedAmbulance = candidateAmbulances.find(ambulance => ambulance.vehicle_number === selectedComparison.vehicleNumber) || candidateAmbulances[0];
  const selectedStartNode = nearestNode({ lat: selectedAmbulance.current_lat, lng: selectedAmbulance.current_lng });

  const baselineAmbulance = [...candidateAmbulances].sort((a, b) => routeFromAmbulance(a, incident.id, 'dijkstra', config).distanceKm - routeFromAmbulance(b, incident.id, 'dijkstra', config).distanceKm)[0];
  const baselineToPatient = routeFromAmbulance(baselineAmbulance, incident.id, 'dijkstra', {
    ...config,
    signalPriorityEnabled: false,
    routingMethod: 'dijkstra',
  });
  const baselineToHospital = calculateRoute(incident.id, config.hospitalNodeId, 'dijkstra', {
    ...config,
    signalPriorityEnabled: false,
    routingMethod: 'dijkstra',
  });
  const optimizedToPatient = routeFromAmbulance(selectedAmbulance, incident.id, config.routingMethod, config);
  const optimizedToHospital = calculateRoute(incident.id, config.hospitalNodeId, config.routingMethod, config);

  const baseline: RouteResult = {
    ...baselineToHospital,
    segments: [...baselineToPatient.segments, ...baselineToHospital.segments],
    nodeIds: [...baselineToPatient.nodeIds, ...baselineToHospital.nodeIds.slice(1)],
    coordinates: [...baselineToPatient.coordinates, ...baselineToHospital.coordinates.slice(1)],
    distanceKm: Number((baselineToPatient.distanceKm + baselineToHospital.distanceKm).toFixed(2)),
    travelTimeSec: baselineToPatient.travelTimeSec + baselineToHospital.travelTimeSec,
    signalWaitSec: baselineToPatient.signalWaitSec + baselineToHospital.signalWaitSec,
    congestionDelaySec: baselineToPatient.congestionDelaySec + baselineToHospital.congestionDelaySec,
    priorityEvents: [],
    method: 'dijkstra',
  };

  const optimized: RouteResult = {
    ...optimizedToHospital,
    segments: [...optimizedToPatient.segments, ...optimizedToHospital.segments],
    nodeIds: [...optimizedToPatient.nodeIds, ...optimizedToHospital.nodeIds.slice(1)],
    coordinates: [...optimizedToPatient.coordinates, ...optimizedToHospital.coordinates.slice(1)],
    distanceKm: Number((optimizedToPatient.distanceKm + optimizedToHospital.distanceKm).toFixed(2)),
    travelTimeSec: optimizedToPatient.travelTimeSec + optimizedToHospital.travelTimeSec,
    signalWaitSec: optimizedToPatient.signalWaitSec + optimizedToHospital.signalWaitSec,
    congestionDelaySec: optimizedToPatient.congestionDelaySec + optimizedToHospital.congestionDelaySec,
    priorityEvents: [...optimizedToPatient.priorityEvents, ...optimizedToHospital.priorityEvents.map(event => ({ ...event, etaSec: event.etaSec + optimizedToPatient.travelTimeSec }))],
    method: config.routingMethod,
  };

  const candidateRoutes: CandidateRoute[] = (['dijkstra', 'astar', 'traffic-aware'] as RoutingMethod[]).map(method => {
    const route = calculateRoute(incident.id, config.hospitalNodeId, method, {
      ...config,
      signalPriorityEnabled: method === 'traffic-aware' ? config.signalPriorityEnabled : false,
    });
    return {
      label: method === 'dijkstra' ? 'Conventional shortest path' : method === 'astar' ? 'A* heuristic route' : 'AmbuNet traffic-aware corridor',
      method,
      travelTimeSec: route.travelTimeSec,
      distanceKm: route.distanceKm,
      signalWaitSec: route.signalWaitSec,
      congestionDelaySec: route.congestionDelaySec,
    };
  });

  const responseImprovementPct = baselineToPatient.travelTimeSec > 0 ? Number((((baselineToPatient.travelTimeSec - optimizedToPatient.travelTimeSec) / baselineToPatient.travelTimeSec) * 100).toFixed(1)) : 0;
  const computationTimeMs = Number((performance.now() - started).toFixed(2));

  return {
    baselineResponseSec: baselineToPatient.travelTimeSec,
    optimizedResponseSec: optimizedToPatient.travelTimeSec,
    baselineAmbulance,
    config,
    incident,
    hospital,
    selectedAmbulance,
    baseline,
    optimized,
    candidateRoutes,
    responseImprovementPct,
    distanceDeltaKm: Number((optimized.distanceKm - baseline.distanceKm).toFixed(2)),
    computationTimeMs,
    ambulanceComparisons,
    explanation: [
      `${selectedAmbulance.vehicle_number} selected because its optimized ETA to the incident is ${selectedComparison.optimizedEtaSec} seconds, the best among ${candidateAmbulances.length} available units.`,
      `The optimized corridor uses ${optimized.method} routing with ${config.trafficIntensity} traffic, ${config.weather} weather, and ${config.normalVehicleCount} simulated normal vehicles.`,
      `Modeled signal waiting: baseline ${baseline.signalWaitSec}s; selected method ${optimized.signalWaitSec}s. Congestion costs are identical for the same road and seed.`,
      `Selected hospital: ${hospital.name}, matched from the configured hospital node with emergency capability and available seeded bed capacity.`,
    ],
  };
}

export function exportDemoResultCsv(result: DemoRunResult) {
  return [
    ['Metric', 'Conventional Baseline', 'AmbuNet Optimized'],
    ['Response time seconds', result.baselineResponseSec, result.optimizedResponseSec],
    ['Total mission seconds', result.baseline.travelTimeSec, result.optimized.travelTimeSec],
    ['Seed', result.config.seed, result.config.seed],
    ['Data source', 'Synthetic schematic graph', 'Synthetic schematic graph'],
    ['Travel distance km', result.baseline.distanceKm, result.optimized.distanceKm],
    ['Signal waiting seconds', result.baseline.signalWaitSec, result.optimized.signalWaitSec],
    ['Congestion delay seconds', result.baseline.congestionDelaySec, result.optimized.congestionDelaySec],
    ['Priority events', result.baseline.priorityEvents.length, result.optimized.priorityEvents.length],
    ['Computation time ms', '-', result.computationTimeMs],
    ['Measured improvement percent', '0', result.responseImprovementPct],
  ].map(row => row.join(',')).join('\n');
}
