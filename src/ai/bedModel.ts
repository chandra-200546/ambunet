// src/ai/bedModel.ts
// Bed Availability Probability Model: Estimates the probability (0-1) that a matching hospital bed remains free upon arrival.

export interface HospitalBedState {
  totalBeds: number;
  availableBeds: number;
  reservedBeds: number;
  inboundPatients: number;
}

/**
 * Calculates probability (0.0 to 1.0) of bed availability given predicted arrival ETA.
 * Formula: P = max(0, min(1, (available - reserved - inbound + expected_discharges) / max(1, total)))
 */
export function calculateBedProbability(
  bedState: HospitalBedState,
  etaSeconds: number
): number {
  const { totalBeds, availableBeds, reservedBeds, inboundPatients } = bedState;

  // Expected discharges scale with ETA window (e.g. ~0.5 bed discharge per hour per 10 beds)
  const etaHours = etaSeconds / 3600;
  const expectedDischarges = etaHours * (totalBeds * 0.05);

  const netProjectedAvailable = availableBeds - reservedBeds - inboundPatients + expectedDischarges;

  if (totalBeds <= 0) return 0;

  const rawProbability = netProjectedAvailable / Math.max(1, availableBeds + reservedBeds);
  const boundedProbability = Math.max(0.0, Math.min(1.0, rawProbability));

  return Number(boundedProbability.toFixed(2));
}
