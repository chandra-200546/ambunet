import React, { useState } from 'react';
import { Bed, BedType, BedStatus, Hospital } from '../../types';
import { useEmergency } from '../../context/EmergencyContext';
import { BedDouble, Plus, CheckCircle, AlertCircle, Clock, ShieldCheck } from 'lucide-react';

interface BedManagementGridProps {
  hospital: Hospital;
}

export const BedManagementGrid: React.FC<BedManagementGridProps> = ({ hospital }) => {
  const { beds, toggleBedStatus } = useEmergency();
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<BedType | 'ALL'>('ALL');

  const hospitalBeds = beds.filter(b => b.hospital_id === hospital.id);

  const filteredBeds = selectedTypeFilter === 'ALL'
    ? hospitalBeds
    : hospitalBeds.filter(b => b.bed_type === selectedTypeFilter);

  const availableCount = hospitalBeds.filter(b => b.status === 'available').length;
  const occupiedCount = hospitalBeds.filter(b => b.status === 'occupied').length;
  const reservedCount = hospitalBeds.filter(b => b.status === 'reserved').length;
  const totalCount = hospitalBeds.length || 1;
  const occupancyRate = Math.round(((occupiedCount + reservedCount) / totalCount) * 100);

  const getBedTypeBadgeColor = (type: BedType) => {
    switch (type) {
      case 'ICU': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'Trauma': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'Maternity': return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
      case 'General': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  const getStatusColor = (status: BedStatus) => {
    switch (status) {
      case 'available':
        return 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20';
      case 'occupied':
        return 'bg-red-500/10 border-red-500/40 text-red-300 hover:bg-red-500/20';
      case 'reserved':
        return 'bg-amber-500/15 border-amber-500/50 text-amber-300 hover:bg-amber-500/25 animate-pulse';
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
      {/* Header & Stats Overview */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-2xl border border-blue-500/30">
              <BedDouble className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">{hospital.name}</h3>
              <p className="text-xs text-slate-400">{hospital.address} • Triage Desk</p>
            </div>
          </div>
        </div>

        {/* Live Counters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-950 px-3.5 py-2 rounded-2xl border border-emerald-500/30 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Available</span>
            <p className="text-lg font-black text-emerald-400">{availableCount}</p>
          </div>
          <div className="bg-slate-950 px-3.5 py-2 rounded-2xl border border-amber-500/30 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Reserved (En Route)</span>
            <p className="text-lg font-black text-amber-400">{reservedCount}</p>
          </div>
          <div className="bg-slate-950 px-3.5 py-2 rounded-2xl border border-red-500/30 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Occupied</span>
            <p className="text-lg font-black text-red-400">{occupiedCount}</p>
          </div>
          <div className="bg-slate-950 px-3.5 py-2 rounded-2xl border border-slate-800 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Occupancy</span>
            <p className="text-lg font-black text-sky-400">{occupancyRate}%</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        {(['ALL', 'ICU', 'Trauma', 'Maternity', 'General'] as const).map(type => (
          <button
            key={type}
            onClick={() => setSelectedTypeFilter(type)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              selectedTypeFilter === type
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {type === 'ALL' ? 'All Beds' : `${type} Beds`}
          </button>
        ))}
      </div>

      {/* Bed Matrix Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {filteredBeds.map(bed => (
          <div
            key={bed.id}
            className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col justify-between ${getStatusColor(bed.status)}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono font-black text-sm text-white">{bed.bed_number}</span>
              <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${getBedTypeBadgeColor(bed.bed_type)}`}>
                {bed.bed_type}
              </span>
            </div>

            <div className="space-y-2 mt-2">
              <div className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                {bed.status === 'available' && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                {bed.status === 'occupied' && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
                {bed.status === 'reserved' && <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />}
                <span>{bed.status}</span>
              </div>

              {/* Status Toggle buttons */}
              <div className="grid grid-cols-2 gap-1 pt-1 text-[10px]">
                {bed.status === 'available' ? (
                  <button
                    onClick={() => toggleBedStatus(bed.id, 'occupied')}
                    className="w-full bg-slate-900/90 hover:bg-slate-800 text-red-400 font-bold py-1 px-1 rounded-lg border border-red-500/30 transition text-center col-span-2"
                  >
                    Mark Occupied
                  </button>
                ) : (
                  <button
                    onClick={() => toggleBedStatus(bed.id, 'available')}
                    className="w-full bg-slate-900/90 hover:bg-slate-800 text-emerald-400 font-bold py-1 px-1 rounded-lg border border-emerald-500/30 transition text-center col-span-2"
                  >
                    Make Available
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
