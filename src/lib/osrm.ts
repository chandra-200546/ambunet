import { LocationCoords, OSRMRouteResult } from '../types';
import { calculateHaversineDistance } from './haversine';

const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1/driving';

/**
 * Fetches turn-by-turn driving route and ETA between two coordinates using OSRM
 */
export async function getOSRMRoute(
  start: LocationCoords,
  end: LocationCoords
): Promise<OSRMRouteResult> {
  // Format is {lng1},{lat1};{lng2},{lat2}
  const url = `${OSRM_BASE_URL}/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=false`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`OSRM API error status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      throw new Error('No route found from OSRM');
    }

    const route = data.routes[0];
    const rawCoordinates: [number, number][] = route.geometry.coordinates; // [lng, lat]
    // Convert to Leaflet friendly [lat, lng] format
    const coordinates: [number, number][] = rawCoordinates.map(([lng, lat]) => [lat, lng]);

    const distanceMeters = route.distance || 0;
    const durationSeconds = Math.round(route.duration || 0);

    return {
      coordinates,
      rawCoordinates,
      distanceKm: Math.round((distanceMeters / 1000) * 100) / 100,
      durationSeconds,
      durationMinutes: Math.max(1, Math.round(durationSeconds / 60)),
      summary: route.legs?.[0]?.summary || 'Fastest emergency route'
    };
  } catch (err) {
    console.warn('OSRM public service fallback activated:', err);
    return generateFallbackRoute(start, end);
  }
}

/**
 * Generates an interpolated realistic road-like waypoint curve if OSRM is offline
 */
function generateFallbackRoute(
  start: LocationCoords,
  end: LocationCoords
): OSRMRouteResult {
  const straightDistanceKm = calculateHaversineDistance(start, end);
  const roadFactor = 1.28; // Roads are ~25-30% longer than straight line
  const estimatedDistanceKm = Math.round(straightDistanceKm * roadFactor * 10) / 10;
  
  // Estimate driving time at 45 km/h emergency speed
  const durationSeconds = Math.max(30, Math.round((estimatedDistanceKm / 45) * 3600));

  // Generate 20 intermediate points with slight curvature to mimic streets
  const steps = 24;
  const coordinates: [number, number][] = [];
  const rawCoordinates: [number, number][] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Manhattan-like or slight sine-offset curve
    const curveOffset = Math.sin(t * Math.PI) * 0.003;
    const lat = start.lat + (end.lat - start.lat) * t + curveOffset;
    const lng = start.lng + (end.lng - start.lng) * t - curveOffset * 0.7;

    coordinates.push([lat, lng]);
    rawCoordinates.push([lng, lat]);
  }

  return {
    coordinates,
    rawCoordinates,
    distanceKm: estimatedDistanceKm,
    durationSeconds,
    durationMinutes: Math.max(1, Math.round(durationSeconds / 60)),
    summary: 'Estimated Emergency Transit Corridor'
  };
}

/**
 * Fetches a N x N zone duration matrix using OSRM Table API
 * URL: https://router.project-osrm.org/table/v1/driving/{lng,lat;...}?annotations=duration
 */
export async function getOSRMTableMatrix(
  coords: LocationCoords[]
): Promise<number[][]> {
  const coordString = coords.map((c) => `${c.lng},${c.lat}`).join(';');
  const url = `https://router.project-osrm.org/table/v1/driving/${coordString}?annotations=duration`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`OSRM Table API error: ${response.status}`);
    }

    const data = await response.json();
    if (data.durations && Array.isArray(data.durations)) {
      return data.durations.map((row: number[]) => row.map((val: number) => Math.round(val)));
    }
    throw new Error('Invalid OSRM Table API response structure');
  } catch (err) {
    console.warn('OSRM Table API fallback activated:', err);
    // Generate fallback duration matrix using Haversine distance @ 35 km/h
    const matrix: number[][] = [];
    for (let i = 0; i < coords.length; i++) {
      const row: number[] = [];
      for (let j = 0; j < coords.length; j++) {
        if (i === j) {
          row.push(0);
        } else {
          const distKm = calculateHaversineDistance(coords[i], coords[j]) * 1.3;
          const durationSec = Math.round((distKm / 35) * 3600);
          row.push(durationSec);
        }
      }
      matrix.push(row);
    }
    return matrix;
  }
}

