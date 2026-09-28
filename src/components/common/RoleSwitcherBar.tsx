import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useEmergency } from '../../context/EmergencyContext';
import { UserRole } from '../../types';
import { User, Truck, Building2, ShieldCheck, Zap, RotateCcw } from 'lucide-react';

export const RoleSwitcherBar: React.FC = () => {
  const { role, setDemoRole } = useAuth();
  const { emergencies, resetAllDataToDemo } = useEmergency();

  const activeCases = emergencies.filter(e => e.status !== 'completed' && e.status !== 'cancelled').length;

  const roles: { role: UserRole; label: string; icon: React.ElementType; color: string; badge?: number }[] = [
    { role: 'patient', label: 'Patient / SOS', icon: User, color: 'text-red-400' },
    { role: 'driver', label: 'Driver App', icon: Truck, color: 'text-amber-400', badge: activeCases > 0 ? activeCases : undefined },
    { role: 'hospital_staff', label: 'Hospital Staff', icon: Building2, color: 'text-blue-400' },
    { role: 'admin', label: 'Admin Command', icon: ShieldCheck, color: 'text-purple-400' }
  ];

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[1500] max-w-xl w-[94%] bg-slate-900/95 backdrop-blur-xl border-2 border-slate-700/80 rounded-2xl p-1.5 shadow-2xl shadow-black/80 flex items-center justify-between gap-1.5">
      <div className="flex items-center gap-1 flex-1">
        {roles.map((item) => {
          const Icon = item.icon;
          const isActive = role === item.role;

          return (
            <button
              key={item.role}
              onClick={() => setDemoRole(item.role)}
              className={`relative flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl font-bold text-xs transition-all ${
                isActive
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 scale-[1.03]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : item.color}`} />
              <span className="hidden sm:inline">{item.label}</span>
              <span className="sm:hidden">{item.label.split(' ')[0]}</span>

              {item.badge !== undefined && !isActive && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-bounce">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="h-6 w-[1px] bg-slate-800 mx-0.5" />

      {/* Reset Demo button */}
      <button
        onClick={resetAllDataToDemo}
        title="Reset all demo data & positions"
        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
