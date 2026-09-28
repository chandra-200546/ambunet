import React, { useState } from 'react';
import { EmergencyType, SymptomChecklist } from '../../types';
import { HeartPulse, Car, Flame, Baby, Wind, AlertCircle, CheckSquare, Square, Brain, Stethoscope, Zap } from 'lucide-react';
import { evaluateTriage, AgeBand } from '../../ai/triage';

interface EmergencyTypePickerProps {
  selectedType: EmergencyType;
  onSelect: (type: EmergencyType, symptoms?: SymptomChecklist) => void;
}

interface TypeOption {
  type: EmergencyType;
  title: string;
  description: string;
  icon: React.ElementType;
  bedHint: string;
  colorClass: string;
}

const EMERGENCY_OPTIONS: TypeOption[] = [
  {
    type: 'cardiac',
    title: 'Cardiac Emergency',
    description: 'Chest pain, severe palpitations, cardiac arrest',
    icon: HeartPulse,
    bedHint: 'Reserves ICU Bed',
    colorClass: 'border-red-500 bg-red-500/10 text-red-400'
  },
  {
    type: 'accident',
    title: 'Road / Severe Trauma',
    description: 'Vehicle collision, heavy bleeding, fractures',
    icon: Car,
    bedHint: 'Reserves Trauma Unit',
    colorClass: 'border-orange-500 bg-orange-500/10 text-orange-400'
  },
  {
    type: 'stroke',
    title: 'Acute Stroke',
    description: 'Facial drooping, arm weakness, speech difficulty',
    icon: Brain,
    bedHint: 'Reserves Neuro ICU',
    colorClass: 'border-purple-500 bg-purple-500/10 text-purple-400'
  },
  {
    type: 'burn',
    title: 'Burn Injury',
    description: 'Fire, thermal, electrical or chemical burn',
    icon: Flame,
    bedHint: 'Reserves Burn Unit',
    colorClass: 'border-amber-500 bg-amber-500/10 text-amber-400'
  },
  {
    type: 'maternity',
    title: 'Maternity & Labor',
    description: 'Active labor contractions, obstetric urgency',
    icon: Baby,
    bedHint: 'Reserves Maternity Ward',
    colorClass: 'border-pink-500 bg-pink-500/10 text-pink-400'
  },
  {
    type: 'respiratory',
    title: 'Respiratory Distress',
    description: 'Severe asthma, choking, oxygen deprivation',
    icon: Wind,
    bedHint: 'Reserves Ventilator ICU',
    colorClass: 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
  },
];

