import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, HeartPulse, ShieldAlert, Phone, UserCheck, Save } from 'lucide-react';
import { MedicalProfile } from '../../types';

interface MedicalProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MedicalProfileModal: React.FC<MedicalProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateMedicalProfile } = useAuth();
  const current = user?.medical_profile || {};

  const [formData, setFormData] = useState<MedicalProfile>({
    blood_group: current.blood_group || 'O+',
    allergies: current.allergies || 'None',
    conditions: current.conditions || 'None',
    emergency_contact: current.emergency_contact || '+1 (555) 019-2834',
    age: current.age || 32,
    notes: current.notes || ''
  });

  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateMedicalProfile(formData);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-red-500/20 text-red-400 rounded-2xl border border-red-500/30">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Emergency Medical Profile</h3>
            <p className="text-xs text-slate-400">Shared automatically with responding paramedics & triage hospital</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Blood Group</label>
              <select
                value={formData.blood_group}
                onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-bold focus:border-red-500 outline-none"
              >
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Age</label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:border-red-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Allergies (e.g. Penicillin, Latex)
            </label>
            <input
              type="text"
              value={formData.allergies}
              onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
              placeholder="e.g. Penicillin, Peanuts, Aspirin"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:border-red-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Known Pre-existing Conditions
            </label>
            <input
              type="text"
              value={formData.conditions}
              onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
              placeholder="e.g. Diabetes Type 1, Hypertension, Asthma"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:border-red-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-sky-400" /> Emergency Family Contact
            </label>
            <input
              type="text"
              value={formData.emergency_contact}
              onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
              placeholder="Name & phone number"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:border-red-500 outline-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition"
            >
              {isSaved ? (
                <>
                  <UserCheck className="w-4 h-4 text-emerald-300" /> Saved!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Medical Profile
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
