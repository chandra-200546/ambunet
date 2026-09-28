import React, { useState } from 'react';
import { Emergency, Ambulance, Hospital } from '../../types';
import { useEmergency } from '../../context/EmergencyContext';
import { formatETA, formatDistance } from '../../lib/haversine';
import { BANGALORE_ZONES } from '../../lib/mockData';
import {
  SlidersHorizontal,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Building2,
  Sparkles,
  Info,
  ChevronRight,
  Compass,
  Zap
} from 'lucide-react';

interface DispatchControlPanelProps {
  onFocusEmergency: (emergency: Emergency) => void;
}

export const DispatchControlPanel: React.FC<DispatchControlPanelProps> = ({ onFocusEmergency }) => {
  const {
    emergencies,
    ambulances,
    hospitals,
    dispatchDecisions,
    repositionRecommendations,
    manualOverrideDispatch,
    createEmergency,
    applyRepositionRecommendation,
    cancelEmergency
  } = useEmergency();

  const [selectedEmergency, setSelectedEmergency] = useState<Emergency | null>(null);
  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState<string>('');
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>('');
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState<boolean>(false);
  const [explainableEmergencyId, setExplainableEmergencyId] = useState<string | null>(null);

  const activeEmergencies = emergencies.filter(
    em => em.status !== 'completed' && em.status !== 'cancelled'
  );

  const openOverrideModal = (em: Emergency) => {
    setSelectedEmergency(em);
    setSelectedAmbulanceId(em.assigned_ambulance_id || '');
    setSelectedHospitalId(em.assigned_hospital_id || '');
    setIsOverrideModalOpen(true);
  };

  const handleApplyOverride = async () => {
    if (!selectedEmergency) return;
    await manualOverrideDispatch(
      selectedEmergency.id,
      selectedAmbulanceId || undefined,
      selectedHospitalId || undefined
    );
    setIsOverrideModalOpen(false);
  };

  const handleTriggerSampleEmergency = async () => {
    const randomZone = BANGALORE_ZONES[Math.floor(Math.random() * BANGALORE_ZONES.length)];
    const types: Array<'cardiac' | 'accident' | 'burn' | 'maternity' | 'respiratory'> = [
      'cardiac', 'accident', 'burn', 'maternity', 'respiratory'
    ];
    const randomType = types[Math.floor(Math.random() * types.length)];

    await createEmergency({
      emergencyType: randomType,
      pickupLat: randomZone.center_lat + (Math.random() - 0.5) * 0.02,
      pickupLng: randomZone.center_lng + (Math.random() - 0.5) * 0.02,
      pickupAddress: `${randomZone.name}, Bengaluru, Karnataka`,
      patientName: `Sample Case (${randomZone.name.split(' ')[0]})`,
      symptoms: { chestPain: true, unconscious: Math.random() > 0.5 }
    });
  };

  const explainDecision = dispatchDecisions.find(d => d.emergency_id === explainableEmergencyId);

  return (
    <div className="space-y-6">
      {/* AI Pre-Positioning Recommendations Banner */}
      {repositionRecommendations.length > 0 && (
        <div className="bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-slate-900 border border-purple-500/30 rounded-3xl p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-500/20 text-purple-300 rounded-2xl border border-purple-500/40">
                <Compass className="w-5 h-5 animate-spin-slow" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-white">AI Fleet Standby Pre-Positioning Suggestion</h4>
                  <span className="bg-purple-500/20 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-500/30">
                    Demand Forecast Match
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Unit <strong className="text-amber-400">{repositionRecommendations[0].vehicleNumber}</strong> is recommended to relocate to <strong className="text-purple-300">{repositionRecommendations[0].recommendedZoneId.replace(/_/g, ' ').toUpperCase()}</strong> zone ({repositionRecommendations[0].reason}).
                </p>
              </div>
            </div>

            <button
              onClick={() => applyRepositionRecommendation(repositionRecommendations[0])}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg transition whitespace-nowrap flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" /> One-Click Apply Standby Relocation
            </button>
          </div>
        </div>
      )}

      {/* Main Active Dispatch Control & Queue */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-red-500/20 text-red-400 rounded-2xl border border-red-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Active Dispatch Control & Tactical Queue</h3>
              <p className="text-xs text-slate-400">Real-time emergency requests with explainable AI scoring & supervisor manual override</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleTriggerSampleEmergency}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" /> Trigger Sample Emergency
            </button>
            <span className="text-xs font-black px-3 py-1 bg-red-500/20 text-red-400 rounded-full border border-red-500/30">
              {activeEmergencies.length} Active
            </span>
          </div>
        </div>

        {activeEmergencies.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800/80">
            <CheckCircle2 className="w-10 h-10 text-emerald-400/50 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-300">All Bangalore Emergency Incidents Cleared</h4>
            <p className="text-xs text-slate-500 mt-1">
              Click "Trigger Sample Emergency" to generate a live incident in a random Bangalore zone.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeEmergencies.map((em) => {
              const amb = ambulances.find(a => a.id === em.assigned_ambulance_id);
              const hosp = hospitals.find(h => h.id === em.assigned_hospital_id);

              return (
                <div
                  key={em.id}
                  className="bg-slate-950 p-4 rounded-2xl border border-slate-800 hover:border-slate-700 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        em.severity === 'P1' ? 'bg-red-600 text-white' : em.severity === 'P2' ? 'bg-orange-500 text-white' : 'bg-yellow-500 text-slate-950'
                      }`}>
                        {em.severity} • {em.emergency_type}
                      </span>
                      <h4 className="font-bold text-white text-sm">
                        {em.patient_name} • <span className="text-slate-400 font-normal">{em.patient_phone}</span>
                      </h4>
                      <span className="text-[10px] font-mono bg-slate-900 text-amber-400 px-2 py-0.5 rounded-md border border-amber-500/30 uppercase">
                        {em.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 truncate">
                      📍 {em.pickup_address}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
                      <span>
                        Ambulance: <strong className="text-red-400">{amb ? `🚑 ${amb.vehicle_number}` : 'Unassigned'}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Hospital: <strong className="text-sky-400">{hosp?.name?.split(' ')[0] || 'Unassigned'}</strong>
                      </span>
                      {em.predicted_eta_sec && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-400 font-mono font-semibold">
                            Predicted ETA: {formatETA(em.predicted_eta_sec)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    <button
                      onClick={() => setExplainableEmergencyId(em.id)}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/40 font-bold text-xs transition"
                    >
                      <Info className="w-3.5 h-3.5" /> Explain Score
                    </button>

                    <button
                      onClick={() => onFocusEmergency(em)}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs border border-slate-700 transition"
                    >
                      Locate
                    </button>

                    <button
                      onClick={() => openOverrideModal(em)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/40 font-bold text-xs transition"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" /> Override
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DISPATCH EXPLAINABILITY PANEL MODAL */}
      {explainableEmergencyId && explainDecision && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-purple-500/40 rounded-3xl p-6 shadow-2xl space-y-5 text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-black text-white">AI Dispatch Explainability & Score Breakdown</h3>
              </div>
              <button onClick={() => setExplainableEmergencyId(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">Dispatch Mode:</span>
                <span className="font-mono text-emerald-400 uppercase font-black">{explainDecision.mode} OPTIMIZATION</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">Selected Ambulance:</span>
                <span className="font-bold text-red-400">{ambulances.find(a => a.id === explainDecision.chosen_ambulance_id)?.vehicle_number}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">Selected Medical Center:</span>
                <span className="font-bold text-sky-400">{hospitals.find(h => h.id === explainDecision.chosen_hospital_id)?.name}</span>
              </div>
            </div>

            {/* Score Breakdown Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Evaluated Candidate Score Rankings</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {explainDecision.candidates.map((cand, idx) => (
                  <div key={idx} className={`p-3 rounded-xl border text-xs space-y-1 ${
                    cand.ambulanceId === explainDecision.chosen_ambulance_id ? 'bg-purple-900/30 border-purple-500/50' : 'bg-slate-950 border-slate-800'
                  }`}>
                    <div className="flex items-center justify-between font-bold">
                      <span>{idx + 1}. Unit {cand.vehicleNumber} $\rightarrow$ {cand.hospitalName.split(' ')[0]}</span>
                      <span className="font-mono text-purple-300">Total Score: {cand.totalScore}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-400 pt-1 font-mono">
                      <span>Patient ETA Component: {cand.breakdown.w1_patientEtaComponent}</span>
                      <span>Hospital ETA Component: {cand.breakdown.w2_hospitalEtaComponent}</span>
                      <span>Bed Risk Component: {cand.breakdown.w3_bedRiskComponent}</span>
                      <span>Specialty Penalty: {cand.breakdown.w4_specialtyPenaltyComponent}</span>
                      <span>Coverage Loss: {cand.breakdown.w5_coverageLossComponent}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => setExplainableEmergencyId(null)} className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition">
              Close Explainability Inspector
            </button>
          </div>
        </div>
      )}

      {/* Manual Override Dialog */}
      {isOverrideModalOpen && selectedEmergency && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-5 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-sky-400" />
                <h3 className="text-lg font-bold text-white">Manual Dispatch Override</h3>
              </div>
              <button onClick={() => setIsOverrideModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-slate-400">
              Manually reassign responding ambulance unit or target hospital for emergency case <strong className="text-white">#{selectedEmergency.id.slice(-6).toUpperCase()}</strong> ({selectedEmergency.patient_name}).
            </p>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1.5">Reassign Ambulance Unit</label>
                <select
                  value={selectedAmbulanceId}
                  onChange={(e) => setSelectedAmbulanceId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-semibold outline-none focus:border-sky-500"
                >
                  <option value="">-- Choose Ambulance --</option>
                  {ambulances.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.vehicle_number} — {a.driver_name || 'Driver'} ({a.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1.5">Reassign Destination Hospital</label>
                <select
                  value={selectedHospitalId}
                  onChange={(e) => setSelectedHospitalId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-semibold outline-none focus:border-sky-500"
                >
                  <option value="">-- Choose Hospital --</option>
                  {hospitals.map(h => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.availableBedsCount || 0} available beds)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button onClick={() => setIsOverrideModalOpen(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition">
                Cancel
              </button>
              <button onClick={handleApplyOverride} className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-lg transition">
                Apply Reassignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
