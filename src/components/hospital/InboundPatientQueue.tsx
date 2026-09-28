import React, { useState } from 'react';
import { Hospital, Emergency } from '../../types';
import { useEmergency } from '../../context/EmergencyContext';
import { formatETA, formatDistance } from '../../lib/haversine';
import {
  BellRing,
  Clock,
  HeartPulse,
  BedDouble,
  CheckCircle,
  UserCheck,
  Phone,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

interface InboundPatientQueueProps {
  hospital: Hospital;
}

export const InboundPatientQueue: React.FC<InboundPatientQueueProps> = ({ hospital }) => {
  const { emergencies, ambulances, beds, admitPatientAtHospital } = useEmergency();

  // Filter emergencies assigned to this hospital that are currently active
  const inboundEmergencies = emergencies
    .filter(
      em =>
        em.assigned_hospital_id === hospital.id &&
        em.status !== 'completed' &&
        em.status !== 'cancelled'
    )
    .sort((a, b) => (a.eta_seconds || 999) - (b.eta_seconds || 999));

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-red-500/20 text-red-400 rounded-2xl border border-red-500/30">
            <BellRing className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Inbound Emergency Arrivals</h3>
            <p className="text-xs text-slate-400">Live incoming ambulances en route to this hospital</p>
          </div>
        </div>

        <span className="text-xs font-black px-3 py-1 bg-red-500/20 text-red-400 rounded-full border border-red-500/30">
          {inboundEmergencies.length} Approaching
        </span>
      </div>

      {inboundEmergencies.length === 0 ? (
        <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800/80">
          <CheckCircle className="w-10 h-10 text-emerald-500/50 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-slate-300">No Inbound Emergencies Right Now</h4>
          <p className="text-xs text-slate-500 mt-1">
            New rescue dispatches assigned to {hospital.name} will appear here with live ETA and medical vitals.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {inboundEmergencies.map((em) => {
            const amb = ambulances.find(a => a.id === em.assigned_ambulance_id);
            const reservedBed = beds.find(b => b.id === em.assigned_bed_id);

            return (
              <div
                key={em.id}
                className="bg-slate-950 p-5 rounded-2xl border-2 border-red-500/40 hover:border-red-500 shadow-xl space-y-4 transition"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-black uppercase px-2.5 py-1 rounded-full bg-red-500 text-white shadow-md shadow-red-500/30">
                      🚨 {em.emergency_type}
                    </span>
                    <h4 className="font-bold text-white text-base">Patient: {em.patient_name}</h4>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700">
                    <Clock className="w-4 h-4 text-sky-400 animate-spin" />
                    <span className="text-xs font-bold text-sky-400 font-mono">
                      ETA: {formatETA(em.eta_seconds || 180)} ({formatDistance(em.distance_km || 1.8)})
                    </span>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 font-semibold block mb-0.5">Assigned Ambulance</span>
                    <p className="font-bold text-white">🚑 {amb?.vehicle_number || 'AMB-901'}</p>
                    <p className="text-[11px] text-slate-400">Driver: {amb?.driver_name || 'Active Paramedic'}</p>
                  </div>

                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 font-semibold block mb-0.5">Reserved Bed</span>
                    <p className="font-bold text-emerald-400 flex items-center gap-1">
                      <BedDouble className="w-3.5 h-3.5" /> Bed {reservedBed?.bed_number || 'ICU-101'}
                    </p>
                    <span className="text-[10px] text-slate-400 font-medium">Type: {reservedBed?.bed_type || 'ICU'} Ward</span>
                  </div>

                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 font-semibold block mb-0.5">Patient Vitals</span>
                    <p className="font-bold text-slate-200">
                      Blood: <span className="text-emerald-400 font-black">{em.patient_medical_profile?.blood_group || 'O+'}</span>
                    </p>
                    <p className="text-[10px] text-amber-300 truncate">
                      Allergies: {em.patient_medical_profile?.allergies || 'None'}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="text-xs text-slate-400">
                    Status: <strong className="text-amber-400 uppercase">{em.status.replace(/_/g, ' ')}</strong>
                  </div>

                  <button
                    onClick={() => admitPatientAtHospital(em.id, reservedBed?.id)}
                    className="flex items-center gap-2 py-2.5 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-600/20 transition"
                  >
                    <UserCheck className="w-4 h-4" />
                    Admit Patient & Free Ambulance
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
