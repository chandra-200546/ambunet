import React, { useState, useEffect } from 'react';
import { Emergency } from '../../types';
import { useEmergency } from '../../context/EmergencyContext';
import { formatDistance, formatETA } from '../../lib/haversine';
import {
  BellRing,
  MapPin,
  HeartPulse,
  Clock,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Phone
} from 'lucide-react';

interface IncomingEmergencyAlertProps {
  emergency: Emergency;
}

export const IncomingEmergencyAlert: React.FC<IncomingEmergencyAlertProps> = ({ emergency }) => {
  const { acceptEmergency, rejectEmergency } = useEmergency();
  const [countdown, setCountdown] = useState<number>(30);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          rejectEmergency(emergency.id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [emergency.id, rejectEmergency]);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border-2 border-red-500 rounded-3xl p-6 sm:p-8 shadow-2xl animate-siren-border">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center animate-bounce">
              <BellRing className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-black tracking-widest text-red-400 bg-red-950 px-2.5 py-0.5 rounded-full border border-red-800">
                Priority Dispatch Alert
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                New Emergency Call
              </h3>
            </div>
          </div>

          {/* Countdown timer */}
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Auto-Decline in</span>
            <div className="text-2xl font-black text-amber-400 font-mono leading-none">
              {countdown}s
            </div>
          </div>
        </div>

        {/* Emergency Details Box */}
        <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 space-y-4 mb-6">
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-800">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Incident Type</span>
              <h4 className="text-lg font-bold text-red-400 uppercase flex items-center gap-1.5 mt-0.5">
                🚨 {emergency.emergency_type} Urgency
              </h4>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Distance</span>
              <p className="text-base font-bold text-sky-400 font-mono mt-0.5">
                {formatDistance(emergency.distance_km || 1.8)} ({formatETA(emergency.eta_seconds || 240)})
              </p>
            </div>
          </div>

          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
              <MapPin className="w-3.5 h-3.5 text-red-500" /> Patient Pickup Address
            </span>
            <p className="text-sm font-semibold text-slate-100 bg-slate-900 p-3 rounded-xl border border-slate-800">
              {emergency.pickup_address}
            </p>
          </div>

          {/* Patient Medical Notes */}
          <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Caller:</span>
              <span className="font-semibold text-slate-200">{emergency.patient_name} ({emergency.patient_phone})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Blood Group:</span>
              <span className="font-bold text-emerald-400">{emergency.patient_medical_profile?.blood_group || 'O+'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Allergies / Conditions:</span>
              <span className="font-semibold text-amber-300">
                {emergency.patient_medical_profile?.allergies || 'None'} / {emergency.patient_medical_profile?.conditions || 'None'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => rejectEmergency(emergency.id)}
            className="flex items-center justify-center gap-2 py-4 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl text-sm transition border border-slate-700"
          >
            <XCircle className="w-5 h-5 text-slate-400" /> Decline / Pass
          </button>

          <button
            onClick={() => acceptEmergency(emergency.id)}
            className="flex items-center justify-center gap-2 py-4 px-4 bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 text-white font-black rounded-2xl text-sm shadow-xl shadow-red-600/30 transition animate-pulse"
          >
            <CheckCircle2 className="w-5 h-5" /> ACCEPT RESCUE
          </button>
        </div>
      </div>
    </div>
  );
};
