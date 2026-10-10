import React, { useEffect, useMemo, useState } from 'react';
import {
  Ambulance,
  BarChart3,
  Download,
  Gauge,
  GitCompare,
  Hospital,
  Pause,
  Play,
  RefreshCcw,
  Route,
  ShieldCheck,
  Siren,
  SkipForward,
  TrafficCone,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AmbuNetMap } from '../map/AmbuNetMap';
import {
  DEFAULT_REVIEW_DEMO_CONFIG,
  DemoRunResult,
  DemoScenarioConfig,
  REVIEW_DEMO_NODES,
  RoutingMethod,
  TrafficIntensity,
  WeatherMode,
  exportDemoResultCsv,
  runReviewDemoScenario,
} from '../../simulation/reviewDemoEngine';
import { Ambulance as AmbulanceType, Emergency } from '../../types';

const demoSteps = [
  'Load a seeded Koramangala emergency scenario',
  'Display incident, ambulances, and destination hospital',
  'Run nearest available ambulance selection',
  'Generate conventional shortest route',
  'Predict traffic and generate optimized corridor',
  'Run deterministic digital twin movement',
  'Simulate traffic signal priority requests',
  'Match destination hospital',
  'Display ambulance movement and ETA',
  'Compare response metrics',
  'Explain algorithmic decision factors',
  'Export experiment report',
];

