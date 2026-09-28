// src/ai/dispatchScore.ts
// Multi-Objective AI Dispatch Scoring Engine

import { SeverityLevel } from './triage';

export interface DispatchCandidateInput {
  ambulanceId: string;
  vehicleNumber: string;
  hospitalId: string;
  hospitalName: string;
  etaToPatientSec: number;
  etaToHospitalSec: number;
  bedProbability: number;
  hasSpecialtyMatch: boolean;
  coverageLossScore: number; // 0 to 1 scale representing coverage impact on original zone
  severity: SeverityLevel;
}

export interface CandidateScoreBreakdown {
  ambulanceId: string;
  vehicleNumber: string;
  hospitalId: string;
  hospitalName: string;
  etaToPatientSec: number;
  etaToHospitalSec: number;
  bedProbability: number;
  specialtyMatch: boolean;
  totalScore: number;
  breakdown: {
    w1_patientEtaComponent: number;
    w2_hospitalEtaComponent: number;
    w3_bedRiskComponent: number;
    w4_specialtyPenaltyComponent: number;
    w5_coverageLossComponent: number;
  };
  weightsUsed: {
    w1: number;
    w2: number;
    w3: number;
    w4: number;
    w5: number;
  };
}

/**
 * Computes Dispatch Score for an (Ambulance, Hospital) candidate pair.
 * Lower score is better.
 */
export function scoreDispatchCandidate(input: DispatchCandidateInput): CandidateScoreBreakdown {
  let w1 = 0.45; // ETA to patient weight
  let w2 = 0.25; // ETA to hospital weight
  let w3 = 0.15; // Bed risk weight (1 - bedProb)
  let w4 = 0.10; // Specialty mismatch penalty weight
  let w5 = 0.05; // Coverage loss weight

  // Severity P1: ETA to patient + Specialty Match dominate critical survival window
  if (input.severity === 'P1') {
    w1 = 0.55;
    w2 = 0.20;
    w3 = 0.10;
    w4 = 0.12;
    w5 = 0.03;
  } else if (input.severity === 'P3') {
    // Severity P3: Load balancing, bed probability, and coverage maintenance matter more
    w1 = 0.30;
    w2 = 0.20;
    w3 = 0.25;
    w4 = 0.05;
    w5 = 0.20;
  }

  // Normalize components (seconds scaled by 60 for minute equivalent)
  const patientEtaMin = input.etaToPatientSec / 60;
  const hospitalEtaMin = input.etaToHospitalSec / 60;
  const bedRisk = 1.0 - input.bedProbability;
  const specialtyPenalty = input.hasSpecialtyMatch ? 0.0 : 1.0;

  const w1_patientEtaComponent = Number((w1 * patientEtaMin * 10).toFixed(2));
  const w2_hospitalEtaComponent = Number((w2 * hospitalEtaMin * 10).toFixed(2));
  const w3_bedRiskComponent = Number((w3 * bedRisk * 50).toFixed(2));
  const w4_specialtyPenaltyComponent = Number((w4 * specialtyPenalty * 50).toFixed(2));
  const w5_coverageLossComponent = Number((w5 * input.coverageLossScore * 30).toFixed(2));

  const totalScore = Number(
    (
      w1_patientEtaComponent +
      w2_hospitalEtaComponent +
      w3_bedRiskComponent +
      w4_specialtyPenaltyComponent +
      w5_coverageLossComponent
    ).toFixed(2)
  );

  return {
    ambulanceId: input.ambulanceId,
    vehicleNumber: input.vehicleNumber,
    hospitalId: input.hospitalId,
    hospitalName: input.hospitalName,
    etaToPatientSec: input.etaToPatientSec,
    etaToHospitalSec: input.etaToHospitalSec,
    bedProbability: input.bedProbability,
    specialtyMatch: input.hasSpecialtyMatch,
    totalScore,
    breakdown: {
      w1_patientEtaComponent,
      w2_hospitalEtaComponent,
      w3_bedRiskComponent,
      w4_specialtyPenaltyComponent,
      w5_coverageLossComponent,
    },
    weightsUsed: { w1, w2, w3, w4, w5 },
  };
}