export const EmergencyTypePicker: React.FC<EmergencyTypePickerProps> = ({
  selectedType,
  onSelect
}) => {
  const [symptoms, setSymptoms] = useState<SymptomChecklist>({});
  const [ageBand, setAgeBand] = useState<AgeBand>('adult');
  const [showChecklist, setShowChecklist] = useState<boolean>(false);

  const toggleSymptom = (key: keyof SymptomChecklist) => {
    setSymptoms(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const triageResult = evaluateTriage(selectedType, symptoms, ageBand);

  return (
    <div className="space-y-4">
      {/* Type Selection Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {EMERGENCY_OPTIONS.map((item) => {
          const Icon = item.icon;
          const isSelected = selectedType === item.type;

          return (
            <button
              key={item.type}
              type="button"
              onClick={() => onSelect(item.type, symptoms)}
              className={`flex flex-col text-left p-4 rounded-2xl border-2 transition-all duration-200 ${
                isSelected
                  ? `${item.colorClass} shadow-lg shadow-red-500/10 scale-[1.02] ring-2 ring-red-500/50`
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-white/10' : 'bg-slate-800'}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-950/80 border border-slate-700 text-slate-400">
                  {item.bedHint}
                </span>
              </div>

              <h4 className="font-bold text-base text-white mb-1">{item.title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
            </button>
          );
        })}
      </div>

      {/* Optional 10-Second Quick Triage Checklist Toggle */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
        <button
          type="button"
          onClick={() => setShowChecklist(prev => !prev)}
          className="w-full flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white"
        >
          <span className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-emerald-400" />
            Optional 10-Second Symptom Checklist (Triage AI Optimization)
          </span>
          <span className="text-[11px] text-emerald-400 underline">
            {showChecklist ? 'Hide Checklist' : 'Add Symptoms (Optional)'}
          </span>
        </button>

        {showChecklist && (
          <div className="mt-4 pt-3 border-t border-slate-800 space-y-4 animate-fadeIn">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-semibold">
              <button
                type="button"
                onClick={() => toggleSymptom('unconscious')}
                className={`p-2.5 rounded-xl border text-left flex items-center gap-2 ${symptoms.unconscious ? 'bg-red-500/20 border-red-500 text-red-300' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
              >
                {symptoms.unconscious ? <CheckSquare className="w-4 h-4 text-red-400" /> : <Square className="w-4 h-4" />}
                Unconscious
              </button>

              <button
                type="button"
                onClick={() => toggleSymptom('notBreathing')}
                className={`p-2.5 rounded-xl border text-left flex items-center gap-2 ${symptoms.notBreathing ? 'bg-red-500/20 border-red-500 text-red-300' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
              >
                {symptoms.notBreathing ? <CheckSquare className="w-4 h-4 text-red-400" /> : <Square className="w-4 h-4" />}
                Not Breathing
              </button>

              <button
                type="button"
                onClick={() => toggleSymptom('severeBleeding')}
                className={`p-2.5 rounded-xl border text-left flex items-center gap-2 ${symptoms.severeBleeding ? 'bg-red-500/20 border-red-500 text-red-300' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
              >
                {symptoms.severeBleeding ? <CheckSquare className="w-4 h-4 text-red-400" /> : <Square className="w-4 h-4" />}
                Severe Bleeding
              </button>

              <button
                type="button"
                onClick={() => toggleSymptom('chestPain')}
                className={`p-2.5 rounded-xl border text-left flex items-center gap-2 ${symptoms.chestPain ? 'bg-red-500/20 border-red-500 text-red-300' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
              >
                {symptoms.chestPain ? <CheckSquare className="w-4 h-4 text-red-400" /> : <Square className="w-4 h-4" />}
                Chest Pain
              </button>

              <button
                type="button"
                onClick={() => toggleSymptom('strokeSigns')}
                className={`p-2.5 rounded-xl border text-left flex items-center gap-2 ${symptoms.strokeSigns ? 'bg-purple-500/20 border-purple-500 text-purple-300' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
              >
                {symptoms.strokeSigns ? <CheckSquare className="w-4 h-4 text-purple-400" /> : <Square className="w-4 h-4" />}
                Stroke Signs
              </button>

              <button
                type="button"
                onClick={() => toggleSymptom('fracture')}
                className={`p-2.5 rounded-xl border text-left flex items-center gap-2 ${symptoms.fracture ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
              >
                {symptoms.fracture ? <CheckSquare className="w-4 h-4 text-amber-400" /> : <Square className="w-4 h-4" />}
                Fracture
              </button>

              <button
                type="button"
                onClick={() => toggleSymptom('burns')}
                className={`p-2.5 rounded-xl border text-left flex items-center gap-2 ${symptoms.burns ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
              >
                {symptoms.burns ? <CheckSquare className="w-4 h-4 text-amber-400" /> : <Square className="w-4 h-4" />}
                Burns
              </button>
            </div>

            {/* Age Band Selector */}
            <div className="flex items-center gap-3 text-xs">
              <span className="font-bold text-slate-400">Patient Age Band:</span>
              {(['pediatric', 'adult', 'elderly'] as AgeBand[]).map((band) => (
                <button
                  key={band}
                  type="button"
                  onClick={() => setAgeBand(band)}
                  className={`px-3 py-1 rounded-xl capitalize font-bold transition ${ageBand === band ? 'bg-red-600 text-white' : 'bg-slate-950 text-slate-400 border border-slate-800'}`}
                >
                  {band}
                </button>
              ))}
            </div>

            {/* Live Triage Assessment Preview */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-400">Calculated Priority: </span>
                <span className={`font-black uppercase px-2 py-0.5 rounded-md ${
                  triageResult.severity === 'P1' ? 'bg-red-600 text-white' : triageResult.severity === 'P2' ? 'bg-orange-500 text-white' : 'bg-yellow-500 text-slate-950'
                }`}>
                  {triageResult.severity} Level
                </span>
              </div>
              <span className="text-slate-400">Required Bed: <strong className="text-slate-200">{triageResult.requiredBedType}</strong></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
