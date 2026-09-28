import React, { useState, useEffect } from 'react';
import { EmergencyType, LocationCoords } from '../../types';
import { useEmergency } from '../../context/EmergencyContext';
import { useAuth } from '../../context/AuthContext';
import { reverseGeocode, searchAddress } from '../../lib/nominatim';
import { EmergencyTypePicker } from './EmergencyTypePicker';
import { MedicalProfileModal } from './MedicalProfileModal';
import {
  MapPin,
  HeartPulse,
  Navigation,
  ShieldCheck,
  Search,
  Radio,
  Loader2,
  AlertTriangle
} from 'lucide-react';

export const SOSButton: React.FC = () => {
  const { user } = useAuth();
  const { createEmergency, isDispatching } = useEmergency();

  const [coords, setCoords] = useState<LocationCoords>({
    lat: 37.7749, // San Francisco default
    lng: -122.4194
  });

  const [address, setAddress] = useState<string>('Detecting exact GPS address...');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const [emergencyType, setEmergencyType] = useState<EmergencyType>('cardiac');
  const [showTypeSelector, setShowTypeSelector] = useState<boolean>(false);
  const [showMedicalModal, setShowMedicalModal] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Auto-fetch GPS on component mount
  useEffect(() => {
    fetchCurrentLocation();
  }, []);

  const fetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      setAddress('Market & 4th St, San Francisco, CA (Default Demo Location)');
      return;
    }

    setIsLocating(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const newCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        setCoords(newCoords);
        const resolvedAddress = await reverseGeocode(newCoords);
        setAddress(resolvedAddress);
        setIsLocating(false);
      },
      async (err) => {
        console.warn('GPS location request error:', err.message);
        setGpsError('GPS permission denied or timed out. Using default metro area location.');
        const fallback = { lat: 37.7680, lng: -122.4270 };
        setCoords(fallback);
        const resolvedAddress = await reverseGeocode(fallback);
        setAddress(resolvedAddress || 'Market & Castro St, San Francisco, CA');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
    );
  };

  const handleSearchAddress = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const results = await searchAddress(query);
    setSearchResults(results);
    setIsSearching(false);
  };

  const selectSearchResult = (item: any) => {
    setCoords({ lat: item.lat, lng: item.lng });
    setAddress(item.displayName);
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleSOSPress = async () => {
    await createEmergency({
      emergencyType,
      pickupLat: coords.lat,
      pickupLng: coords.lng,
      pickupAddress: address,
      patientName: user?.name,
      patientPhone: user?.phone
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Banner with Medical Profile reminder */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 backdrop-blur-md shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-white">{user?.name || 'Emergency Caller'}</h3>
              <span className="text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Blood {user?.medical_profile?.blood_group || 'O+'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Allergies: <span className="text-slate-200">{user?.medical_profile?.allergies || 'None'}</span> • Conditions: <span className="text-slate-200">{user?.medical_profile?.conditions || 'None'}</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowMedicalModal(true)}
          className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
        >
          Edit Medical Info
        </button>
      </div>

      {/* GPS Location Bar & Address Search */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-red-500" /> Current Pickup Location
          </span>
          <button
            onClick={fetchCurrentLocation}
            disabled={isLocating}
            className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-semibold bg-sky-500/10 px-3 py-1.5 rounded-xl border border-sky-500/20 transition disabled:opacity-50"
          >
            {isLocating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Navigation className="w-3.5 h-3.5" />
            )}
            {isLocating ? 'Acquiring GPS...' : 'Refresh GPS'}
          </button>
        </div>

        <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-red-500/10 text-red-400 mt-0.5">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-100 leading-snug">{address}</p>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Lat: {coords.lat.toFixed(5)}, Lng: {coords.lng.toFixed(5)}
            </p>
          </div>
        </div>

        {gpsError && (
          <p className="text-xs text-amber-400 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {gpsError}
          </p>
        )}

        {/* Search / Manual Location entry */}
        <div className="relative">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs">
            <Search className="w-4 h-4 text-slate-400 mr-2" />
            <input
              type="text"
              placeholder="Or search address / landmark manually (e.g. Union Square, SF)..."
              value={searchQuery}
              onChange={(e) => handleSearchAddress(e.target.value)}
              className="bg-transparent w-full text-slate-100 outline-none placeholder:text-slate-500"
            />
          </div>

          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto">
              {searchResults.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => selectSearchResult(item)}
                  className="w-full text-left px-4 py-2.5 text-xs text-slate-200 hover:bg-slate-800 border-b border-slate-800/80 transition"
                >
                  <p className="font-semibold text-slate-100">{item.displayName}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Big Animated SOS Button Container */}
      <div className="bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center flex flex-col items-center">
        <div className="mb-6">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Emergency Dispatch System
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
            Tap the button below to instantly trigger automated rescue dispatch. Nearest ambulance and hospital bed will be reserved immediately.
          </p>
        </div>

        {/* Selected Emergency Type Tag */}
        <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-slate-400 font-semibold">Incident Category:</span>
          <button
            onClick={() => setShowTypeSelector(prev => !prev)}
            className="px-3.5 py-1.5 rounded-full bg-red-500/20 text-red-300 font-bold text-xs border border-red-500/40 hover:bg-red-500/30 transition uppercase tracking-wide flex items-center gap-1.5"
          >
            🚨 {emergencyType} Emergency
            <span className="text-[10px] text-red-400">(Tap to change)</span>
          </button>
        </div>

        {/* Inline Type Selector Expansion */}
        {showTypeSelector && (
          <div className="w-full mb-8 animate-fadeIn">
            <EmergencyTypePicker
              selectedType={emergencyType}
              onSelect={(type) => {
                setEmergencyType(type);
                setShowTypeSelector(false);
              }}
            />
          </div>
        )}

        {/* Giant Pulsing Red SOS Button */}
        <div className="relative my-4 flex items-center justify-center">
          {/* Pulsing Ripple Rings */}
          <div className="absolute w-60 h-60 sm:w-72 sm:h-72 rounded-full bg-red-600/20 animate-ping-slow pointer-events-none" />
          <div className="absolute w-52 h-52 sm:w-64 sm:h-64 rounded-full bg-red-600/30 animate-pulse pointer-events-none" />

          <button
            onClick={handleSOSPress}
            disabled={isDispatching}
            className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-full bg-gradient-to-tr from-red-700 via-red-600 to-rose-500 text-white font-black text-3xl sm:text-4xl tracking-wider shadow-2xl border-4 border-red-400/80 hover:scale-105 active:scale-95 transition-all duration-200 flex flex-col items-center justify-center gap-2 animate-sos-pulse disabled:opacity-75"
          >
            {isDispatching ? (
              <>
                <Loader2 className="w-12 h-12 animate-spin" />
                <span className="text-sm font-bold uppercase tracking-normal">Matching...</span>
              </>
            ) : (
              <>
                <span>SOS</span>
                <span className="text-[11px] font-bold uppercase tracking-normal px-3 py-1 bg-black/30 rounded-full border border-white/20">
                  Tap to Dispatch
                </span>
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-slate-400 mt-6 max-w-sm">
          📍 Real-time GPS location will be transmitted directly to the nearest ambulance unit.
        </p>
      </div>

      {/* Medical Profile Modal */}
      <MedicalProfileModal
        isOpen={showMedicalModal}
        onClose={() => setShowMedicalModal(false)}
      />
    </div>
  );
};
