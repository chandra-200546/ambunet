import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useEmergency } from './context/EmergencyContext';
import { Navbar } from './components/layout/Navbar';
import { RoleSwitcherBar } from './components/common/RoleSwitcherBar';
import { LoginModal } from './components/auth/LoginModal';
import { RoleSelectModal } from './components/auth/RoleSelectModal';
import { SupabaseConfigModal } from './components/common/SupabaseConfigModal';

// Patient Components
import { SOSButton } from './components/patient/SOSButton';
import { PatientActiveTracker } from './components/patient/PatientActiveTracker';

// Driver Components
import { DriverStatusToggle } from './components/driver/DriverStatusToggle';
import { DriverTripNavigation } from './components/driver/DriverTripNavigation';
import { IncomingEmergencyAlert } from './components/driver/IncomingEmergencyAlert';

// Hospital Staff Components
import { BedManagementGrid } from './components/hospital/BedManagementGrid';
import { InboundPatientQueue } from './components/hospital/InboundPatientQueue';

// Admin Components
import { DispatchControlPanel } from './components/admin/DispatchControlPanel';
import { FleetHospitalTable } from './components/admin/FleetHospitalTable';
import { AnalyticsDashboard } from './components/admin/AnalyticsDashboard';
import { AmbuNetMap } from './components/map/AmbuNetMap';

// Public Tracking Component
import { PublicTrackEmergency } from './components/public/PublicTrackEmergency';
import { Emergency, Hospital } from './types';
import {
  MapPin,
  Building2,
  Truck,
  Activity,
  BarChart3,
  ShieldCheck,
  Radio,
  Clock,
  Sparkles
} from 'lucide-react';

export const App: React.FC = () => {
  const { role, user } = useAuth();
  const {
    ambulances,
    hospitals,
    emergencies,
    activeEmergency,
    assignedDriverEmergency
  } = useEmergency();

  // Modals state
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  // Admin focused emergency
  const [adminFocusedEmergency, setAdminFocusedEmergency] = useState<Emergency | null>(null);

  // Hospital staff selected hospital
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>(
    user?.hospital_id || 'h1'
  );

  // Simple Hash Routing for Public Tracking (`/#/track/:id`)
  const [publicEmergencyId, setPublicEmergencyId] = useState<string | null>(null);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/track/')) {
        const id = hash.replace('#/track/', '');
        setPublicEmergencyId(id);
      } else {
        setPublicEmergencyId(null);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // If public tracking route is active
  if (publicEmergencyId) {
    return (
      <PublicTrackEmergency
        emergencyId={publicEmergencyId}
        onBackToApp={() => {
          window.location.hash = '';
          setPublicEmergencyId(null);
        }}
      />
    );
  }

  // Find logged in driver's ambulance
  const currentDriverAmbulance = ambulances.find(
    a => a.driver_id === user?.id || a.driver_name?.includes(user?.name || '')
  ) || ambulances[0];

  // Active hospital for staff view
  const currentHospital = hospitals.find(h => h.id === selectedHospitalId) || hospitals[0];

  // Incoming dispatch check for driver
  const hasIncomingDispatch = role === 'driver' && assignedDriverEmergency?.status === 'assigned';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-red-500 selection:text-white pb-24">
      {/* Top Navigation */}
      <Navbar
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onOpenRoleSelect={() => setIsRoleModalOpen(true)}
        onOpenSupabaseConfig={() => setIsSupabaseModalOpen(true)}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* =========================================================================
            ROLE 1: PATIENT / EMERGENCY CALLER DASHBOARD
            ========================================================================= */}
        {role === 'patient' && (
          <div className="space-y-6 animate-fadeIn">
            {activeEmergency ? (
              <PatientActiveTracker emergency={activeEmergency} />
            ) : (
              <SOSButton />
            )}
          </div>
        )}

        {/* =========================================================================
            ROLE 2: AMBULANCE DRIVER DASHBOARD
            ========================================================================= */}
        {role === 'driver' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Driver Duty Toggle */}
            <DriverStatusToggle ambulance={currentDriverAmbulance} />

            {/* Incoming Emergency Alert Modal */}
            {hasIncomingDispatch && assignedDriverEmergency && (
              <IncomingEmergencyAlert emergency={assignedDriverEmergency} />
            )}

            {/* Active Mission or Idle Status */}
            {assignedDriverEmergency && assignedDriverEmergency.status !== 'requested' ? (
              <DriverTripNavigation
                emergency={assignedDriverEmergency}
                ambulance={currentDriverAmbulance}
              />
            ) : (
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-xl text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                  <Truck className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Unit {currentDriverAmbulance.vehicle_number} is Online & Ready</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    You will receive instant audio siren alerts and priority navigation cards when a new emergency dispatch is routed to your unit.
                  </p>
                </div>

                <div className="max-w-2xl mx-auto pt-2">
                  <AmbuNetMap
                    ambulances={[currentDriverAmbulance]}
                    hospitals={hospitals}
                    className="h-64 w-full rounded-2xl overflow-hidden shadow-inner border border-slate-800"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            ROLE 3: HOSPITAL STAFF DASHBOARD
            ========================================================================= */}
        {role === 'hospital_staff' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Hospital Selector Bar */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                <span className="text-xs font-bold text-slate-300 uppercase">Active Medical Facility:</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {hospitals.map(h => (
                  <button
                    key={h.id}
                    onClick={() => setSelectedHospitalId(h.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      currentHospital.id === h.id
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {h.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Inbound Emergencies Queue */}
            <InboundPatientQueue hospital={currentHospital} />

            {/* Bed Management Matrix */}
            <BedManagementGrid hospital={currentHospital} />
          </div>
        )}

        {/* =========================================================================
            ROLE 4: ADMIN / CONTROL ROOM DISPATCHER DASHBOARD
            ========================================================================= */}
        {role === 'admin' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Global City Tactical Live Map */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <Radio className="w-5 h-5 text-red-500 animate-pulse" />
                    Citywide Live Tactical Command Map
                  </h3>
                  <p className="text-xs text-slate-400">
                    Real-time monitoring of all active rescue incidents, ambulance fleet coordinates, and hospital bed hubs
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    Live OSRM Sync Active
                  </span>
                </div>
              </div>

              <AmbuNetMap
                ambulances={ambulances}
                hospitals={hospitals}
                emergencies={emergencies}
                activeEmergency={adminFocusedEmergency}
                className="h-[480px] sm:h-[540px] w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-800"
              />
            </div>

            {/* Live Dispatch Control Panel */}
            <DispatchControlPanel
              onFocusEmergency={(em) => setAdminFocusedEmergency(em)}
            />

            {/* City Fleet & Infrastructure Table */}
            <FleetHospitalTable />

            {/* Response Time & Incident Analytics */}
            <AnalyticsDashboard />
          </div>
        )}
      </main>

      {/* Floating Role Switcher */}
      <RoleSwitcherBar />

      {/* Modals */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSelectRolePrompt={() => setIsRoleModalOpen(true)}
      />

      <RoleSelectModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
      />

      <SupabaseConfigModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />
    </div>
  );
};

export default App;
