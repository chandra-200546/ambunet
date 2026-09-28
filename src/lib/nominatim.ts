import { LocationCoords } from '../types';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

const addressCache = new Map<string, string>();

/**
 * Reverse geocodes lat/lng into a human-readable address using OpenStreetMap Nominatim
 */
export async function reverseGeocode(coords: LocationCoords): Promise<string> {
  const cacheKey = `${coords.lat.toFixed(4)},${coords.lng.toFixed(4)}`;
  if (addressCache.has(cacheKey)) {
    return addressCache.get(cacheKey)!;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const url = `${NOMINATIM_BASE_URL}/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'AmbuNet-EmergencyPlatform/1.0'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.status}`);
    }

    const data = await response.json();
    if (data && data.display_name) {
      // Shorten the address for clean UI display
      const addr = data.address || {};
      const road = addr.road || addr.pedestrian || addr.street;
      const suburb = addr.suburb || addr.neighbourhood || addr.city_district;
      const city = addr.city || addr.town || addr.county;

      let formatted = '';
      if (road && suburb) {
        formatted = `${road}, ${suburb}, ${city || ''}`;
      } else if (road && city) {
        formatted = `${road}, ${city}`;
      } else {
        formatted = data.display_name.split(',').slice(0, 3).join(', ');
      }

      addressCache.set(cacheKey, formatted);
      return formatted;
    }
  } catch (err) {
    console.warn('Reverse geocoding error or timeout:', err);
  }

  // Fallback string if API is unavailable
  const fallback = `Coordinates: ${coords.lat.toFixed(4)}°N, ${coords.lng.toFixed(4)}°W`;
  return fallback;
}

export interface GeocodeSearchResult {
  lat: number;
  lng: number;
  displayName: string;
  type: string;
}

/**
 * Search locations by address or landmark query
 */
export async function searchAddress(query: string): Promise<GeocodeSearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    const url = `${NOMINATIM_BASE_URL}/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`;
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'AmbuNet-EmergencyPlatform/1.0'
      }
    });

    if (!response.ok) return [];

    const data = await response.json();
    return data.map((item: any) => ({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      displayName: item.display_name,
      type: item.type
    }));
  } catch (err) {
    console.warn('Geocode search failed:', err);
    return [];
  }
}
