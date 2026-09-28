export type UserRole = 'patient' | 'driver' | 'hospital_staff' | 'admin';

export type EmergencyType = 
  | 'accident' 
  | 'cardiac' 
  | 'burn' 
  | 'maternity' 
  | 'respiratory'
  | 'stroke'
  | 'other';

export type SeverityLevel = 'P1' | 'P2' | 'P3';

export type EmergencyStatus = 
  | 'requested'
  | 'assigned'
  | 'en_route_to_patient'
  | 'picked_up'
  | 'en_route_to_hospital'
  | 'completed'
  | 'cancelled';

export type AmbulanceStatus = 
  | 'idle' 
  | 'en_route_to_patient' 
  | 'transporting' 
  | 'at_hospital'
  | 'standby'
  | 'off_duty';

export type BedType = 'ICU' | 'General' | 'Trauma' | 'Maternity';

export type BedStatus = 'available' | 'occupied' | 'reserved';

export interface LocationCoords {
  lat: number;
  lng: number;
}

export interface MedicalProfile {
  blood_group?: string;
  allergies?: string;
  conditions?: string;
  emergency_contact?: string;
  age?: number;
  notes?: string;
}

export interface User {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  role: UserRole;
  medical_profile?: MedicalProfile;
  hospital_id?: string;
  created_at?: string;
}

export interface Zone {
  id: string;
  name: string;
  center_lat: number;
  center_lng: number;
}

export interface Hospital {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  contact: string;
  contact_number?: string;
  specialties: string[];
  total_capacity?: number;
  beds?: Bed[];
  availableBedsCount?: number;
  zone_id?: string;
  created_at?: string;
}

export interface Bed {
  id: string;
  hospital_id: string;
  bed_number: string;
  bed_type: BedType;
  status: BedStatus;
  updated_at?: string;
}

export interface Ambulance {
  id: string;
  driver_id?: string;
  driver_name?: string;
  driver_phone?: string;
  vehicle_number: string;
  current_lat: number;
  current_lng: number;
  heading?: number;
  status: AmbulanceStatus;
  standby_zone_id?: string;
  hospital_id?: string;
  current_emergency_id?: string;
  updated_at?: string;
}

export interface RouteGeometry {
  coordinates: [number, number][]; // [lng, lat]
  distance: number; // in meters
  duration: number; // in seconds
}

export interface SymptomChecklist {
  unconscious?: boolean;
  notBreathing?: boolean;
  severeBleeding?: boolean;
  chestPain?: boolean;
  strokeSigns?: boolean;
  fracture?: boolean;
  burns?: boolean;
}

export interface Emergency {
  id: string;
  patient_id?: string;
  patient_name: string;
  patient_phone: string;
  patient_medical_profile?: MedicalProfile;
  emergency_type: EmergencyType;
  severity: SeverityLevel;
  symptoms?: SymptomChecklist;
  pickup_lat: number;
  pickup_lng: number;
  pickup_address?: string;
  zone_id?: string;
  assigned_ambulance_id?: string;
  assigned_hospital_id?: string;
  assigned_bed_id?: string;
  predicted_eta_sec?: number;
  actual_response_sec?: number;
  eta_seconds?: number;
  distance_km?: number;
  status: EmergencyStatus;
  route_geometry?: RouteGeometry | null;
  created_at: string;
  updated_at: string;
  // joined details
  ambulance?: Ambulance;
  hospital?: Hospital;
  bed?: Bed;
}

export interface EmergencyStatusLog {
  id: string;
  emergency_id: string;
  status: EmergencyStatus;
  notes?: string;
  timestamp: string;
}

export interface DispatchCandidateBreakdown {
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
}

export interface DispatchDecision {
  id: string;
  emergency_id: string;
  candidates: DispatchCandidateBreakdown[];
  chosen_ambulance_id?: string;
  chosen_hospital_id?: string;
  mode: 'baseline' | 'adaptive';
  created_at: string;
}

export interface SimulationRun {
  id?: string;
  run_at?: string;
  num_emergencies: number;
  baseline_avg_sec: number;
  adaptive_avg_sec: number;
  baseline_p90_sec: number;
  adaptive_p90_sec: number;
  improvement_pct: number;
  config: Record<string, any>;
}

export interface OSRMRouteResult {
  coordinates: [number, number][]; // [lat, lng] array ready for Leaflet
  rawCoordinates: [number, number][]; // [lng, lat] GeoJSON format
  distanceKm: number;
  durationSeconds: number;
  durationMinutes: number;
  summary: string;
}
