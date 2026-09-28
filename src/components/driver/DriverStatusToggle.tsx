import React, { useEffect, useState } from 'react';
import { Ambulance } from '../../types';
import { useEmergency } from '../../context/EmergencyContext';
import { Radio, Power, Navigation, ShieldCheck } from 'lucide-react';

interface DriverStatusToggleProps {
  ambulance: Ambulance;
}

export const DriverStatusToggle: React.FC<DriverStatusToggleProps> = ({ ambulance }) => {
  const { toggleDriverDuty, updateAmbulancePosition } = useEmergency();
  const [isWatchingGps, setIsWatchingGps] = useState(false);

  const isOnline = ambulance.status !== 'off_duty';

  const handleToggle = () => {
    toggleDriverDuty(ambulance.id, isOnline ? 'off_duty' : 'idle');
  };

  // Live navigator.geolocation.watchPosition
  useEffect(() => {
    if (!isOnline || !navigator.geolocation) {
      setIsWatchingGps(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setIsWatchingGps(true);
        updateAmbulancePosition(
          ambulance.id,
          pos.coords.latitude,
          pos.coords.longitude,
          pos.coords.heading || undefined
        );
      },
      (err) => {
        console.warn('Geolocation watch error:', err.message);
        setIsWatchingGps(false);
      },
      { enableHighAccuracy: true, maximumAge: 3000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isOnline, ambulance.id]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg border transition ${
          isOnline
            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
            : 'bg-slate-800 text-slate-400 border-slate-700'
        }`}>
          🚑
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white">Unit {ambulance.vehicle_number}</h3>
            <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
              ambulance.status === 'idle'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : ambulance.status === 'off_duty'
                ? 'bg-slate-800 text-slate-400 border-slate-700'
                : 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse'
            }`}>
              {ambulance.status.replace(/_/g, ' ')}
            </span>
          </div>

          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
            <span>Driver: <strong className="text-slate-200">{ambulance.driver_name || 'Active Driver'}</strong></span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Navigation className={`w-3 h-3 ${isWatchingGps ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
              {isWatchingGps ? 'Live GPS Stream Connected' : 'GPS Simulation Ready'}
            </span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto">
        <button
          onClick={handleToggle}
          className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition shadow-lg ${
            isOnline
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-400/40'
          }`}
        >
          <Power className="w-4 h-4" />
          {isOnline ? 'Go Off Duty' : 'Go Online & Available'}
        </button>
      </div>
    </div>
  );
};
