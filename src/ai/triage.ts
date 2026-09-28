// src/ai/triage.ts
// Medical Triage Engine: Evaluates Emergency Type, Symptoms, and Patient Age to assign Severity Level (P1, P2, P3),
// required medical specialty, required bed type, and clinical rationale.

export interface SymptomChecklist {
  unconscious?: boolean;
  notBreathing?: boolean;
  severeBleeding?: boolean;
  chestPain?: boolean;
  strokeSigns?: boolean;
  fracture?: boolean;
  burns?: boolean;
}

export type EmergencyType = 'cardiac' | 'accident' | 'burn' | 'maternity' | 'respiratory' | 'stroke' | 'other';
export type AgeBand = 'pediatric' | 'adult' | 'elderly';
export type SeverityLevel = 'P1' | 'P2' | 'P3';

export interface TriageResult {
  severity: SeverityLevel;
  requiredSpecialty: string;
  requiredBedType: 'ICU' | 'Trauma' | 'General' | 'Maternity';
  reasons: string[];
}

export function evaluateTriage(
  emergencyType: EmergencyType,
  symptoms: SymptomChecklist = {},
  ageBand: AgeBand = 'adult'
): TriageResult {
  const reasons: string[] = [];
  let severity: SeverityLevel = 'P3';
  let requiredBedType: 'ICU' | 'Trauma' | 'General' | 'Maternity' = 'General';
  let requiredSpecialty = 'General Emergency';

  // 1. Critical Life Threat Checks (P1)
  if (symptoms.unconscious || symptoms.notBreathing) {
    severity = 'P1';
    reasons.push('Loss of consciousness or severe respiratory failure detected');
    requiredBedType = 'ICU';
    requiredSpecialty = 'ICU / Critical Care';
  } else if (symptoms.chestPain || emergencyType === 'cardiac') {
    severity = 'P1';
    reasons.push('High risk of acute myocardial infarction or cardiac event');
    requiredBedType = 'ICU';
    requiredSpecialty = 'Cardiac';
  } else if (symptoms.strokeSigns || emergencyType === 'stroke') {
    severity = 'P1';
    reasons.push('Neurological emergency / acute stroke indicators present');
    requiredBedType = 'ICU';
    requiredSpecialty = 'Stroke / Neurology';
  } else if (symptoms.severeBleeding || emergencyType === 'accident') {
    severity = 'P1';
    reasons.push('Major trauma with severe hemorrhage risk');
    requiredBedType = 'Trauma';
    requiredSpecialty = 'Trauma';
  } else if (emergencyType === 'burn' || symptoms.burns) {
    severity = 'P2';
    reasons.push('Specialized burn trauma care required');
    requiredBedType = 'Trauma';
    requiredSpecialty = 'Burn';
  } else if (emergencyType === 'maternity') {
    severity = ageBand === 'elderly' ? 'P1' : 'P2';
    reasons.push('Obstetric / Maternity emergency care required');
    requiredBedType = 'Maternity';
    requiredSpecialty = 'Maternity';
  } else if (symptoms.fracture) {
    severity = 'P2';
    reasons.push('Suspected bone fracture requiring orthopedic stabilization');
    requiredBedType = 'Trauma';
    requiredSpecialty = 'Trauma';
  } else if (symptoms.burns) {
    severity = 'P2';
    reasons.push('Burn care stabilization required');
    requiredBedType = 'Trauma';
    requiredSpecialty = 'Burn';
  }

  // Age multiplier / escalation
  if (ageBand === 'elderly' && severity === 'P2') {
    severity = 'P1';
    reasons.push('Geriatric vulnerability elevated priority to P1');
  }

  if (reasons.length === 0) {
    reasons.push('Standard non-life-threatening medical transport');
  }

  return {
    severity,
    requiredSpecialty,
    requiredBedType,
    reasons,
  };
}
