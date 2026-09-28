import React, { useState } from 'react';
import { Emergency } from '../../types';
import { useEmergency } from '../../context/EmergencyContext';
import { AmbuNetMap } from '../map/AmbuNetMap';
import { ShareTrackingModal } from './ShareTrackingModal';
import { formatETA, formatDistance } from '../../lib/haversine';
import {
  ShieldAlert,
  Phone,
  Share2,
  Clock,
  MapPin,
  Building2,
  AlertOctagon,
  CheckCircle2,
  Activity,
  HeartPulse
} from 'lucide-react';

interface PatientActiveTrackerProps {
  emergency: Emergency;
}

export const PatientActiveTracker: React.FC<PatientActiveTrackerProps> = ({ emergency }) => {
  const { ambulances, hospitals, cancelEmergency } = useEmergency();
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const assignedAmbulance = ambulances.find(a => a.id === emergency.assigned_ambulance_id);
  const assignedHospital = hospitals.find(h => h.id === emergency.assigned_hospital_id);

  // Status step progression
  const getStepStatus = (step: 'assigned' | 'en_route_to_patient' | 'picked_up' | 'en_route_to_hospital') => {
    const order = ['requested', 'assigned', 'en_route_to_patient', 'picked_up', 'en_route_to_hospital', 'completed'];
    const currentIdx = order.indexOf(emergency.status);
    const targetIdx = order.indexOf(step);

    if (currentIdx > targetIdx) return 'completed';
    if (currentIdx === targetIdx) return 'active';
    return 'pending';
  };

  const etaSeconds = emergency.eta_seconds || 300;
  const distanceKm = emergency.distance_km || 2.4;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fadeIn">
      {/* Top Urgent Alert Bar */}
      <div className="bg-gradient-to-r from-red-950 via-slate-900 to-red-950 border-2 border-red-500/60 rounded-3xl p-5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-red-600/30 border border-red-500 text-red-400 flex items-center justify-center animate-pulse flex-shrink-0">
            <Activity className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-red-500 text-white font-extrabold text-[11px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Rescue in Progress
              </span>
              <span className="text-xs text-slate-400">Case #{emergency.id.slice(-6).toUpperCase()}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1 capitalize">
              {emergency.emergency_type} Emergency Response
            </h2>
            <p className="text-xs text-slate-300">
              Pickup: <span className="font-semibold text-slate-100">{emergency.pickup_address}</span>
            </p>
          </div>
        </div>

        {/* Live ETA Countdown Badge */}
        <div className="flex items-center gap-3 bg-slate-950/90 px-5 py-3 rounded-2xl border border-red-500/40 shadow-inner">
          <Clock className="w-6 h-6 text-red-400 animate-spin" style={{ animationDuration: '4s' }} />
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Estimated Arrival</p>
            <p className="text-2xl font-black text-red-400 leading-none mt-0.5 font-mono">
              {formatETA(etaSeconds)}
            </p>
            <p className="text-[11px] text-slate-400 font-medium">({formatDistance(distanceKm)} away)</p>
          </div>
        </div>
      </div>

      {/* Real-time Leaflet Map Component */}
      <div className="relative">
        <AmbuNetMap
          ambulances={assignedAmbulance ? [assignedAmbulance] : ambulances}
          hospitals={assignedHospital ? [assignedHospital] : hospitals}
          emergencies={[emergency]}
          activeEmergency={emergency}
          className="h-[420px] sm:h-[480px] w-full rounded-3xl overflow-hidden shadow-2xl border border-slate-800"
        />

        {/* Floating Quick Action Overlay */}
        <div className="absolute bottom-4 left-4 right-4 z-[1000] flex flex-wrap gap-2 justify-between items-center pointer-events-none">
          <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-700 shadow-xl flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-bold text-slate-200">Live GPS Stream Active</span>
          </div>

          <div className="pointer-events-auto flex items-center gap-2">
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xl transition"
            >
              <Share2 className="w-4 h-4" /> Share Tracking Link
            </button>
          </div>
        </div>
      </div>

      {/* Workflow Step Tracker */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
          Rescue Progress Timeline
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { id: 'assigned', label: '1. Dispatched', desc: 'Ambulance assigned' },
            { id: 'en_route_to_patient', label: '2. En Route', desc: 'Heading to your location' },
            { id: 'picked_up', label: '3. Patient Onboard', desc: 'Paramedic triage' },
            { id: 'en_route_to_hospital', label: '4. To Hospital', desc: 'Transfer to hospital' }
          ].map(step => {
            const status = getStepStatus(step.id as any);
            return (
              <div
                key={step.id}
                className={`p-3 rounded-2xl border transition ${
                  status === 'completed'
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                    : status === 'active'
                    ? 'bg-red-500/15 border-red-500 text-white shadow-lg ring-1 ring-red-500'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs">{step.label}</span>
                  {status === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {status === 'active' && <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />}
                </div>
                <p className="text-[11px] text-slate-400">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rescue Units: Assigned Driver & Destination Hospital */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Assigned Ambulance Unit */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              🚑 Assigned Ambulance Unit
            </span>
            <span className="text-[11px] font-bold text-red-400 bg-red-500/20 px-2.5 py-0.5 rounded-full border border-red-500/30 uppercase">
              {emergency.status.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="flex items-center gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center font-black text-lg border border-red-500/30">
              {assignedAmbulance?.vehicle_number?.slice(0, 3) || 'AMB'}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-white text-base">
                {assignedAmbulance?.driver_name || 'Paramedic Unit'}
              </h4>
              <p className="text-xs text-slate-400 font-mono">
                Vehicle: <span className="text-red-400 font-bold">{assignedAmbulance?.vehicle_number || 'MED-901'}</span>
              </p>
            </div>
          </div>

          {assignedAmbulance?.driver_phone && (
            <a
              href={`tel:${assignedAmbulance.driver_phone}`}
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-bold rounded-xl border border-emerald-500/40 transition text-sm shadow-md"
            >
              <Phone className="w-4 h-4" /> Call Driver ({assignedAmbulance.driver_phone})
            </a>
          )}
        </div>

        {/* Assigned Destination Hospital */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-sky-400" /> Destination Hospital
            </span>
            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              Bed Reserved
            </span>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
            <h4 className="font-bold text-white text-base">
              {assignedHospital?.name || 'Central General Hospital'}
            </h4>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" /> {assignedHospital?.address || '1001 Potrero Ave, SF'}
            </p>
            <div className="pt-1 flex items-center justify-between text-xs border-t border-slate-800 mt-2">
              <span className="text-slate-400">Reserved Bed Type:</span>
              <span className="font-bold text-sky-400">
                {emergency.emergency_type === 'cardiac' || emergency.emergency_type === 'respiratory' ? 'ICU Ward' : 'Emergency Trauma Bed'}
              </span>
            </div>
          </div>

          {assignedHospital?.contact_number && (
            <a
              href={`tel:${assignedHospital.contact_number}`}
              className="w-full flex items-center justify-center gap-2 py-3 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 font-bold rounded-xl border border-sky-500/40 transition text-sm shadow-md"
            >
              <Phone className="w-4 h-4" /> Call Emergency Triage
            </a>
          )}
        </div>
      </div>

      {/* Cancel Emergency action */}
      <div className="text-center pt-2">
        {showCancelConfirm ? (
          <div className="bg-red-950/80 border border-red-500/80 rounded-2xl p-4 max-w-md mx-auto space-y-3">
            <p className="text-xs text-red-200 font-semibold">
              Are you sure you want to cancel this emergency request? Responding ambulance will be freed.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="px-4 py-1.5 bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold"
              >
                No, Keep Active
              </button>
              <button
                onClick={() => cancelEmergency(emergency.id)}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold"
              >
                Yes, Cancel Request
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="text-xs text-slate-500 hover:text-red-400 underline transition"
          >
            Cancel Emergency Request
          </button>
        )}
      </div>

      {/* Share Modal */}
      <ShareTrackingModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        emergencyId={emergency.id}
      />
    </div>
  );
};
