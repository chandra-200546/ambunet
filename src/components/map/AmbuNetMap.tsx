import React, { useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  useMapEvents
} from 'react-leaflet';
import { LatLngBoundsExpression, LatLngExpression } from 'leaflet';
import { Ambulance, Hospital, Emergency, LocationCoords } from '../../types';
import {
  createAmbulanceIcon,
  createPatientIcon,
  createHospitalIcon
} from './MapIcons';
import { formatETA, formatDistance } from '../../lib/haversine';
import { Layers, Locate, Compass, Phone, ShieldAlert, BedDouble } from 'lucide-react';

interface AmbuNetMapProps {
  ambulances?: Ambulance[];
  hospitals?: Hospital[];
  emergencies?: Emergency[];
  activeEmergency?: Emergency | null;
  focusedAmbulanceId?: string | null;
  routeCoordinates?: [number, number][]; // [lat, lng][]
  onLocationSelect?: (coords: LocationCoords) => void;
  selectableLocation?: boolean;
  selectedLocation?: LocationCoords | null;
  center?: [number, number];
  zoom?: number;
  className?: string;
  showControls?: boolean;
}

// Sub-component to fit bounds or fly to active emergency
function MapController({
  activeEmergency,
  focusedAmbulance,
  selectedLocation,
  routeCoordinates
}: {
  activeEmergency?: Emergency | null;
  focusedAmbulance?: Ambulance | null;
  selectedLocation?: LocationCoords | null;
  routeCoordinates?: [number, number][];
}) {
  const map = useMap();

  useEffect(() => {
    if (routeCoordinates && routeCoordinates.length > 1) {
      const bounds: LatLngBoundsExpression = routeCoordinates as [number, number][];
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    } else if (activeEmergency) {
      map.flyTo([activeEmergency.pickup_lat, activeEmergency.pickup_lng], 14, {
        duration: 1.2
      });
    } else if (focusedAmbulance) {
      map.flyTo([focusedAmbulance.current_lat, focusedAmbulance.current_lng], 15, {
        duration: 1
      });
    } else if (selectedLocation) {
      map.flyTo([selectedLocation.lat, selectedLocation.lng], 15, {
        duration: 0.8
      });
    }
  }, [activeEmergency?.id, focusedAmbulance?.id, selectedLocation?.lat, routeCoordinates]);

  return null;
}

