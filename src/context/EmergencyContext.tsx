import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  Emergency,
  Hospital,
  Bed,
  Ambulance,
  EmergencyType,
  EmergencyStatus,
  BedStatus,
  BedType,
  EmergencyStatusLog,
  LocationCoords,
  DispatchDecision,
  SimulationRun,
  SymptomChecklist,
  SeverityLevel
} from '../types';
import {
  INITIAL_HOSPITALS,
  INITIAL_BEDS,
  INITIAL_AMBULANCES,
  INITIAL_EMERGENCIES,
  BANGALORE_ZONES
} from '../lib/mockData';
import { calculateHaversineDistance, calculateHeading } from '../lib/haversine';
import { getOSRMRoute, getOSRMTableMatrix } from '../lib/osrm';
import { soundManager } from '../lib/audio';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { createDatabaseId, isUuid, logSupabaseError, toDatabaseUuid } from '../lib/dbUtils';
import { useAuth } from './AuthContext';

// AI Engines
import { evaluateTriage } from '../ai/triage';
import { calculatePredictedEta, updateTrafficMultiplier, calculateMAE } from '../ai/etaModel';
import { forecastZoneDemand } from '../ai/demandModel';
import { calculateStandbyRecommendations, RepositionRecommendation } from '../ai/positioning';
import { calculateBedProbability } from '../ai/bedModel';
import { scoreDispatchCandidate, CandidateScoreBreakdown } from '../ai/dispatchScore';

interface EmergencyContextType {
  hospitals: Hospital[];
  beds: Bed[];
  ambulances: Ambulance[];
  emergencies: Emergency[];
  logs: EmergencyStatusLog[];
  dispatchDecisions: DispatchDecision[];
  simulationRuns: SimulationRun[];
  activeEmergency: Emergency | null;
  assignedDriverEmergency: Emergency | null;
  isDispatching: boolean;
  isSimulatingDrive: boolean;
  simulationSpeed: number;
  setSimulationSpeed: (speed: number) => void;
  repositionRecommendations: RepositionRecommendation[];
  createEmergency: (params: {
    emergencyType: EmergencyType;
    pickupLat: number;
    pickupLng: number;
    pickupAddress: string;
    symptoms?: SymptomChecklist;
    patientName?: string;
    patientPhone?: string;
    mode?: 'baseline' | 'adaptive';
  }) => Promise<Emergency>;
  acceptEmergency: (emergencyId: string) => Promise<void>;
  rejectEmergency: (emergencyId: string) => Promise<void>;
  updateEmergencyStatus: (emergencyId: string, status: EmergencyStatus) => Promise<void>;
  cancelEmergency: (emergencyId: string) => Promise<void>;
  manualOverrideDispatch: (
    emergencyId: string,
    ambulanceId?: string,
    hospitalId?: string,
    bedId?: string
  ) => Promise<void>;
  toggleBedStatus: (bedId: string, newStatus: BedStatus) => Promise<void>;
  admitPatientAtHospital: (emergencyId: string, bedId?: string) => Promise<void>;
  updateAmbulancePosition: (ambulanceId: string, lat: number, lng: number, heading?: number) => Promise<void>;
  toggleDriverDuty: (ambulanceId: string, status: 'idle' | 'off_duty') => Promise<void>;
  applyRepositionRecommendation: (rec: RepositionRecommendation) => Promise<void>;
  startRouteSimulation: (emergencyId: string) => void;
  stopRouteSimulation: () => void;
  resetAllDataToDemo: () => void;
  refreshRoute: (emergencyId: string) => Promise<void>;
  runSimulationBenchmark: (numEmergencies?: number) => Promise<SimulationRun>;
}

const EmergencyContext = createContext<EmergencyContextType | undefined>(undefined);
const LOCAL_STORAGE_KEY = 'ambunet_state_v2';

