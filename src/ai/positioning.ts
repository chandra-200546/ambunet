// src/ai/positioning.ts
// Ambulance Pre-positioning Engine: Recommends standby zones for idle ambulances to maximize emergency coverage

export interface AmbulanceLocation {
  id: string;
  vehicleNumber: string;
  status: 'idle' | 'en_route_to_patient' | 'transporting' | 'at_hospital' | 'standby';
  currentZoneId?: string;
}

export interface ZoneCoverage {
  zoneId: string;
  forecastDemand: number;
  currentAmbulanceCount: number;
  deficitScore: number;
}

export interface RepositionRecommendation {
  ambulanceId: string;
  vehicleNumber: string;
  currentZoneId: string;
  recommendedZoneId: string;
  reason: string;
  priorityScore: number;
}

/**
 * Greedy optimization: Matches idle ambulances to zones with highest demand deficit (forecast demand - current coverage).
 */
export function calculateStandbyRecommendations(
  idleAmbulances: AmbulanceLocation[],
  allAmbulances: AmbulanceLocation[],
  forecasts: Array<{ zoneId: string; expectedIncidents: number }>
): RepositionRecommendation[] {
  if (idleAmbulances.length === 0) return [];

  // 1. Calculate current coverage per zone
  const coverageMap: Record<string, number> = {};
  forecasts.forEach((f) => (coverageMap[f.zoneId] = 0));

  allAmbulances.forEach((amb) => {
    if (amb.currentZoneId && coverageMap[amb.currentZoneId] !== undefined) {
      coverageMap[amb.currentZoneId] += 1;
    }
  });

  // 2. Compute Deficit Scores per Zone (Deficit = Demand - Coverage)
  const zoneDeficits: ZoneCoverage[] = forecasts.map((f) => {
    const currentCount = coverageMap[f.zoneId] || 0;
    const deficitScore = f.expectedIncidents - currentCount * 1.2;
    return {
      zoneId: f.zoneId,
      forecastDemand: f.expectedIncidents,
      currentAmbulanceCount: currentCount,
      deficitScore,
    };
  });

  // Sort zones by highest deficit
  zoneDeficits.sort((a, b) => b.deficitScore - a.deficitScore);

  const recommendations: RepositionRecommendation[] = [];

  // Greedy match idle ambulances to top deficit zones
  idleAmbulances.forEach((amb, index) => {
    const targetZone = zoneDeficits[index % zoneDeficits.length];
    if (targetZone && amb.currentZoneId !== targetZone.zoneId) {
      recommendations.push({
        ambulanceId: amb.id,
        vehicleNumber: amb.vehicleNumber,
        currentZoneId: amb.currentZoneId || 'unassigned',
        recommendedZoneId: targetZone.zoneId,
        priorityScore: Number(targetZone.deficitScore.toFixed(2)),
        reason: `High forecast demand (${targetZone.forecastDemand} incidents) with deficit coverage`,
      });
    }
  });

  return recommendations;
}
