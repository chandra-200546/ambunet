import React, { useEffect, useState } from 'react';
import { Emergency } from '../../types';
import { useEmergency } from '../../context/EmergencyContext';
import { AmbuNetMap } from '../map/AmbuNetMap';
import { formatETA, formatDistance } from '../../lib/haversine';
import {
  ShieldAlert,
  Clock,
  MapPin,
  Building2,
  Phone,
  CheckCircle2,
  Activity,
  ArrowLeft
} from 'lucide-react';

interface PublicTrackEmergencyProps {
  emergencyId: string;
  onBackToApp?: () => void;
}

export const PublicTrackEmergency: React.FC<PublicTrackEmergencyProps> = ({
  emergencyId,
  onBackToApp
}) => {
  const { emergencies, ambulances, hospitals } = useEmergency();

  const emergency = emergencies.find(e => e.id === emergencyId) || emergencies[0];
  const assignedAmbulance = ambulances.find(a => a.id === emergency?.assigned_ambulance_id);
  const assignedHospital = hospitals.find(h => h.id === emergency?.assigned_hospital_id);

  if (!emergency) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md bg-slate-900 p-8 rounded-3xl border border-slate-800 text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
          <h3 className="text-xl font-bold">Emergency Case Not Found</h3>
          <p className="text-xs text-slate-400">
            This tracking link may have expired or the emergency case has already been resolved and closed.
          </p>
          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl"
            >
              Open AmbuNet Home
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Public Header */}
        <header className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow-lg shadow-red-600/30">
              <span className="text-lg font-black text-white">🚑</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-white">AmbuNet Live Rescue Tracking</h1>
                <span className="text-[10px] font-bold bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30 uppercase">
                  Live Public Feed
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Tracking Case #{emergency.id.slice(-6).toUpperCase()} • Patient: <strong className="text-slate-200">{emergency.patient_name}</strong>
              </p>
            </div>
          </div>

          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </button>
          )}
        </header>

        {/* Live Map */}
        <div className="relative">
          <AmbuNetMap
            ambulances={assignedAmbulance ? [assignedAmbulance] : ambulances}
            hospitals={assignedHospital ? [assignedHospital] : hospitals}
            emergencies={[emergency]}
            activeEmergency={emergency}
            className="h-[450px] sm:h-[500px] w-full rounded-3xl overflow-hidden shadow-2xl border border-slate-800"
          />

          {/* Floating ETA card */}
          <div className="absolute top-4 left-4 z-[1000] bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl border border-slate-700 shadow-2xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-red-400 animate-spin" /> Estimated Arrival
            </span>
            <p className="text-2xl font-black text-red-400 font-mono">
              {formatETA(emergency.eta_seconds || 240)}
            </p>
            <p className="text-[11px] text-slate-400">
              {formatDistance(emergency.distance_km || 1.8)} remaining
            </p>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
            Live Rescue Stage
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { id: 'assigned', label: '1. Dispatched', desc: 'Ambulance assigned' },
              { id: 'en_route_to_patient', label: '2. En Route', desc: 'Heading to patient' },
              { id: 'picked_up', label: '3. Patient Onboard', desc: 'Paramedic triage' },
              { id: 'en_route_to_hospital', label: '4. To Hospital', desc: 'En route to ER' }
            ].map(step => {
              const order = ['requested', 'assigned', 'en_route_to_patient', 'picked_up', 'en_route_to_hospital', 'completed'];
              const currentIdx = order.indexOf(emergency.status);
              const targetIdx = order.indexOf(step.id);
              const isDone = currentIdx > targetIdx;
              const isCurrent = currentIdx === targetIdx;

              return (
                <div
                  key={step.id}
                  className={`p-3 rounded-2xl border ${
                    isDone
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                      : isCurrent
                      ? 'bg-red-500/15 border-red-500 text-white shadow-lg ring-1 ring-red-500'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs">{step.label}</span>
                    {isDone && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    {isCurrent && <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />}
                  </div>
                  <p className="text-[11px] text-slate-400">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Assigned Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              🚑 Responding Ambulance
            </span>
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <h4 className="font-bold text-white text-base">{assignedAmbulance?.driver_name || 'Paramedic Unit'}</h4>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Vehicle: <span className="text-red-400 font-bold">{assignedAmbulance?.vehicle_number || 'MED-901'}</span>
              </p>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-sky-400" /> Destination Hospital
            </span>
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <h4 className="font-bold text-white text-base">{assignedHospital?.name || 'Central General Hospital'}</h4>
              <p className="text-xs text-slate-400 mt-0.5">{assignedHospital?.address}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
