import React, { useState } from 'react';
import { Ambulance, Hospital, Bed } from '../../types';
import { useEmergency } from '../../context/EmergencyContext';
import { Truck, Building2, BedDouble, Phone, CheckCircle2, AlertCircle } from 'lucide-react';

export const FleetHospitalTable: React.FC = () => {
  const { ambulances, hospitals, beds } = useEmergency();
  const [activeTab, setActiveTab] = useState<'ambulances' | 'hospitals' | 'beds'>('ambulances');

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white">City Fleet & Infrastructure Status</h3>
          <p className="text-xs text-slate-400">Live operational view of rescue vehicles, hospital hubs, and ICU bed capacities</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('ambulances')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition ${
              activeTab === 'ambulances' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Truck className="w-3.5 h-3.5" /> Fleet ({ambulances.length})
          </button>
          <button
            onClick={() => setActiveTab('hospitals')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition ${
              activeTab === 'hospitals' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" /> Hospitals ({hospitals.length})
          </button>
          <button
            onClick={() => setActiveTab('beds')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition ${
              activeTab === 'beds' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <BedDouble className="w-3.5 h-3.5" /> Beds ({beds.length})
          </button>
        </div>
      </div>

      {/* Ambulances View */}
      {activeTab === 'ambulances' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="p-3 rounded-l-xl">Vehicle</th>
                <th className="p-3">Driver Name</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Status</th>
                <th className="p-3 rounded-r-xl">Current Position</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {ambulances.map((amb) => (
                <tr key={amb.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-3 font-bold text-white flex items-center gap-2">
                    <span className="text-sm">🚑</span> {amb.vehicle_number}
                  </td>
                  <td className="p-3 text-slate-200 font-semibold">{amb.driver_name || 'Assigned Driver'}</td>
                  <td className="p-3 text-slate-400 font-mono">{amb.driver_phone || 'N/A'}</td>
                  <td className="p-3">
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                      amb.status === 'idle'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : amb.status === 'off_duty'
                        ? 'bg-slate-800 text-slate-400 border-slate-700'
                        : 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse'
                    }`}>
                      {amb.status}
                    </span>
                  </td>
                  <td className="p-3 text-slate-400 font-mono text-[11px]">
                    {amb.current_lat.toFixed(4)}°, {amb.current_lng.toFixed(4)}°
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Hospitals View */}
      {activeTab === 'hospitals' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="p-3 rounded-l-xl">Hospital Name</th>
                <th className="p-3">Address</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Available Beds</th>
                <th className="p-3 rounded-r-xl">Total Capacity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {hospitals.map((hosp) => (
                <tr key={hosp.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-3 font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-xs">H</span>
                    {hosp.name}
                  </td>
                  <td className="p-3 text-slate-400">{hosp.address}</td>
                  <td className="p-3 text-sky-400 font-mono">{hosp.contact_number}</td>
                  <td className="p-3 font-black text-emerald-400">
                    {hosp.availableBedsCount || 0} beds free
                  </td>
                  <td className="p-3 text-slate-300 font-semibold">{hosp.total_capacity} beds</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Beds View */}
      {activeTab === 'beds' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="p-3 rounded-l-xl">Bed #</th>
                <th className="p-3">Hospital</th>
                <th className="p-3">Type</th>
                <th className="p-3 rounded-r-xl">Current Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {beds.map((bed) => {
                const hosp = hospitals.find(h => h.id === bed.hospital_id);
                return (
                  <tr key={bed.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 font-mono font-bold text-white">{bed.bed_number}</td>
                    <td className="p-3 text-slate-300">{hosp?.name || bed.hospital_id}</td>
                    <td className="p-3">
                      <span className="font-bold text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded-md border border-sky-500/20">
                        {bed.bed_type}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                        bed.status === 'available'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : bed.status === 'occupied'
                          ? 'bg-red-500/20 text-red-400 border-red-500/30'
                          : 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse'
                      }`}>
                        {bed.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