// Sub-component to handle map click for location picking
function LocationPickerEvents({ onSelect }: { onSelect: (coords: LocationCoords) => void }) {
  useMapEvents({
    click(e) {
      onSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });
  return null;
}

export const AmbuNetMap: React.FC<AmbuNetMapProps> = ({
  ambulances = [],
  hospitals = [],
  emergencies = [],
  activeEmergency,
  focusedAmbulanceId,
  routeCoordinates,
  onLocationSelect,
  selectableLocation = false,
  selectedLocation,
  center = [37.7749, -122.4194], // San Francisco default
  zoom = 13,
  className = 'h-[500px] w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-800',
  showControls = true
}) => {
  const [mapTheme, setMapTheme] = useState<'dark' | 'clean'>('dark');

  const focusedAmbulance = ambulances.find(a => a.id === focusedAmbulanceId);

  // Derive route coordinates from active emergency if not explicitly passed
  const activeRoute = routeCoordinates || (
    activeEmergency?.route_geometry?.coordinates
      ? activeEmergency.route_geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number])
      : undefined
  );

  return (
    <div className={`relative ${className} bg-slate-950`}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className={`h-full w-full ${mapTheme === 'dark' ? 'dark-tiles' : 'clean-tiles'}`}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <MapController
          activeEmergency={activeEmergency}
          focusedAmbulance={focusedAmbulance}
          selectedLocation={selectedLocation}
          routeCoordinates={activeRoute}
        />

        {selectableLocation && onLocationSelect && (
          <LocationPickerEvents onSelect={onLocationSelect} />
        )}

        {/* Dynamic Route Polyline (Glow layer + Main line) */}
        {activeRoute && activeRoute.length > 0 && (
          <>
            {/* Outer Glow */}
            <Polyline
              positions={activeRoute as LatLngExpression[]}
              pathOptions={{
                color: '#38BDF8',
                weight: 10,
                opacity: 0.35,
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />
            {/* Inner Core */}
            <Polyline
              positions={activeRoute as LatLngExpression[]}
              pathOptions={{
                color: '#0284C7',
                weight: 5,
                opacity: 0.95,
                dashArray: '1, 10',
                dashOffset: '0'
              }}
            />
          </>
        )}

        {/* Selected custom location pin */}
        {selectedLocation && (
          <Marker
            position={[selectedLocation.lat, selectedLocation.lng]}
            icon={createPatientIcon('Pickup Point')}
          >
            <Popup>
              <div className="text-xs p-1">
                <p className="font-bold text-red-400">Selected Incident Location</p>
                <p className="text-slate-300 text-[11px]">
                  {selectedLocation.lat.toFixed(5)}, {selectedLocation.lng.toFixed(5)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Render Hospitals */}
        {hospitals.map(hosp => (
          <Marker
            key={hosp.id}
            position={[hosp.lat, hosp.lng]}
            icon={createHospitalIcon(hosp.name, hosp.availableBedsCount || 0)}
          >
            <Popup>
              <div className="p-2 min-w-[200px] text-slate-100">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center font-bold text-xs">
                    H
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-blue-300 leading-tight">{hosp.name}</h4>
                    <p className="text-[10px] text-slate-400">{hosp.address}</p>
                  </div>
                </div>

                <div className="my-2 bg-slate-900/80 p-2 rounded-lg border border-slate-700 flex justify-between items-center text-xs">
                  <span className="flex items-center gap-1 text-slate-300">
                    <BedDouble className="w-3.5 h-3.5 text-emerald-400" /> Available Beds:
                  </span>
                  <span className="font-bold text-emerald-400">
                    {hosp.availableBedsCount ?? 0} / {hosp.total_capacity}
                  </span>
                </div>

                <a
                  href={`tel:${hosp.contact_number}`}
                  className="w-full flex items-center justify-center gap-1.5 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 rounded-md py-1 text-xs font-semibold transition"
                >
                  <Phone className="w-3 h-3" /> {hosp.contact_number}
                </a>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Render Ambulances */}
        {ambulances.map(amb => (
          <Marker
            key={amb.id}
            position={[amb.current_lat, amb.current_lng]}
            icon={createAmbulanceIcon(amb.status, amb.vehicle_number, amb.heading || 0)}
          >
            <Popup>
              <div className="p-2 min-w-[190px] text-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-red-400 flex items-center gap-1">
                    🚑 {amb.vehicle_number}
                  </span>
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    amb.status === 'idle'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : amb.status === 'off_duty'
                      ? 'bg-slate-700 text-slate-400'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                  }`}>
                    {amb.status}
                  </span>
                </div>

                <p className="text-xs text-slate-300 mb-2">
                  Driver: <span className="font-semibold text-slate-100">{amb.driver_name || 'Assigned Driver'}</span>
                </p>

                {amb.driver_phone && (
                  <a
                    href={`tel:${amb.driver_phone}`}
                    className="w-full flex items-center justify-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 rounded-md py-1 text-xs font-semibold transition"
                  >
                    <Phone className="w-3 h-3" /> Call Driver
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Render Active Emergencies */}
        {emergencies
          .filter(em => em.status !== 'completed' && em.status !== 'cancelled')
          .map(em => (
            <Marker
              key={em.id}
              position={[em.pickup_lat, em.pickup_lng]}
              icon={createPatientIcon(em.emergency_type)}
            >
              <Popup>
                <div className="p-2 min-w-[220px] text-slate-100">
                  <div className="flex items-center gap-2 mb-1.5">
                    <ShieldAlert className="w-4 h-4 text-red-400" />
                    <div>
                      <h4 className="font-bold text-sm text-red-400 uppercase">
                        {em.emergency_type} Emergency
                      </h4>
                      <p className="text-[11px] text-slate-300">{em.pickup_address}</p>
                    </div>
                  </div>

                  <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-700 space-y-1 text-xs my-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Caller:</span>
                      <span className="font-semibold text-slate-200">{em.patient_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Status:</span>
                      <span className="font-bold text-amber-400 uppercase text-[10px]">
                        {em.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {em.eta_seconds && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Live ETA:</span>
                        <span className="font-bold text-sky-400">{formatETA(em.eta_seconds)}</span>
                      </div>
                    )}
                  </div>

                  <a
                    href={`tel:${em.patient_phone}`}
                    className="w-full flex items-center justify-center gap-1.5 bg-red-600/30 hover:bg-red-600/50 text-red-300 border border-red-500/40 rounded-md py-1 text-xs font-semibold transition"
                  >
                    <Phone className="w-3 h-3" /> {em.patient_phone}
                  </a>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>

      {/* Floating Map Controls overlay */}
      {showControls && (
        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
          {/* Layer switcher */}
          <button
            onClick={() => setMapTheme(prev => (prev === 'dark' ? 'clean' : 'dark'))}
            title="Toggle Map Style"
            className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 backdrop-blur-md shadow-lg transition"
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
