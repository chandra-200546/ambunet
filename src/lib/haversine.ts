import { LocationCoords } from '../types';

/**
 * Calculates straight-line distance in kilometers between two lat/lng coordinates using the Haversine formula
 */
export function calculateHaversineDistance(
  point1: LocationCoords,
  point2: LocationCoords
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(point2.lat - point1.lat);
  const dLng = toRad(point2.lng - point1.lng);
  
  const lat1 = toRad(point1.lat);
  const lat2 = toRad(point2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
 * Calculates heading (compass angle 0-360) between two coordinates
 */
export function calculateHeading(
  from: LocationCoords,
  to: LocationCoords
): number {
  const dLng = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  let brng = Math.atan2(y, x);
  brng = toDeg(brng);
  return (brng + 360) % 360;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Formats distance nicely (e.g. 850 m or 3.4 km)
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

/**
 * Formats ETA seconds nicely (e.g. 4 mins, 1 hr 12 mins)
 */
export function formatETA(seconds: number): string {
  if (seconds <= 0) return 'Arrived';
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  
  const mins = Math.round(seconds / 60);
  if (mins < 60) {
    return `${mins} min${mins === 1 ? '' : 's'}`;
  }
  
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours} hr ${remainingMins} min`;
}