function formatSeconds(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

function downloadCsv(result: DemoRunResult) {
  const blob = new Blob([exportDemoResultCsv(result)], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `ambunet-review-demo-${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

export const ReviewDemoPage: React.FC<{ onBackToApp?: () => void }> = ({ onBackToApp }) => {
  const [config, setConfig] = useState<DemoScenarioConfig>(DEFAULT_REVIEW_DEMO_CONFIG);
  const [result, setResult] = useState<DemoRunResult>(() => runReviewDemoScenario(DEFAULT_REVIEW_DEMO_CONFIG));
  const [stepIndex, setStepIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeRoute, setActiveRoute] = useState<'baseline' | 'optimized'>('optimized');

  const activeCoordinates = activeRoute === 'baseline' ? result.baseline.coordinates : result.optimized.coordinates;
  const activeRouteResult = activeRoute === 'baseline' ? result.baseline : result.optimized;

  const movingAmbulance: AmbulanceType = useMemo(() => {
    const routeIndex = Math.min(activeCoordinates.length - 1, Math.floor(progress * (activeCoordinates.length - 1)));
    const position = activeCoordinates[routeIndex] || activeCoordinates[0];
    return {
      ...result.selectedAmbulance,
      current_lat: position?.[0] || result.selectedAmbulance.current_lat,
      current_lng: position?.[1] || result.selectedAmbulance.current_lng,
      status: progress >= 1 ? 'at_hospital' : 'en_route_to_patient',
    };
  }, [activeCoordinates, progress, result.selectedAmbulance]);

  const demoEmergency: Emergency = {
    id: 'review-demo-e1',
    patient_name: 'Review Demo Patient',
    patient_phone: '+91 108',
    emergency_type: 'cardiac',
    severity: 'P1',
    pickup_lat: result.incident.lat,
    pickup_lng: result.incident.lng,
    pickup_address: result.incident.name,
    status: 'assigned',
    assigned_ambulance_id: result.selectedAmbulance.id,
    assigned_hospital_id: result.hospital.id,
    eta_seconds: activeRouteResult.travelTimeSec,
    distance_km: activeRouteResult.distanceKm,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  };

  const comparisonChartData = [
    {
      metric: 'Response',
      Baseline: Math.round(result.baseline.travelTimeSec / 60),
      AmbuNet: Math.round(result.optimized.travelTimeSec / 60),
    },
    {
      metric: 'Signal Wait',
      Baseline: Math.round(result.baseline.signalWaitSec / 60),
      AmbuNet: Math.round(result.optimized.signalWaitSec / 60),
    },
    {
      metric: 'Congestion',
      Baseline: Math.round(result.baseline.congestionDelaySec / 60),
      AmbuNet: Math.round(result.optimized.congestionDelaySec / 60),
    },
  ];

  useEffect(() => {
    if (!isRunning) return;
    const timer = window.setInterval(() => {
      setProgress(prev => {
        if (prev >= 1) {
          setIsRunning(false);
          setStepIndex(demoSteps.length - 1);
          return 1;
        }
        return Math.min(1, prev + 0.06);
      });
      setStepIndex(prev => Math.min(demoSteps.length - 1, prev + 1));
    }, 700);
    return () => window.clearInterval(timer);
  }, [isRunning]);

  const rerunScenario = (nextConfig = config) => {
    const nextResult = runReviewDemoScenario(nextConfig);
    setResult(nextResult);
    setConfig(nextConfig);
    setProgress(0);
    setStepIndex(0);
    setIsRunning(false);
    setActiveRoute('optimized');
  };

  const updateConfig = <K extends keyof DemoScenarioConfig>(key: K, value: DemoScenarioConfig[K]) => {
    rerunScenario({ ...config, [key]: value });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-red-500 selection:text-white">
      <header className="sticky top-0 z-[1100] bg-slate-950/90 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/25">
              <Siren className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white leading-tight">AmbuNet Review 2 Demo</h1>
              <p className="text-xs text-slate-400">
                Digital twin + AI green corridor simulation using reproducible synthetic Bengaluru data
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => rerunScenario(DEFAULT_REVIEW_DEMO_CONFIG)}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 flex items-center gap-1.5"
            >
              <RefreshCcw className="w-4 h-4" /> Reset Demo
            </button>
            <button
              onClick={() => setIsRunning(true)}
              className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white flex items-center gap-1.5 shadow-lg shadow-red-600/20"
            >
              <Play className="w-4 h-4" /> Run Full Demo
            </button>
            <button
              onClick={() => {
                setIsRunning(false);
                setStepIndex(prev => Math.min(demoSteps.length - 1, prev + 1));
                setProgress(prev => Math.min(1, prev + 0.09));
              }}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 flex items-center gap-1.5"
            >
              <SkipForward className="w-4 h-4" /> Step-by-Step
            </button>
            <button
              onClick={() => setIsRunning(false)}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 flex items-center gap-1.5"
            >
              <Pause className="w-4 h-4" /> Pause
            </button>
            {onBackToApp && (
              <button
                onClick={onBackToApp}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200"
              >
                Back to App
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <section className="grid grid-cols-1 lg:grid-cols-[1.35fr_0.65fr] gap-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-2xl space-y-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <TrafficCone className="w-5 h-5 text-amber-400" />
                  Bangalore Digital Twin Simulation Lab
                </h2>
                <p className="text-xs text-slate-400">
                  Traffic Signal Priority - Simulation Only. Results are generated from local graph algorithms and synthetic traffic assumptions.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveRoute('baseline')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${activeRoute === 'baseline' ? 'bg-rose-600 text-white border-rose-500' : 'bg-slate-950 text-slate-400 border-slate-800'}`}
                >
                  Baseline Route
                </button>
                <button
                  onClick={() => setActiveRoute('optimized')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${activeRoute === 'optimized' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-950 text-slate-400 border-slate-800'}`}
                >
                  AmbuNet Corridor
                </button>
              </div>
            </div>

            <AmbuNetMap
              center={[12.936, 77.625]}
              zoom={13}
              ambulances={[movingAmbulance]}
              hospitals={[result.hospital]}
              emergencies={[demoEmergency]}
              activeEmergency={demoEmergency}
              routeCoordinates={activeCoordinates}
              className="h-[520px] w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-800"
            />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <select
                value={config.trafficIntensity}
                onChange={event => updateConfig('trafficIntensity', event.target.value as TrafficIntensity)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-200"
              >
                <option value="low">Low traffic</option>
                <option value="medium">Medium traffic</option>
                <option value="high">High traffic</option>
              </select>
              <select
                value={config.weather}
                onChange={event => updateConfig('weather', event.target.value as WeatherMode)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-200"
              >
                <option value="clear">Clear weather</option>
                <option value="rain">Rain</option>
              </select>
              <select
                value={config.routingMethod}
                onChange={event => updateConfig('routingMethod', event.target.value as RoutingMethod)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-200"
              >
                <option value="dijkstra">Dijkstra</option>
                <option value="astar">A*</option>
                <option value="traffic-aware">Traffic-aware</option>
              </select>
              <label className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.signalPriorityEnabled}
                  onChange={event => updateConfig('signalPriorityEnabled', event.target.checked)}
                  className="accent-red-600"
                />
                Signal priority
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-emerald-400" /> Measured Result
                </h3>
                <span className="text-[10px] font-bold text-slate-500">Seed {config.seed}</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="bg-slate-950 rounded-2xl border border-slate-800 p-3">
                  <p className="text-[10px] uppercase font-bold text-slate-500">Baseline</p>
                  <p className="text-xl font-black text-rose-400 font-mono">{formatSeconds(result.baseline.travelTimeSec)}</p>
                </div>
                <div className="bg-emerald-500/10 rounded-2xl border border-emerald-500/30 p-3">
                  <p className="text-[10px] uppercase font-bold text-emerald-400">AmbuNet</p>
                  <p className="text-xl font-black text-emerald-300 font-mono">{formatSeconds(result.optimized.travelTimeSec)}</p>
                </div>
              </div>
              <div className="mt-4 bg-slate-950 rounded-2xl border border-slate-800 p-4 text-center">
                <p className="text-xs text-slate-400 font-bold uppercase">Response Time Improvement</p>
                <p className="text-4xl font-black text-emerald-400 font-mono">{result.responseImprovementPct}%</p>
                <p className="text-[11px] text-slate-500">Computed from the same scenario, not hardcoded.</p>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl">
              <h3 className="text-sm font-black text-white mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-400" /> Demo Progress
              </h3>
              <div className="space-y-2">
                {demoSteps.map((step, index) => (
                  <div
                    key={step}
                    className={`flex items-center gap-2 text-xs rounded-xl px-3 py-2 border ${
                      index <= stepIndex
                        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-200'
                        : 'bg-slate-950 border-slate-800 text-slate-500'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-[10px] font-black">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl lg:col-span-2">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-purple-400" /> Emergency Response Performance Comparison
              </h3>
              <button
                onClick={() => downloadCsv(result)}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-100 flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" /> Export Results
              </button>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="metric" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} unit="m" />
                  <Tooltip contentStyle={{ background: '#020617', border: '1px solid #334155', borderRadius: 12 }} />
                  <Legend />
                  <Bar dataKey="Baseline" fill="#fb7185" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="AmbuNet" fill="#34d399" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl">
            <h3 className="text-sm font-black text-white flex items-center gap-2 mb-3">
              <Hospital className="w-4 h-4 text-blue-400" /> Hospital Matching
            </h3>
            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-3">
                <p className="font-black text-blue-300">{result.hospital.name}</p>
                <p className="text-slate-500 mt-1">{result.hospital.address}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-950 rounded-xl border border-slate-800 p-3">
                  <p className="text-slate-500 uppercase font-bold text-[10px]">Beds</p>
                  <p className="font-black text-emerald-400">{result.hospital.availableBedsCount ?? 0} available</p>
                </div>
                <div className="bg-slate-950 rounded-xl border border-slate-800 p-3">
                  <p className="text-slate-500 uppercase font-bold text-[10px]">Capability</p>
                  <p className="font-black text-sky-300">Emergency</p>
                </div>
              </div>
              <p className="text-slate-400">
                Hospital assignment is simulated from seeded facility data and must be confirmed by a dispatcher.
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl">
            <h3 className="text-sm font-black text-white flex items-center gap-2 mb-4">
              <Route className="w-4 h-4 text-amber-400" /> Candidate Route Comparison
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-slate-500 uppercase text-[10px]">
                  <tr>
                    <th className="text-left py-2">Method</th>
                    <th className="text-right py-2">ETA</th>
                    <th className="text-right py-2">Distance</th>
                    <th className="text-right py-2">Signal Wait</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {result.candidateRoutes.map(route => (
                    <tr key={route.method}>
                      <td className="py-3 font-bold text-slate-200">{route.label}</td>
                      <td className="py-3 text-right font-mono text-slate-300">{formatSeconds(route.travelTimeSec)}</td>
                      <td className="py-3 text-right font-mono text-slate-300">{route.distanceKm} km</td>
                      <td className="py-3 text-right font-mono text-slate-300">{route.signalWaitSec}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl">
            <h3 className="text-sm font-black text-white flex items-center gap-2 mb-4">
              <Ambulance className="w-4 h-4 text-red-400" /> AI Decision Explanation
            </h3>
            <div className="space-y-3">
              {result.explanation.map(line => (
                <div key={line} className="bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-slate-300">
                  {line}
                </div>
              ))}
            </div>
            <div className="mt-4 bg-slate-950 rounded-2xl border border-slate-800 p-3">
              <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">Signal Priority Events</p>
              <div className="space-y-2">
                {result.optimized.priorityEvents.slice(0, 4).map(event => (
                  <div key={`${event.intersection}-${event.etaSec}`} className="text-xs text-slate-300 flex justify-between gap-3">
                    <span>{event.intersection}</span>
                    <span className="font-mono text-emerald-400">{event.normalDelaySec}s {'->'} {event.priorityDelaySec}s</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl">
          <h3 className="text-sm font-black text-white flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-sky-400" /> Ambulance Selection Audit
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {result.ambulanceComparisons.map(item => (
              <div
                key={item.vehicleNumber}
                className={`rounded-2xl border p-4 ${item.vehicleNumber === result.selectedAmbulance.vehicle_number ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-950 border-slate-800'}`}
              >
                <p className="font-black text-white">{item.vehicleNumber}</p>
                <p className="text-xs text-slate-500 mt-1">Status: {item.status}</p>
                <div className="mt-3 flex justify-between text-xs">
                  <span className="text-slate-400">Baseline</span>
                  <span className="font-mono text-rose-300">{formatSeconds(item.baselineEtaSec)}</span>
                </div>
                <div className="mt-1 flex justify-between text-xs">
                  <span className="text-slate-400">Optimized</span>
                  <span className="font-mono text-emerald-300">{formatSeconds(item.optimizedEtaSec)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};
