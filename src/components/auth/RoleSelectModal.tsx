import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { X, User, Truck, Building2, ShieldCheck } from 'lucide-react';

interface RoleSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RoleSelectModal: React.FC<RoleSelectModalProps> = ({ isOpen, onClose }) => {
  const { role, setDemoRole, updateUserRole } = useAuth();

  if (!isOpen) return null;

  const handleSelectRole = (newRole: UserRole) => {
    setDemoRole(newRole);
    updateUserRole(newRole);
    onClose();
  };

  const rolesList: {
    role: UserRole;
    title: string;
    description: string;
    icon: React.ElementType;
    badgeColor: string;
  }[] = [
    {
      role: 'patient',
      title: 'Emergency Caller / Patient',
      description: 'One-tap SOS dispatch, GPS tracking, medical profile sharing, live ETA',
      icon: User,
      badgeColor: 'bg-red-500/20 text-red-400 border-red-500/30'
    },
    {
      role: 'driver',
      title: 'Ambulance Driver',
      description: 'Instant dispatch alerts, live turn-by-turn navigation, patient triage handover',
      icon: Truck,
      badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    },
    {
      role: 'hospital_staff',
      title: 'Hospital Staff (ER & Triage)',
      description: 'Live ICU/Trauma bed matrix management, inbound patient queue, rapid admissions',
      icon: Building2,
      badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    },
    {
      role: 'admin',
      title: 'Central Control Dispatcher',
      description: 'Citywide live tactical map, fleet roster, auto-dispatch overrides, response time analytics',
      icon: ShieldCheck,
      badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    }
  ];

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <h3 className="text-2xl font-black text-white">Select Your Operational Role</h3>
          <p className="text-xs text-slate-400 mt-1">
            Choose a dashboard role to experience the real-time rescue lifecycle from that perspective
          </p>
        </div>

        <div className="space-y-3">
          {rolesList.map((item) => {
            const Icon = item.icon;
            const isSelected = role === item.role;

            return (
              <button
                key={item.role}
                onClick={() => handleSelectRole(item.role)}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-start gap-4 ${
                  isSelected
                    ? 'border-red-500 bg-red-500/10 shadow-lg shadow-red-500/10'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                }`}
              >
                <div className={`p-3 rounded-xl border ${item.badgeColor}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-base text-white">{item.title}</h4>
                    {isSelected && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-500 text-white">
                        Active Role
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
