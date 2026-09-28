// src/ai/__tests__/ai.test.ts
// Vitest Suite for AmbuNet AI Modules

import { describe, it, expect } from 'vitest';
import { evaluateTriage } from '../triage';
import { calculatePredictedEta, updateTrafficMultiplier, calculateMAE } from '../etaModel';
import { forecastZoneDemand } from '../demandModel';
import { calculateStandbyRecommendations } from '../positioning';
import { calculateBedProbability } from '../bedModel';
import { scoreDispatchCandidate } from '../dispatchScore';

describe('Triage Module', () => {
  it('assigns P1 for unconscious patients with cardiac symptoms', () => {
    const result = evaluateTriage('cardiac', { unconscious: true });
    expect(result.severity).toBe('P1');
    expect(result.requiredBedType).toBe('ICU');
  });

  it('assigns P2 for burn injury without unconsciousness', () => {
    const result = evaluateTriage('burn', { burns: true });
    expect(result.severity).toBe('P2');
    expect(result.requiredBedType).toBe('Trauma');
  });
});

describe('ETA Model & Online Learning Module', () => {
  it('calculates traffic-adjusted ETA for peak hours in Bangalore', () => {
    const osrmBaseSec = 600; // 10 mins
    const predictedSec = calculatePredictedEta(osrmBaseSec, 'kr_puram', 9, false);
    expect(predictedSec).toBeGreaterThan(osrmBaseSec);
  });

  it('updates traffic multiplier with exponential smoothing', () => {
    const oldMultiplier = 1.5;
    const actualSec = 1800;
    const osrmBaseSec = 600; // Actual was 3x baseline
    const newMultiplier = updateTrafficMultiplier(oldMultiplier, actualSec, osrmBaseSec);
    expect(newMultiplier).toBeGreaterThan(oldMultiplier);
  });

  it('computes Mean Absolute Error accurately', () => {
    const history = [
      { predictedSec: 600, actualSec: 700 },
      { predictedSec: 1200, actualSec: 1100 },
    ];
    const mae = calculateMAE(history);
    expect(mae).toBe(100);
  });
});

describe('Demand Forecasting Module', () => {
  it('forecasts incident rates with Poisson smoothing', () => {
    const forecasts = forecastZoneDemand([], ['whitefield', 'koramangala'], 9, 1);
    expect(forecasts.length).toBe(2);
    expect(forecasts[0].isSynthetic).toBe(true);
  });
});

describe('Ambulance Pre-positioning Module', () => {
  it('recommends standby zones for idle ambulances based on demand deficits', () => {
    const idleAmbulances = [
      { id: 'a1', vehicleNumber: 'KA-01-1008', status: 'idle' as const, currentZoneId: 'central_majestic' },
    ];
    const forecasts = [
      { zoneId: 'kr_puram', expectedIncidents: 4.5 },
      { zoneId: 'central_majestic', expectedIncidents: 1.0 },
    ];
    const recs = calculateStandbyRecommendations(idleAmbulances, idleAmbulances, forecasts);
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0].recommendedZoneId).toBe('kr_puram');
  });
});

describe('Bed Probability Module', () => {
  it('calculates bed availability probability correctly', () => {
    const bedState = { totalBeds: 20, availableBeds: 5, reservedBeds: 1, inboundPatients: 1 };
    const prob = calculateBedProbability(bedState, 600);
    expect(prob).toBeGreaterThan(0);
    expect(prob).toBeLessThanOrEqual(1);
  });
});

describe('Multi-Objective Dispatch Scoring Module', () => {
  it('scores dispatch candidate pair lower for better ETA and bed match', () => {
    const candidateA = scoreDispatchCandidate({
      ambulanceId: 'a1',
      vehicleNumber: 'AMB-1',
      hospitalId: 'h1',
      hospitalName: 'Victoria Hospital',
      etaToPatientSec: 300,
      etaToHospitalSec: 600,
      bedProbability: 0.9,
      hasSpecialtyMatch: true,
      coverageLossScore: 0.1,
      severity: 'P1',
    });

    const candidateB = scoreDispatchCandidate({
      ambulanceId: 'a2',
      vehicleNumber: 'AMB-2',
      hospitalId: 'h2',
      hospitalName: 'Other Hospital',
      etaToPatientSec: 1200,
      etaToHospitalSec: 1800,
      bedProbability: 0.2,
      hasSpecialtyMatch: false,
      coverageLossScore: 0.8,
      severity: 'P1',
    });

    expect(candidateA.totalScore).toBeLessThan(candidateB.totalScore);
  });
});
