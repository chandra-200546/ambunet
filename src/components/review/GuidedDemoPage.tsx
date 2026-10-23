import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Play, Pause, RotateCcw, FlaskConical, Siren, CheckCircle2, Download } from 'lucide-react';
import { AmbuNetMap } from '../map/AmbuNetMap';
import { ReviewDemoPage } from './ReviewDemoPage';
import { DEFAULT_REVIEW_DEMO_CONFIG, runReviewDemoScenario, exportDemoResultCsv } from '../../simulation/reviewDemoEngine';
import { positionAt } from '../../simulation/playback';
import { WALKTHROUGH_STAGES, walkthroughStage, walkthroughTimeline } from '../../simulation/walkthrough';
import { Emergency } from '../../types';

const roles = ['Caller / Patient', 'Dispatcher', 'Route planning', 'Ambulance driver', 'Hospital staff', 'Dispatcher'];
const time = (seconds: number) => `${Math.floor(Math.max(0, seconds) / 60)}m ${Math.floor(Math.max(0, seconds) % 60)}s`;

export function GuidedDemoPage({ onBackToApp }: { onBackToApp: () => void }) {
  const result = useMemo(() => runReviewDemoScenario(DEFAULT_REVIEW_DEMO_CONFIG), []);
  const boundaries = useMemo(() => walkthroughTimeline(result.optimized.travelTimeSec), [result]);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [lab, setLab] = useState(false);
  const stage = walkthroughStage(seconds, boundaries);
  const journeySeconds = Math.min(result.optimized.travelTimeSec, Math.max(0, (seconds - boundaries[3]) * 30));
  const playback = positionAt(result.optimized, journeySeconds);
  const pickedUp = journeySeconds >= result.optimizedResponseSec;

  useEffect(() => {
    if (!running || lab) return;
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const delta = (now - previous) / 1000;
      previous = now;
      setSeconds(value => Math.min(boundaries[5], value + delta));
    }, 100);
    return () => window.clearInterval(timer);
  }, [running, lab, boundaries]);

  useEffect(() => { if (stage === 5) setRunning(false); }, [stage]);

  const ambulance = {
    ...result.selectedAmbulance,
    current_lat: playback.position[0], current_lng: playback.position[1],
    status: stage >= 4 ? 'at_hospital' as const : pickedUp ? 'transporting' as const : 'en_route_to_patient' as const,
  };
  const emergency: Emergency = {
    id: 'guided-synthetic-incident', patient_name: 'Demo Patient', patient_phone: '', emergency_type: 'cardiac', severity: 'P1',
    pickup_lat: result.incident.lat, pickup_lng: result.incident.lng, pickup_address: result.incident.name,
    status: stage >= 4 ? 'completed' : pickedUp ? 'en_route_to_hospital' : stage >= 3 ? 'en_route_to_patient' : 'assigned',
    eta_seconds: Math.max(0, (pickedUp ? result.optimized.travelTimeSec : result.optimizedResponseSec) - journeySeconds),
    created_at: new Date(0).toISOString(), updated_at: new Date(0).toISOString(),
  };
  const move = (index: number) => { setRunning(false); setSeconds(boundaries[index]); };
  const exportReport = () => {
    const url = URL.createObjectURL(new Blob([exportDemoResultCsv(result)], { type: 'text/csv' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'ambunet-guided-demo.csv'; anchor.click(); URL.revokeObjectURL(url);
  };

  if (lab) return <ReviewDemoPage onBackToApp={() => setLab(false)} />;

  return <div className="min-h-screen bg-slate-950 text-slate-100">
    <header className="border-b border-slate-800 px-4 py-4">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3"><Siren className="text-red-500" size={28} /><div><h1 className="text-xl font-bold">AmbuNet Live Walkthrough</h1><p className="text-xs text-slate-400">Synthetic emergency scenario</p></div></div>
        <div className="flex gap-3"><button onClick={() => { setRunning(false); setLab(true); }} className="flex items-center gap-2 text-sm"><FlaskConical size={16} /> Simulation Lab</button><button onClick={onBackToApp} className="flex items-center gap-2 text-sm"><ArrowLeft size={16} /> Main App</button></div>
      </div>
    </header>
    <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <nav aria-label="Demo stages" className="grid grid-cols-2 md:grid-cols-6 gap-2 border-b border-slate-800 pb-4">
        {WALKTHROUGH_STAGES.map((label, index) => <button key={label} aria-current={stage === index ? 'step' : undefined} onClick={() => move(index)} className={`text-left p-2 text-xs border-b-2 ${stage === index ? 'border-red-500 text-white' : 'border-slate-800 text-slate-400'}`}><span className="block text-slate-500 mb-1">{index + 1} / 6</span>{label}</button>)}
      </nav>
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div aria-live="polite"><p className="text-xs text-emerald-400 uppercase">{roles[stage]}</p><h2 className="text-2xl font-bold" data-testid="walkthrough-stage">{WALKTHROUGH_STAGES[stage]}</h2></div>
        <div className="flex flex-wrap gap-2">
          <button title="Previous stage" aria-label="Previous stage" disabled={stage === 0} onClick={() => move(stage - 1)} className="p-3 border border-slate-700 rounded-lg disabled:opacity-30"><ArrowLeft size={18} /></button>
          <button onClick={() => { if (stage === 5) setSeconds(0); setRunning(value => !value); }} className="px-4 py-3 bg-red-600 rounded-lg flex gap-2 items-center font-semibold">{running ? <Pause size={18} /> : <Play size={18} />}{running ? 'Pause Demo' : stage === 5 ? 'Replay Demo' : seconds === 0 ? 'Run Full Demo' : 'Resume Demo'}</button>
          <button title="Next stage" aria-label="Next stage" disabled={stage === 5} onClick={() => move(stage + 1)} className="p-3 border border-slate-700 rounded-lg disabled:opacity-30"><ArrowRight size={18} /></button>
          <button title="Reset demo" aria-label="Reset demo" onClick={() => move(0)} className="p-3 border border-slate-700 rounded-lg"><RotateCcw size={18} /></button>
        </div>
      </div>
      <progress aria-label="Demo progress" max={boundaries[5]} value={seconds} className="w-full h-1 accent-red-500" />
      <section key={stage} className="animate-fadeIn min-h-[420px]">
        {stage === 0 && <div className="grid md:grid-cols-2 gap-8 items-start py-6">
          <div className="space-y-6"><div className="text-5xl font-black text-red-500">SOS</div><h3 className="text-xl font-semibold">Cardiac emergency reported</h3><dl className="space-y-3 text-sm"><div><dt className="text-slate-400">Patient</dt><dd>Demo Patient</dd></div><div><dt className="text-slate-400">Pickup location</dt><dd>{result.incident.name}</dd></div><div><dt className="text-slate-400">Priority</dt><dd className="text-red-400">P1 / Critical</dd></div></dl><p className="text-slate-400 text-sm">{running ? 'Request received. Opening the dispatcher view…' : 'Ready to demonstrate the emergency response workflow.'}</p></div>
          <AmbuNetMap emergencies={[emergency]} center={[result.incident.lat, result.incident.lng]} zoom={15} className="h-[360px] w-full border border-slate-700 rounded-lg overflow-hidden" />
        </div>}
        {stage === 1 && <div className="space-y-5"><p className="text-slate-300">Incident received. Available ambulances ranked by modeled response time.</p><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="text-slate-400"><tr><th className="p-3">Unit</th><th>Status</th><th>Baseline ETA</th><th>AmbuNet ETA</th><th>Assignment</th></tr></thead><tbody>{result.ambulanceComparisons.map(unit => <tr key={unit.vehicleNumber} className="border-t border-slate-800"><td className="p-3">{unit.vehicleNumber}</td><td>{unit.status}</td><td>{time(unit.baselineEtaSec)}</td><td>{time(unit.optimizedEtaSec)}</td><td className="text-emerald-400">{unit.vehicleNumber === ambulance.vehicle_number ? 'Selected' : 'Available'}</td></tr>)}</tbody></table></div><p className="text-emerald-300">{result.explanation[0]}</p></div>}
        {(stage === 2 || stage === 3) && <div className="space-y-4">
          <div className="flex flex-wrap gap-6 text-sm"><span>Unit: {ambulance.vehicle_number}</span><span className="text-emerald-400">{stage === 2 ? 'Corridor calculated' : pickedUp ? 'Patient onboard / To hospital' : 'En route to patient'}</span><span>ETA: {time(emergency.eta_seconds || 0)}</span>{stage === 3 && <span>Playback 30x / {playback.phase}</span>}</div>
          <AmbuNetMap ambulances={[ambulance]} hospitals={[result.hospital]} emergencies={[emergency]} routeCoordinates={result.optimized.coordinates} center={[result.incident.lat, result.incident.lng]} className="h-[390px] sm:h-[440px] w-full border border-slate-700 rounded-lg overflow-hidden" />
          <p className="text-xs text-amber-300">Traffic Signal Priority — Simulation Only</p>
          {stage === 2 && <div className="flex flex-wrap gap-6 text-sm"><span>Distance: {result.optimized.distanceKm} km</span><span>Modeled signal wait: {result.optimized.signalWaitSec}s</span><span>Destination: {result.hospital.name}</span></div>}
        </div>}
        {stage === 4 && <div className="grid md:grid-cols-2 gap-8 py-6"><div className="space-y-5"><CheckCircle2 size={48} className="text-emerald-400" /><h3 className="text-xl font-semibold">Ambulance arrived</h3><p>{result.hospital.name}</p><p className="text-slate-400">Demo patient handed over to the hospital team.</p><dl className="text-sm space-y-3"><div><dt className="text-slate-400">Ambulance</dt><dd>{ambulance.vehicle_number}</dd></div><div><dt className="text-slate-400">Seeded available beds</dt><dd>{result.hospital.availableBedsCount}</dd></div><div><dt className="text-slate-400">Mission duration</dt><dd>{time(result.optimized.travelTimeSec)}</dd></div></dl></div><AmbuNetMap ambulances={[ambulance]} hospitals={[result.hospital]} center={[result.hospital.lat, result.hospital.lng]} zoom={16} className="h-[360px] w-full border border-slate-700 rounded-lg overflow-hidden" /></div>}
        {stage === 5 && <div className="space-y-6 py-6"><CheckCircle2 size={40} className="text-emerald-400" /><h3 className="text-xl font-semibold">Emergency workflow complete</h3><div className="grid sm:grid-cols-3 gap-6 border-y border-slate-800 py-6"><div><p className="text-sm text-slate-400">Baseline response</p><p className="text-3xl font-bold">{time(result.baselineResponseSec)}</p></div><div><p className="text-sm text-slate-400">AmbuNet response</p><p className="text-3xl font-bold text-emerald-400">{time(result.optimizedResponseSec)}</p></div><div><p className="text-sm text-slate-400">Modeled difference</p><p className="text-3xl font-bold">{result.responseImprovementPct}%</p></div></div><p className="text-sm text-slate-400">Synthetic scenario results. No emergency request, bed reservation or SMS was sent.</p><button onClick={exportReport} className="flex gap-2 items-center px-4 py-3 bg-emerald-700 rounded-lg"><Download size={18} /> Export Report</button></div>}
      </section>
    </main>
  </div>;
}