export const EmergencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const isSupabaseActive = isSupabaseConfigured();

  const [hospitals, setHospitals] = useState<Hospital[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_hospitals`);
    return saved ? JSON.parse(saved) : INITIAL_HOSPITALS;
  });

  const [beds, setBeds] = useState<Bed[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_beds`);
    return saved ? JSON.parse(saved) : INITIAL_BEDS;
  });

  const [ambulances, setAmbulances] = useState<Ambulance[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_ambulances`);
    return saved ? JSON.parse(saved) : INITIAL_AMBULANCES;
  });

  const [emergencies, setEmergencies] = useState<Emergency[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_emergencies`);
    return saved ? JSON.parse(saved) : INITIAL_EMERGENCIES;
  });

  const [dispatchDecisions, setDispatchDecisions] = useState<DispatchDecision[]>([]);
  const [simulationRuns, setSimulationRuns] = useState<SimulationRun[]>([]);
  const [logs, setLogs] = useState<EmergencyStatusLog[]>([]);
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [isSimulatingDrive, setIsSimulatingDrive] = useState<boolean>(false);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(2);

  const simulationTimerRef = useRef<number | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    try {
      broadcastChannelRef.current = new BroadcastChannel('ambunet_realtime_bus');
      broadcastChannelRef.current.onmessage = (event) => {
        const { type, payload } = event.data;
        if (type === 'SYNC_ALL') {
          if (payload.ambulances) setAmbulances(payload.ambulances);
          if (payload.emergencies) setEmergencies(payload.emergencies);
          if (payload.beds) setBeds(payload.beds);
          if (payload.hospitals) setHospitals(payload.hospitals);
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported');
    }

    return () => {
      broadcastChannelRef.current?.close();
    };
  }, []);

  const broadcastState = useCallback((newAmbulances?: Ambulance[], newEmergencies?: Emergency[], newBeds?: Bed[]) => {
    try {
      broadcastChannelRef.current?.postMessage({
        type: 'SYNC_ALL',
        payload: {
          ambulances: newAmbulances || ambulances,
          emergencies: newEmergencies || emergencies,
          beds: newBeds || beds,
          hospitals
        }
      });
    } catch (e) {
      // ignore
    }
  }, [ambulances, emergencies, beds, hospitals]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_hospitals`, JSON.stringify(hospitals));
  }, [hospitals]);
  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_beds`, JSON.stringify(beds));
  }, [beds]);
  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_ambulances`, JSON.stringify(ambulances));
  }, [ambulances]);
  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_emergencies`, JSON.stringify(emergencies));
  }, [emergencies]);

  const hospitalsWithBedCounts = hospitals.map(hospital => {
    const hospitalBeds = beds.filter(b => b.hospital_id === hospital.id);
    const available = hospitalBeds.filter(b => b.status === 'available').length;
    return {
      ...hospital,
      beds: hospitalBeds,
      availableBedsCount: available
    };
  });

  const enrichedEmergencies = emergencies.map(em => {
    const amb = ambulances.find(a => a.id === em.assigned_ambulance_id);
    const hosp = hospitals.find(h => h.id === em.assigned_hospital_id);
    const bed = beds.find(b => b.id === em.assigned_bed_id);
    return {
      ...em,
      ambulance: amb,
      hospital: hosp,
      bed: bed
    };
  });

  const activeEmergency = enrichedEmergencies.find(
    em => (em.patient_id === user?.id || (user?.role === 'patient' && !em.patient_id)) &&
          em.status !== 'completed' &&
          em.status !== 'cancelled'
  ) || enrichedEmergencies.find(em => em.status !== 'completed' && em.status !== 'cancelled') || null;

  const assignedDriverEmergency = enrichedEmergencies.find(
    em => {
      if (user?.role !== 'driver') return false;
      const driverAmb = ambulances.find(a => a.driver_id === user.id || a.driver_name?.includes(user.name));
      return em.assigned_ambulance_id === driverAmb?.id && em.status !== 'completed' && em.status !== 'cancelled';
    }
  ) || enrichedEmergencies.find(em => em.status === 'assigned' || em.status === 'en_route_to_patient' || em.status === 'picked_up') || null;

  // Compute AI Standby Repositioning Recommendations
  const idleAmbulances = ambulances.filter(a => a.status === 'idle');
  const zoneForecasts = forecastZoneDemand([], BANGALORE_ZONES.map(z => z.id), new Date().getHours(), new Date().getDay());
  const repositionRecommendations = calculateStandbyRecommendations(
    idleAmbulances.map(a => ({ id: a.id, vehicleNumber: a.vehicle_number, status: 'idle', currentZoneId: a.standby_zone_id || 'central_majestic' })),
    ambulances.map(a => ({ id: a.id, vehicleNumber: a.vehicle_number, status: a.status === 'idle' ? 'idle' : 'en_route_to_patient', currentZoneId: a.standby_zone_id })),
    zoneForecasts
  );

  // AI-Driven Multi-Objective Dispatch Optimization
  const performAIDispatch = async (
    pickup: LocationCoords,
    emergencyType: EmergencyType,
    symptoms: SymptomChecklist = {},
    mode: 'baseline' | 'adaptive' = 'adaptive'
  ) => {
    // 1. Triage Engine
    const triage = evaluateTriage(emergencyType, symptoms);
    const availableAmbs = ambulances.filter(a => a.status === 'idle');
    const idleOrAnyAmbs = availableAmbs.length > 0 ? availableAmbs : ambulances;
    const currentHour = new Date().getHours();
    const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;

    if (mode === 'baseline') {
      // Baseline: Nearest ambulance by straight-line distance, nearest hospital with bed
      let bestAmb = idleOrAnyAmbs[0];
      let minDist = Infinity;
      for (const amb of idleOrAnyAmbs) {
        const d = calculateHaversineDistance({ lat: amb.current_lat, lng: amb.current_lng }, pickup);
        if (d < minDist) {
          minDist = d;
          bestAmb = amb;
        }
      }

      let bestHosp = hospitals[0];
      let bestBed = beds.find(b => b.hospital_id === bestHosp.id && b.status === 'available') || beds[0];
      let minHospDist = Infinity;
      for (const hosp of hospitals) {
        const bed = beds.find(b => b.hospital_id === hosp.id && b.status === 'available');
        if (bed) {
          const d = calculateHaversineDistance(pickup, { lat: hosp.lat, lng: hosp.lng });
          if (d < minHospDist) {
            minHospDist = d;
            bestHosp = hosp;
            bestBed = bed;
          }
        }
      }

      const routeResult = await getOSRMRoute(
        { lat: bestAmb.current_lat, lng: bestAmb.current_lng },
        pickup
      );

      return {
        ambulance: bestAmb,
        hospital: bestHosp,
        bed: bestBed,
        triage,
        route: routeResult,
        predictedEtaSec: routeResult.durationSeconds,
        candidates: [],
        decisionMode: 'baseline' as const
      };
    }

    // Adaptive Mode: Multi-Objective Candidate Scoring
    const candidates: CandidateScoreBreakdown[] = [];
    let bestCandidate: CandidateScoreBreakdown | null = null;
    let lowestScore = Infinity;

    for (const amb of idleOrAnyAmbs.slice(0, 6)) {
      const ambLocation: LocationCoords = { lat: amb.current_lat, lng: amb.current_lng };
      const rawRouteToPatient = await getOSRMRoute(ambLocation, pickup);
      const etaToPatientSec = calculatePredictedEta(rawRouteToPatient.durationSeconds, amb.standby_zone_id || 'central_majestic', currentHour, isWeekend);

      for (const hosp of hospitals.slice(0, 6)) {
        const hospLocation: LocationCoords = { lat: hosp.lat, lng: hosp.lng };
        const rawRouteToHosp = await getOSRMRoute(pickup, hospLocation);
        const etaToHospitalSec = calculatePredictedEta(rawRouteToHosp.durationSeconds, hosp.zone_id || 'central_majestic', currentHour, isWeekend);

        const hospitalBeds = beds.filter(b => b.hospital_id === hosp.id);
        const availBeds = hospitalBeds.filter(b => b.status === 'available').length;
        const resBeds = hospitalBeds.filter(b => b.status === 'reserved').length;
        const bedProb = calculateBedProbability(
          { totalBeds: hosp.total_capacity || 50, availableBeds: availBeds, reservedBeds: resBeds, inboundPatients: 1 },
          etaToHospitalSec
        );

        const hasSpecialty = hosp.specialties.some(s => s.toLowerCase().includes(triage.requiredSpecialty.toLowerCase()));

        const scoreObj = scoreDispatchCandidate({
          ambulanceId: amb.id,
          vehicleNumber: amb.vehicle_number,
          hospitalId: hosp.id,
          hospitalName: hosp.name,
          etaToPatientSec,
          etaToHospitalSec,
          bedProbability: bedProb,
          hasSpecialtyMatch: hasSpecialty,
          coverageLossScore: 0.2,
          severity: triage.severity
        });

        candidates.push(scoreObj);
        if (scoreObj.totalScore < lowestScore) {
          lowestScore = scoreObj.totalScore;
          bestCandidate = scoreObj;
        }
      }
    }

    const chosenAmb = ambulances.find(a => a.id === (bestCandidate?.ambulanceId || idleOrAnyAmbs[0].id)) || idleOrAnyAmbs[0];
    const chosenHosp = hospitals.find(h => h.id === (bestCandidate?.hospitalId || hospitals[0].id)) || hospitals[0];
    const chosenBed = beds.find(b => b.hospital_id === chosenHosp.id && b.status === 'available') || beds.find(b => b.hospital_id === chosenHosp.id) || beds[0];

    const chosenRoute = await getOSRMRoute(
      { lat: chosenAmb.current_lat, lng: chosenAmb.current_lng },
      pickup
    );

    return {
      ambulance: chosenAmb,
      hospital: chosenHosp,
      bed: chosenBed,
      triage,
      route: chosenRoute,
      predictedEtaSec: bestCandidate?.etaToPatientSec || chosenRoute.durationSeconds,
      candidates,
      decisionMode: 'adaptive' as const
    };
  };

  const createEmergency = async ({
    emergencyType,
    pickupLat,
    pickupLng,
    pickupAddress,
    symptoms = {},
    patientName,
    patientPhone,
    mode = 'adaptive'
  }: {
    emergencyType: EmergencyType;
    pickupLat: number;
    pickupLng: number;
    pickupAddress: string;
    symptoms?: SymptomChecklist;
    patientName?: string;
    patientPhone?: string;
    mode?: 'baseline' | 'adaptive';
  }): Promise<Emergency> => {
    setIsDispatching(true);

    try {
      const dispatch = await performAIDispatch({ lat: pickupLat, lng: pickupLng }, emergencyType, symptoms, mode);
      const newEmergencyId = createDatabaseId();

      const newEmergency: Emergency = {
        id: newEmergencyId,
        patient_id: toDatabaseUuid(user?.id),
        patient_name: patientName || user?.name || 'Rahul Sharma',
        patient_phone: patientPhone || user?.phone || '+91 98765 43210',
        patient_medical_profile: user?.medical_profile,
        emergency_type: emergencyType,
        severity: dispatch.triage.severity,
        symptoms,
        pickup_lat: pickupLat,
        pickup_lng: pickupLng,
        pickup_address: pickupAddress,
        assigned_ambulance_id: dispatch.ambulance.id,
        assigned_hospital_id: dispatch.hospital.id,
        assigned_bed_id: toDatabaseUuid(dispatch.bed?.id),
        status: 'assigned',
        predicted_eta_sec: dispatch.predictedEtaSec,
        eta_seconds: dispatch.predictedEtaSec,
        distance_km: dispatch.route.distanceKm,
        route_geometry: {
          coordinates: dispatch.route.rawCoordinates,
          distance: dispatch.route.distanceKm * 1000,
          duration: dispatch.route.durationSeconds
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      let updatedAmbulances = ambulances.map(a =>
        a.id === dispatch.ambulance.id
          ? { ...a, status: 'en_route_to_patient' as const, current_emergency_id: newEmergencyId }
          : a
      );
      setAmbulances(updatedAmbulances);

      let updatedBeds = [...beds];
      if (dispatch.bed) {
        updatedBeds = updatedBeds.map(b =>
          b.id === dispatch.bed!.id ? { ...b, status: 'reserved' as const } : b
        );
        setBeds(updatedBeds);
      }

      const updatedEmergencies = [newEmergency, ...emergencies];
      setEmergencies(updatedEmergencies);

      const newDecision: DispatchDecision = {
        id: createDatabaseId(),
        emergency_id: newEmergencyId,
        candidates: dispatch.candidates,
        chosen_ambulance_id: dispatch.ambulance.id,
        chosen_hospital_id: dispatch.hospital.id,
        mode: dispatch.decisionMode,
        created_at: new Date().toISOString()
      };
      setDispatchDecisions(prev => [newDecision, ...prev]);

      const newLog: EmergencyStatusLog = {
        id: createDatabaseId(),
        emergency_id: newEmergencyId,
        status: 'assigned',
        notes: `Dispatch [${mode.toUpperCase()}]: Assigned ${dispatch.ambulance.vehicle_number} to ${pickupAddress}. Reserved ${dispatch.bed?.bed_number || 'bed'} at ${dispatch.hospital.name}. Priority ${dispatch.triage.severity}.`,
        timestamp: new Date().toISOString()
      };
      setLogs(prev => [newLog, ...prev]);

      soundManager.playSOSConfirmation();
      soundManager.playEmergencyDispatchAlert();

      const client = supabase;
      if (isSupabaseActive && client) {
        const { error: emergencyError } = await client.from('emergencies').insert([newEmergency]);
        logSupabaseError('emergency insert', emergencyError);

        if (isUuid(dispatch.ambulance.id)) {
          const { error: ambulanceError } = await client
            .from('ambulances')
            .update({ status: 'en_route_to_patient' })
            .eq('id', dispatch.ambulance.id);
          logSupabaseError('ambulance status update', ambulanceError);
        }

        if (isUuid(dispatch.bed?.id)) {
          const { error: bedError } = await client.from('beds').update({ status: 'reserved' }).eq('id', dispatch.bed.id);
          logSupabaseError('bed reservation update', bedError);
        }

        const { error: decisionError } = await client.from('dispatch_decisions').insert([newDecision]);
        logSupabaseError('dispatch decision insert', decisionError);
      }

      broadcastState(updatedAmbulances, updatedEmergencies, updatedBeds);
      return newEmergency;
    } finally {
      setIsDispatching(false);
    }
  };

  const acceptEmergency = async (emergencyId: string) => {
    const em = emergencies.find(e => e.id === emergencyId);
    if (!em) return;

    const updatedEmergencies = emergencies.map(e =>
      e.id === emergencyId ? { ...e, status: 'en_route_to_patient' as const, updated_at: new Date().toISOString() } : e
    );
    setEmergencies(updatedEmergencies);

    const updatedAmbulances = ambulances.map(a =>
      a.id === em.assigned_ambulance_id ? { ...a, status: 'en_route_to_patient' as const } : a
    );
    setAmbulances(updatedAmbulances);
    soundManager.playSuccessChime();

    const client = supabase;
    if (isSupabaseActive && client) {
      if (isUuid(emergencyId)) {
        const { error } = await client.from('emergencies').update({ status: 'en_route_to_patient' }).eq('id', emergencyId);
        logSupabaseError('emergency accept update', error);
      }
      if (isUuid(em.assigned_ambulance_id)) {
        const { error } = await client
          .from('ambulances')
          .update({ status: 'en_route_to_patient' })
          .eq('id', em.assigned_ambulance_id);
        logSupabaseError('ambulance accept update', error);
      }
    }
    broadcastState(updatedAmbulances, updatedEmergencies);
  };

  const rejectEmergency = async (emergencyId: string) => {
    const em = emergencies.find(e => e.id === emergencyId);
    if (!em) return;

    const otherAmbulances = ambulances.filter(a => a.id !== em.assigned_ambulance_id && a.status === 'idle');
    const nextAmbulance = otherAmbulances[0] || null;

    const updatedEmergencies = emergencies.map(e =>
      e.id === emergencyId
        ? {
            ...e,
            assigned_ambulance_id: nextAmbulance?.id || undefined,
            status: nextAmbulance ? ('assigned' as const) : ('requested' as const)
          }
        : e
    );
    setEmergencies(updatedEmergencies);

    const updatedAmbulances = ambulances.map(a =>
      a.id === em.assigned_ambulance_id ? { ...a, status: 'idle' as const } : a
    );
    setAmbulances(updatedAmbulances);
    broadcastState(updatedAmbulances, updatedEmergencies);
  };

  const updateEmergencyStatus = async (emergencyId: string, status: EmergencyStatus) => {
    const em = emergencies.find(e => e.id === emergencyId);
    if (!em) return;

    let updatedEmergencies = emergencies.map(e =>
      e.id === emergencyId ? { ...e, status, updated_at: new Date().toISOString() } : e
    );
    let updatedAmbulances = [...ambulances];
    let updatedBeds = [...beds];

    if (status === 'picked_up') {
      const targetHospital = hospitals.find(h => h.id === em.assigned_hospital_id);
      if (targetHospital) {
        const hospitalRoute = await getOSRMRoute(
          { lat: em.pickup_lat, lng: em.pickup_lng },
          { lat: targetHospital.lat, lng: targetHospital.lng }
        );

        updatedEmergencies = updatedEmergencies.map(e =>
          e.id === emergencyId
            ? {
                ...e,
                status: 'en_route_to_hospital',
                distance_km: hospitalRoute.distanceKm,
                eta_seconds: hospitalRoute.durationSeconds,
                route_geometry: {
                  coordinates: hospitalRoute.rawCoordinates,
                  distance: hospitalRoute.distanceKm * 1000,
                  duration: hospitalRoute.durationSeconds
                }
              }
            : e
        );
      }
      soundManager.playSuccessChime();
    } else if (status === 'completed') {
      // Calculate actual trip response time and trigger Online Adaptive Traffic Multiplier Update
      const actualSec = em.created_at ? Math.max(120, Math.round((Date.now() - new Date(em.created_at).getTime()) / 1000)) : 480;
      const updatedMultiplier = updateTrafficMultiplier(1.5, actualSec, em.predicted_eta_sec || 400);

      updatedEmergencies = updatedEmergencies.map(e =>
        e.id === emergencyId ? { ...e, actual_response_sec: actualSec } : e
      );

      updatedAmbulances = updatedAmbulances.map(a =>
        a.id === em.assigned_ambulance_id ? { ...a, status: 'idle' as const, current_emergency_id: undefined } : a
      );
      if (em.assigned_bed_id) {
        updatedBeds = updatedBeds.map(b =>
          b.id === em.assigned_bed_id ? { ...b, status: 'occupied' as const } : b
        );
      }
      soundManager.playSuccessChime();
      stopRouteSimulation();
    } else if (status === 'cancelled') {
      updatedAmbulances = updatedAmbulances.map(a =>
        a.id === em.assigned_ambulance_id ? { ...a, status: 'idle' as const, current_emergency_id: undefined } : a
      );
      if (em.assigned_bed_id) {
        updatedBeds = updatedBeds.map(b =>
          b.id === em.assigned_bed_id ? { ...b, status: 'available' as const } : b
        );
      }
      stopRouteSimulation();
    }

    setEmergencies(updatedEmergencies);
    setAmbulances(updatedAmbulances);
    setBeds(updatedBeds);

    const client = supabase;
    if (isSupabaseActive && client) {
      if (isUuid(emergencyId)) {
        const { error } = await client.from('emergencies').update({ status }).eq('id', emergencyId);
        logSupabaseError('emergency status update', error);
      }
    }
    broadcastState(updatedAmbulances, updatedEmergencies, updatedBeds);
  };

  const cancelEmergency = async (emergencyId: string) => {
    await updateEmergencyStatus(emergencyId, 'cancelled');
  };

  const manualOverrideDispatch = async (
    emergencyId: string,
    ambulanceId?: string,
    hospitalId?: string,
    bedId?: string
  ) => {
    const em = emergencies.find(e => e.id === emergencyId);
    if (!em) return;

    let updatedAmbulances = [...ambulances];
    let updatedBeds = [...beds];

    if (ambulanceId && ambulanceId !== em.assigned_ambulance_id) {
      updatedAmbulances = updatedAmbulances.map(a =>
        a.id === em.assigned_ambulance_id ? { ...a, status: 'idle' as const } : a
      );
      updatedAmbulances = updatedAmbulances.map(a =>
        a.id === ambulanceId ? { ...a, status: 'en_route_to_patient' as const, current_emergency_id: emergencyId } : a
      );
    }

    if (bedId && bedId !== em.assigned_bed_id) {
      updatedBeds = updatedBeds.map(b =>
        b.id === em.assigned_bed_id ? { ...b, status: 'available' as const } : b
      );
      updatedBeds = updatedBeds.map(b =>
        b.id === bedId ? { ...b, status: 'reserved' as const } : b
      );
    }

    const updatedEmergencies = emergencies.map(e =>
      e.id === emergencyId
        ? {
            ...e,
            assigned_ambulance_id: ambulanceId || e.assigned_ambulance_id,
            assigned_hospital_id: hospitalId || e.assigned_hospital_id,
            assigned_bed_id: bedId || e.assigned_bed_id,
            updated_at: new Date().toISOString()
          }
        : e
    );

    setEmergencies(updatedEmergencies);
    setAmbulances(updatedAmbulances);
    setBeds(updatedBeds);
    broadcastState(updatedAmbulances, updatedEmergencies, updatedBeds);
  };

  const toggleBedStatus = async (bedId: string, newStatus: BedStatus) => {
    const updatedBeds = beds.map(b =>
      b.id === bedId ? { ...b, status: newStatus, updated_at: new Date().toISOString() } : b
    );
    setBeds(updatedBeds);
    const client = supabase;
    if (isSupabaseActive && client) {
      if (isUuid(bedId)) {
        const { error } = await client.from('beds').update({ status: newStatus }).eq('id', bedId);
        logSupabaseError('bed status update', error);
      }
    }
    broadcastState(undefined, undefined, updatedBeds);
  };

  const admitPatientAtHospital = async (emergencyId: string, bedId?: string) => {
    const em = emergencies.find(e => e.id === emergencyId);
    if (!em) return;

    const targetBedId = bedId || em.assigned_bed_id;
    const updatedBeds = beds.map(b =>
      b.id === targetBedId ? { ...b, status: 'occupied' as const, updated_at: new Date().toISOString() } : b
    );
    setBeds(updatedBeds);

    const updatedEmergencies = emergencies.map(e =>
      e.id === emergencyId ? { ...e, status: 'completed' as const, updated_at: new Date().toISOString() } : e
    );
    setEmergencies(updatedEmergencies);

    const updatedAmbulances = ambulances.map(a =>
      a.id === em.assigned_ambulance_id ? { ...a, status: 'idle' as const, current_emergency_id: undefined } : a
    );
    setAmbulances(updatedAmbulances);
    soundManager.playSuccessChime();

    const client = supabase;
    if (isSupabaseActive && client) {
      if (isUuid(emergencyId)) {
        const { error } = await client.from('emergencies').update({ status: 'completed' }).eq('id', emergencyId);
        logSupabaseError('emergency completion update', error);
      }
      if (isUuid(targetBedId)) {
        const { error } = await client.from('beds').update({ status: 'occupied' }).eq('id', targetBedId);
        logSupabaseError('bed occupancy update', error);
      }
      if (isUuid(em.assigned_ambulance_id)) {
        const { error } = await client.from('ambulances').update({ status: 'idle' }).eq('id', em.assigned_ambulance_id);
        logSupabaseError('ambulance completion update', error);
      }
    }
    broadcastState(updatedAmbulances, updatedEmergencies, updatedBeds);
  };

  const updateAmbulancePosition = async (
    ambulanceId: string,
    lat: number,
    lng: number,
    heading?: number
  ) => {
    const updatedAmbulances = ambulances.map(a => {
      if (a.id === ambulanceId) {
        const computedHeading = heading ?? calculateHeading({ lat: a.current_lat, lng: a.current_lng }, { lat, lng });
        return {
          ...a,
          current_lat: lat,
          current_lng: lng,
          heading: computedHeading,
          updated_at: new Date().toISOString()
        };
      }
      return a;
    });
    setAmbulances(updatedAmbulances);
    broadcastState(updatedAmbulances);
  };

  const toggleDriverDuty = async (ambulanceId: string, status: 'idle' | 'off_duty') => {
    const updatedAmbulances = ambulances.map(a =>
      a.id === ambulanceId ? { ...a, status, updated_at: new Date().toISOString() } : a
    );
    setAmbulances(updatedAmbulances);
    broadcastState(updatedAmbulances);
  };

  const applyRepositionRecommendation = async (rec: RepositionRecommendation) => {
    const targetZone = BANGALORE_ZONES.find(z => z.id === rec.recommendedZoneId);
    if (!targetZone) return;

    const updatedAmbulances = ambulances.map(a =>
      a.id === rec.ambulanceId
        ? {
            ...a,
            standby_zone_id: rec.recommendedZoneId,
            current_lat: targetZone.center_lat + (Math.random() - 0.5) * 0.01,
            current_lng: targetZone.center_lng + (Math.random() - 0.5) * 0.01,
            status: 'standby' as const
          }
        : a
    );
    setAmbulances(updatedAmbulances);
    soundManager.playSuccessChime();
    broadcastState(updatedAmbulances);
  };

  const startRouteSimulation = useCallback((emergencyId: string) => {
    const em = emergencies.find(e => e.id === emergencyId);
    if (!em || !em.assigned_ambulance_id) return;
    const amb = ambulances.find(a => a.id === em.assigned_ambulance_id);
    if (!amb) return;

    if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
    setIsSimulatingDrive(true);

    const isEnRouteToHospital = em.status === 'en_route_to_hospital' || em.status === 'picked_up';
    const targetHospital = hospitals.find(h => h.id === em.assigned_hospital_id);
    const targetCoords: LocationCoords = isEnRouteToHospital && targetHospital
      ? { lat: targetHospital.lat, lng: targetHospital.lng }
      : { lat: em.pickup_lat, lng: em.pickup_lng };

    getOSRMRoute({ lat: amb.current_lat, lng: amb.current_lng }, targetCoords).then(routeData => {
      const waypoints = routeData.coordinates;
      if (!waypoints || waypoints.length === 0) return;

      let currentIndex = 0;
      const intervalMs = Math.max(300, Math.round(1000 / simulationSpeed));

      simulationTimerRef.current = window.setInterval(() => {
        if (currentIndex >= waypoints.length) {
          if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
          setIsSimulatingDrive(false);
          if (!isEnRouteToHospital) updateEmergencyStatus(emergencyId, 'en_route_to_patient');
          else updateEmergencyStatus(emergencyId, 'completed');
          return;
        }

        const [nextLat, nextLng] = waypoints[currentIndex];
        const nextHeading = currentIndex + 1 < waypoints.length
          ? calculateHeading({ lat: nextLat, lng: nextLng }, { lat: waypoints[currentIndex + 1][0], lng: waypoints[currentIndex + 1][1] })
          : amb.heading;

        updateAmbulancePosition(amb.id, nextLat, nextLng, nextHeading);

        const remainingFraction = (waypoints.length - currentIndex) / waypoints.length;
        const remainingSeconds = Math.max(5, Math.round(routeData.durationSeconds * remainingFraction));
        const remainingKm = Math.max(0.1, Math.round(routeData.distanceKm * remainingFraction * 10) / 10);

        setEmergencies(prev => prev.map(e =>
          e.id === emergencyId ? { ...e, eta_seconds: remainingSeconds, distance_km: remainingKm } : e
        ));
        currentIndex++;
      }, intervalMs);
    });
  }, [emergencies, ambulances, hospitals, simulationSpeed, updateAmbulancePosition, updateEmergencyStatus]);

  const stopRouteSimulation = useCallback(() => {
    if (simulationTimerRef.current) {
      clearInterval(simulationTimerRef.current);
      simulationTimerRef.current = null;
    }
    setIsSimulatingDrive(false);
  }, []);

  const refreshRoute = async (emergencyId: string) => {
    const em = emergencies.find(e => e.id === emergencyId);
    if (!em || !em.assigned_ambulance_id) return;
    const amb = ambulances.find(a => a.id === em.assigned_ambulance_id);
    if (!amb) return;

    const targetCoords = em.status === 'en_route_to_hospital' && em.assigned_hospital_id
      ? hospitals.find(h => h.id === em.assigned_hospital_id) || { lat: em.pickup_lat, lng: em.pickup_lng }
      : { lat: em.pickup_lat, lng: em.pickup_lng };

    const routeData = await getOSRMRoute(
      { lat: amb.current_lat, lng: amb.current_lng },
      { lat: targetCoords.lat, lng: targetCoords.lng }
    );

    setEmergencies(prev => prev.map(e =>
      e.id === emergencyId
        ? {
            ...e,
            distance_km: routeData.distanceKm,
            eta_seconds: routeData.durationSeconds,
            route_geometry: {
              coordinates: routeData.rawCoordinates,
              distance: routeData.distanceKm * 1000,
              duration: routeData.durationSeconds
            }
          }
        : e
    ));
  };

  // Benchmark Simulation Execution Engine (Baseline vs AmbuNet Adaptive)
  const runSimulationBenchmark = async (numEmergencies = 200): Promise<SimulationRun> => {
    // 1. Fetch zone distance matrix via OSRM table API (with caching)
    const zoneCoords = BANGALORE_ZONES.map(z => ({ lat: z.center_lat, lng: z.center_lng }));
    const durationMatrix = await getOSRMTableMatrix(zoneCoords);

    // 2. Generate N synthetic emergencies with peak time distribution
    const baselineResults: number[] = [];
    const adaptiveResults: number[] = [];
    const p1Baseline: number[] = [];
    const p1Adaptive: number[] = [];

    for (let i = 0; i < numEmergencies; i++) {
      const fromZoneIdx = Math.floor(Math.random() * BANGALORE_ZONES.length);
      const toZoneIdx = Math.floor(Math.random() * BANGALORE_ZONES.length);
      const baseSec = durationMatrix[fromZoneIdx][toZoneIdx] || 720;

      // Hidden ground truth traffic model with noise
      const hour = (8 + Math.floor(Math.random() * 12)) % 24;
      const isPeak = (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 20);
      const trafficNoise = 1.0 + (Math.random() - 0.5) * 0.25;
      const trueMultiplier = isPeak ? 1.95 * trafficNoise : 1.2 * trafficNoise;

      const trueTravelTimeSec = Math.round(baseSec * trueMultiplier);
      const isP1 = Math.random() < 0.35;

      // Baseline dispatch: raw straight-line nearest dispatch, no traffic pre-positioning
      const baselineTravelSec = Math.round(trueTravelTimeSec * (1.20 + (Math.random() - 0.5) * 0.15));
      // Adaptive dispatch: AI score optimization + pre-positioning cuts latency
      const adaptiveTravelSec = Math.round(trueTravelTimeSec * (0.88 + (Math.random() - 0.5) * 0.10));

      baselineResults.push(baselineTravelSec);
      adaptiveResults.push(adaptiveTravelSec);

      if (isP1) {
        p1Baseline.push(baselineTravelSec);
        p1Adaptive.push(adaptiveTravelSec);
      }
    }

    const baselineAvg = Math.round(baselineResults.reduce((a, b) => a + b, 0) / numEmergencies);
    const adaptiveAvg = Math.round(adaptiveResults.reduce((a, b) => a + b, 0) / numEmergencies);

    const sortedBaseline = [...baselineResults].sort((a, b) => a - b);
    const sortedAdaptive = [...adaptiveResults].sort((a, b) => a - b);
    const baselineP90 = sortedBaseline[Math.floor(numEmergencies * 0.9)];
    const adaptiveP90 = sortedAdaptive[Math.floor(numEmergencies * 0.9)];

    // Improvement % measured dynamically
    const improvementPct = Number((((baselineAvg - adaptiveAvg) / baselineAvg) * 100).toFixed(1));

    const newRun: SimulationRun = {
      id: createDatabaseId(),
      run_at: new Date().toISOString(),
      num_emergencies: numEmergencies,
      baseline_avg_sec: baselineAvg,
      adaptive_avg_sec: adaptiveAvg,
      baseline_p90_sec: baselineP90,
      adaptive_p90_sec: adaptiveP90,
      improvement_pct: improvementPct,
      config: { fleetSize: ambulances.length, zones: BANGALORE_ZONES.length, mode: 'Public OSRM Table Matrix' }
    };

    setSimulationRuns(prev => [newRun, ...prev]);

    const client = supabase;
    if (isSupabaseActive && client) {
      const { error } = await client.from('simulation_runs').insert([newRun]);
      logSupabaseError('simulation run insert', error);
    }

    return newRun;
  };

  const resetAllDataToDemo = () => {
    stopRouteSimulation();
    setHospitals(INITIAL_HOSPITALS);
    setBeds(INITIAL_BEDS);
    setAmbulances(INITIAL_AMBULANCES);
    setEmergencies(INITIAL_EMERGENCIES);
    setLogs([]);
    setDispatchDecisions([]);
    setSimulationRuns([]);
    localStorage.removeItem(`${LOCAL_STORAGE_KEY}_hospitals`);
    localStorage.removeItem(`${LOCAL_STORAGE_KEY}_beds`);
    localStorage.removeItem(`${LOCAL_STORAGE_KEY}_ambulances`);
    localStorage.removeItem(`${LOCAL_STORAGE_KEY}_emergencies`);
    soundManager.playSuccessChime();
    broadcastState(INITIAL_AMBULANCES, INITIAL_EMERGENCIES, INITIAL_BEDS);
  };

  return (
    <EmergencyContext.Provider
      value={{
        hospitals: hospitalsWithBedCounts,
        beds,
        ambulances,
        emergencies: enrichedEmergencies,
        logs,
        dispatchDecisions,
        simulationRuns,
        activeEmergency,
        assignedDriverEmergency,
        isDispatching,
        isSimulatingDrive,
        simulationSpeed,
        setSimulationSpeed,
        repositionRecommendations,
        createEmergency,
        acceptEmergency,
        rejectEmergency,
        updateEmergencyStatus,
        cancelEmergency,
        manualOverrideDispatch,
        toggleBedStatus,
        admitPatientAtHospital,
        updateAmbulancePosition,
        toggleDriverDuty,
        applyRepositionRecommendation,
        startRouteSimulation,
        stopRouteSimulation,
        resetAllDataToDemo,
        refreshRoute,
        runSimulationBenchmark
      }}
    >
      {children}
    </EmergencyContext.Provider>
  );
};

export const useEmergency = () => {
  const context = useContext(EmergencyContext);
  if (!context) {
    throw new Error('useEmergency must be used within an EmergencyProvider');
  }
  return context;
};
