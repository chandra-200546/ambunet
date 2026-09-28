// src/ai/etaModel.ts
// Predictive ETA Engine with Online Adaptive Traffic Learning

export interface TrafficFactorMap {
  [zoneId: string]: {
    [hourBucket: number]: {
      weekday: number;
      weekend: number;
    };
  };
}

// Default Bangalore Traffic Multiplier Baselines (Silk Board, Hebbal, KR Puram, ORR heavy peaks)
const BANGALORE_PEAK_MULTIPLIERS: Record<string, { morningPeak: number; eveningPeak: number; offPeak: number }> = {
  kr_puram: { morningPeak: 2.1, eveningPeak: 2.3, offPeak: 1.2 },
  koramangala: { morningPeak: 1.9, eveningPeak: 2.2, offPeak: 1.25 },
  hebbal: { morningPeak: 1.8, eveningPeak: 2.0, offPeak: 1.15 },
  whitefield: { morningPeak: 1.85, eveningPeak: 2.1, offPeak: 1.2 },
  electronic_city: { morningPeak: 1.75, eveningPeak: 1.95, offPeak: 1.15 },
  central_majestic: { morningPeak: 1.6, eveningPeak: 1.7, offPeak: 1.3 },
  jayanagar: { morningPeak: 1.4, eveningPeak: 1.5, offPeak: 1.1 },
  yeshwanthpur: { morningPeak: 1.45, eveningPeak: 1.55, offPeak: 1.1 },
};

/**
  * Calculate predicted ETA in seconds based on OSRM base duration and zone traffic multipliers.
  */
export function calculatePredictedEta(
  osrmBaseSeconds: number,
  zoneId: string,
  hourBucket: number,
  isWeekend: boolean,
  customMultiplier?: number
): number {
  if (customMultiplier) {
    return Math.round(osrmBaseSeconds * customMultiplier);
  }

  const zoneProfile = BANGALORE_PEAK_MULTIPLIERS[zoneId] || { morningPeak: 1.4, eveningPeak: 1.5, offPeak: 1.1 };
  let multiplier = zoneProfile.offPeak;

  // Peak hours: 8-11 AM (8, 9, 10) & 5-9 PM (17, 18, 19, 20)
  if (hourBucket >= 8 && hourBucket <= 10) {
    multiplier = zoneProfile.morningPeak;
  } else if (hourBucket >= 17 && hourBucket <= 20) {
    multiplier = zoneProfile.eveningPeak;
  }

  if (isWeekend) {
    multiplier = Math.max(1.0, multiplier * 0.85); // Slightly lighter weekend traffic
  }

  return Math.round(osrmBaseSeconds * multiplier);
}

/**
  * Online Adaptive Multiplier Update:
  * Exponential smoothing: m_new = 0.8 * m_old + 0.2 * (actual_sec / osrm_base_sec)
  */
export function updateTrafficMultiplier(
  currentMultiplier: number,
  actualTripSeconds: number,
  osrmBaseSeconds: number
): number {
  if (osrmBaseSeconds <= 0) return currentMultiplier;
  const observedRatio = actualTripSeconds / osrmBaseSeconds;
  // Bounded between 0.8x and 3.5x to avoid outliers
  const boundedRatio = Math.max(0.8, Math.min(3.5, observedRatio));
  const newMultiplier = 0.8 * currentMultiplier + 0.2 * boundedRatio;
  return Number(newMultiplier.toFixed(2));
}

/**
  * Computes Mean Absolute Error (MAE) for predicted vs actual response times
  */
export function calculateMAE(history: Array<{ predictedSec: number; actualSec: number }>): number {
  if (history.length === 0) return 0;
  const totalError = history.reduce((sum, item) => sum + Math.abs(item.predictedSec - item.actualSec), 0);
  return Math.round(totalError / history.length);
}
