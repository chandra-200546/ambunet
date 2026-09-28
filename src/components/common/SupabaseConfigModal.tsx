import React, { useState } from 'react';
import {
  getSupabaseCredentials,
  saveSupabaseCredentials,
  clearSupabaseCredentials,
  isSupabaseConfigured
} from '../../lib/supabase';
import { X, Database, CheckCircle2, AlertTriangle, Key, Globe, Trash2 } from 'lucide-react';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({ isOpen, onClose }) => {
  const currentCreds = getSupabaseCredentials();
  const isConfigured = isSupabaseConfigured();

  const [url, setUrl] = useState(currentCreds.url);
  const [anonKey, setAnonKey] = useState(currentCreds.anonKey);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseCredentials(url, anonKey);
    onClose();
  };

  const handleClear = () => {
    clearSupabaseCredentials();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Supabase Cloud Connection</h3>
            <p className="text-xs text-slate-400">PostgreSQL + Realtime Channel Synchronization</p>
          </div>
        </div>

        {/* Current status banner */}
        <div className={`p-4 rounded-2xl border text-xs mb-5 flex items-start gap-3 ${
          isConfigured
            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
            : 'bg-sky-500/10 border-sky-500/30 text-sky-300'
        }`}>
          {isConfigured ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-sky-400" />
          )}
          <div>
            <p className="font-bold text-sm">
              {isConfigured ? 'Supabase Live Connected' : 'Running in High-Fidelity Simulator Mode'}
            </p>
            <p className="text-[11px] text-slate-300 mt-0.5">
              {isConfigured
                ? 'All emergencies, bed updates, and ambulance GPS pushes are synced in real time to your Supabase tables.'
                : 'The app works completely out of the box using our in-memory broadcast engine. To connect your own Supabase project, provide credentials below.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-400 mb-1 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" /> Project URL
            </label>
            <input
              type="text"
              placeholder="https://xyzcompany.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-400 mb-1 flex items-center gap-1">
              <Key className="w-3.5 h-3.5" /> Anon Public API Key
            </label>
            <textarea
              rows={2}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono outline-none focus:border-emerald-500 text-[11px]"
            />
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            {isConfigured && (
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center gap-1.5 px-3 py-2 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-xl border border-red-500/30 transition"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear Keys
              </button>
            )}

            <div className="flex gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition"
              >
                Close
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20 transition"
              >
                Save & Connect
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
