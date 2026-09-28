import React from 'react';
import { Emergency, Ambulance, Hospital } from '../../types';
import { useEmergency } from '../../context/EmergencyContext';
import { AmbuNetMap } from '../map/AmbuNetMap';
import { GpsSimulatorControl } from './GpsSimulatorControl';
import { formatDistance, formatETA } from '../../lib/haversine';
import {
  Navigation,
  CheckCircle,
  Building2,
  Phone,
  Clock,
  MapPin,
  HeartPulse,
  ShieldAlert,
  ArrowRight,
  UserCheck
} from 'lucide-react';

interface DriverTripNavigationProps {
  emergency: Emergency;
  ambulance: Ambulance;
}

export const DriverTripNavigation: React.FC<DriverTripNavigationProps> = ({
  emergency,
  ambulance
}) => {
  const { hospitals, updateEmergencyStatus } = useEmergency();
  const assignedHospital = hospitals.find(h => h.id === emergency.assigned_hospital_id);

  const isHeadingToPatient = emergency.status === 'assigned' || emergency.status === 'en_route_to_patient';
  const isEnRouteToHospital = emergency.status === 'picked_up' || emergency.status === 'en_route_to_hospital';

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fadeIn">
      {/* Active Mission Header */}
      <div className="bg-gradient-to-r from-red-950 via-slate-900 to-red-950 border-2 border-red-500 rounded-3xl p-5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-red-600/30 border border-red-500 text-red-400 flex items-center justify-center animate-pulse flex-shrink-0">
            <Navigation className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-red-500 text-white font-black text-[11px] px-3 py-0.5 rounded-full uppercase tracking-wider">
                Active Mission
              </span>
              <span className="text-xs font-mono text-slate-400">Unit: {ambulance.vehicle_number}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
              {isHeadingToPatient ? '1. Transit to Patient Location' : '2. Transit to Destination Hospital'}
            </h2>
            <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-red-400" />
              Target: <strong className="text-white">{isHeadingToPatient ? emergency.pickup_address : assignedHospital?.name}</strong>
            </p>
          </div>
        </div>

        {/* Live Distance / ETA box */}
        <div className="flex items-center gap-3 bg-slate-950/90 px-5 py-3 rounded-2xl border border-red-500/40 shadow-inner">
          <Clock className="w-6 h-6 text-sky-400 animate-spin" style={{ animationDuration: '4s' }} />
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Estimated Transit</p>
            <p className="text-2xl font-black text-sky-400 leading-none mt-0.5 font-mono">
              {formatETA(emergency.eta_seconds || 180)}
            </p>
            <p className="text-[11px] text-slate-400 font-medium">{formatDistance(emergency.distance_km || 1.8)} remaining</p>
          </div>
        </div>
      </div>

      {/* Simulator Control for quick demonstration */}
      <GpsSimulatorControl emergencyId={emergency.id} />

      {/* Live Map */}
      <div className="relative">
        <AmbuNetMap
          ambulances={[ambulance]}
          hospitals={assignedHospital ? [assignedHospital] : hospitals}
          emergencies={[emergency]}
          activeEmergency={emergency}
          className="h-[420px] sm:h-[480px] w-full rounded-3xl overflow-hidden shadow-2xl border border-slate-800"
        />
      </div>

      {/* Driver Stage Action Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Mission Stage Action Controls
        </h4>

        {isHeadingToPatient && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => updateEmergencyStatus(emergency.id, 'en_route_to_patient')}
              className="flex items-center justify-center gap-2 py-4 px-6 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl text-sm border border-slate-700 transition"
            >
              <Navigation className="w-5 h-5 text-sky-400" />
              Update: En Route to Patient
            </button>

            <button
              onClick={() => updateEmergencyStatus(emergency.id, 'picked_up')}
              className="flex items-center justify-center gap-2 py-4 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-2xl text-sm shadow-xl shadow-emerald-600/30 transition transform hover:scale-[1.01]"
            >
              <UserCheck className="w-5 h-5" />
              PATIENT PICKED UP & ONBOARD
            </button>
          </div>
        )}

        {isEnRouteToHospital && (
          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={() => updateEmergencyStatus(emergency.id, 'completed')}
              className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-2xl text-base shadow-xl shadow-blue-600/30 transition transform hover:scale-[1.01]"
            >
              <Building2 className="w-6 h-6" />
              ARRIVED AT HOSPITAL & HANDOVER PATIENT
            </button>
          </div>
        )}
      </div>

      {/* Patient Vitals & Destination Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Caller Info */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <HeartPulse className="w-4 h-4 text-red-400" /> Patient Medical Profile
          </span>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Patient Name:</span>
              <span className="font-bold text-white text-sm">{emergency.patient_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Emergency Type:</span>
              <span className="font-bold text-red-400 uppercase">{emergency.emergency_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Blood Group:</span>
              <span className="font-bold text-emerald-400">{emergency.patient_medical_profile?.blood_group || 'O+'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Allergies:</span>
              <span className="font-semibold text-amber-300">{emergency.patient_medical_profile?.allergies || 'None'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Conditions:</span>
              <span className="font-semibold text-slate-200">{emergency.patient_medical_profile?.conditions || 'None'}</span>
            </div>
          </div>

          {emergency.patient_phone && (
            <a
              href={`tel:${emergency.patient_phone}`}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs border border-slate-700 transition"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-400" /> Call Caller ({emergency.patient_phone})
            </a>
          )}
        </div>

        {/* Assigned Hospital Info */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-sky-400" /> Destination Hospital & Bed
          </span>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-white text-sm">{assignedHospital?.name || 'Central General Hospital'}</h4>
                <p className="text-[11px] text-slate-400">{assignedHospital?.address}</p>
              </div>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-800">
              <span className="text-slate-400">Reserved Bed:</span>
              <span className="font-bold text-emerald-400">Reserved & Ready for Triage</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Triage Desk Contact:</span>
              <span className="font-mono text-sky-300">{assignedHospital?.contact_number}</span>
            </div>
          </div>

          {assignedHospital?.contact_number && (
            <a
              href={`tel:${assignedHospital.contact_number}`}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 font-semibold rounded-xl text-xs border border-sky-500/40 transition"
            >
              <Phone className="w-3.5 h-3.5" /> Call Hospital Triage ({assignedHospital.contact_number})
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
