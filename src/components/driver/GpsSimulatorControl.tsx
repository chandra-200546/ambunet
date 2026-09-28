import React from 'react';
import { useEmergency } from '../../context/EmergencyContext';
import { Play, Pause, Navigation2, Zap } from 'lucide-react';

interface GpsSimulatorControlProps {
  emergencyId: string;
}

export const GpsSimulatorControl: React.FC<GpsSimulatorControlProps> = ({ emergencyId }) => {
  const {
    isSimulatingDrive,
    simulationSpeed,
    setSimulationSpeed,
    startRouteSimulation,
    stopRouteSimulation
  } = useEmergency();

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className="p-2 bg-sky-500/20 text-sky-400 rounded-xl border border-sky-500/30">
          <Navigation2 className="w-4 h-4 animate-pulse" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
            GPS Route Motion Simulator
            <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full font-mono font-normal">
              Demo Feature (up to 10x)
            </span>
          </h4>
          <p className="text-[11px] text-slate-400">
            Animates ambulance along OSRM route in real-time so Patient, Hospital, and Admin views update live.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Speed multiplier selector */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
          {[1, 2, 5, 10].map(speed => (
            <button
              key={speed}
              onClick={() => setSimulationSpeed(speed)}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                simulationSpeed === speed
                  ? 'bg-sky-500 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>

        {/* Start / Stop Toggle */}
        <button
          onClick={() => {
            if (isSimulatingDrive) stopRouteSimulation();
            else startRouteSimulation(emergencyId);
          }}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow-lg ${
            isSimulatingDrive
              ? 'bg-amber-600 hover:bg-amber-500 text-white'
              : 'bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white'
          }`}
        >
          {isSimulatingDrive ? (
            <>
              <Pause className="w-3.5 h-3.5" /> Pause Motion
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" /> Simulate Driver Motion
            </>
          )}
        </button>
      </div>
    </div>
  );
};
