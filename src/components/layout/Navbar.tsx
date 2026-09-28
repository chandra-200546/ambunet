import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useEmergency } from '../../context/EmergencyContext';
import { soundManager } from '../../lib/audio';
import {
  Volume2,
  VolumeX,
  ShieldAlert,
  ChevronDown,
  KeyRound
} from 'lucide-react';

interface NavbarProps {
  onOpenLogin: () => void;
  onOpenRoleSelect: () => void;
  onOpenSupabaseConfig: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenLogin,
  onOpenRoleSelect
}) => {
  const { user, role, isAuthenticated, isSupabaseActive } = useAuth();
  const { emergencies } = useEmergency();
  const [isMuted, setIsMuted] = useState(soundManager.getIsMuted());

  const activeEmergenciesCount = emergencies.filter(
    e => e.status !== 'completed' && e.status !== 'cancelled'
  ).length;

  const handleToggleMute = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  const getRoleLabel = () => {
    switch (role) {
      case 'patient': return 'Caller / Patient';
      case 'driver': return 'Ambulance Driver';
      case 'hospital_staff': return 'Hospital Staff';
      case 'admin': return 'Dispatcher (Admin)';
    }
  };

  const getRoleBadgeStyle = () => {
    switch (role) {
      case 'patient': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'driver': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'hospital_staff': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'admin': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    }
  };

  return (
    <header className="sticky top-0 z-[1100] bg-slate-950/85 backdrop-blur-xl border-b border-slate-800 transition-all">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-2.5 flex items-center justify-between gap-4">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow-lg shadow-red-600/30 text-white font-black text-xl">
            🚑
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white tracking-tight leading-none">
                Ambu<span className="text-red-500">Net</span>
              </h1>
              <span className="hidden sm:inline text-[9px] font-mono font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700">
                v1.0
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Adaptive Emergency Response Ecosystem
            </p>
          </div>
        </div>

        {/* Center Live Alert Badge (if active cases exist) */}
        {activeEmergenciesCount > 0 && (
          <div className="hidden md:flex items-center gap-2 bg-red-950/70 border border-red-500/40 px-3.5 py-1.5 rounded-full text-xs font-bold text-red-300 animate-pulse">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span>{activeEmergenciesCount} Active Emergency Dispatch{activeEmergenciesCount > 1 ? 'es' : ''} in City</span>
          </div>
        )}

        {/* Right Action Icons & Role Switcher */}
        <div className="flex items-center gap-2.5">
          {/* Audio siren mute button */}
          <button
            onClick={handleToggleMute}
            title={isMuted ? 'Unmute siren sounds' : 'Mute siren sounds'}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-sky-400" />}
          </button>

          {/* Role selector pill */}
          <button
            onClick={onOpenRoleSelect}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${getRoleBadgeStyle()}`}
          >
            <span>{getRoleLabel()}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
          </button>

          {isSupabaseActive && (
            <button
              onClick={onOpenLogin}
              title="Open Supabase authentication"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/20 transition"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Auth</span>
            </button>
          )}

          {/* User / Login button */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 transition"
              >
                <div className="w-6 h-6 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center font-bold text-xs">
                  {user?.name ? user.name[0] : 'U'}
                </div>
                <span className="hidden lg:inline truncate max-w-[120px]">{user?.name}</span>
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/20 transition"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
