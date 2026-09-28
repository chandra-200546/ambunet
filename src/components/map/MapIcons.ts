import L from 'leaflet';
import { AmbulanceStatus } from '../../types';

export function createAmbulanceIcon(
  status: AmbulanceStatus,
  vehicleNumber: string,
  heading: number = 0
) {
  let statusColor = '#10B981'; // green for idle
  let ringColor = 'rgba(16, 185, 129, 0.4)';

  if (status === 'en_route_to_patient' || status === 'transporting') {
    statusColor = '#EF4444'; // red for active emergency
    ringColor = 'rgba(239, 68, 68, 0.6)';
  } else if (status === 'at_hospital' || status === 'standby') {
    statusColor = '#3B82F6'; // blue for arrived
    ringColor = 'rgba(59, 130, 246, 0.5)';
  } else if (status === 'off_duty') {
    statusColor = '#64748B'; // gray
    ringColor = 'rgba(100, 116, 139, 0.3)';
  }

  const html = `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -50%);">
      <!-- Rotating vehicle circle -->
      <div style="
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: #0f172a;
        border: 2px solid ${statusColor};
        box-shadow: 0 0 16px ${ringColor}, 0 4px 6px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.4s ease;
      ">
        <svg style="transform: rotate(${heading}deg); transition: transform 0.4s ease;" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${statusColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <!-- Directional arrow / ambulance emblem -->
          <polygon points="12 2 19 21 12 17 5 21 12 2" fill="${statusColor}" fill-opacity="0.25"/>
        </svg>
      </div>

      <!-- Vehicle Tag -->
      <div style="
        margin-top: 4px;
        background: rgba(15, 23, 42, 0.9);
        border: 1px solid ${statusColor};
        color: #f8fafc;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.5px;
        padding: 2px 6px;
        border-radius: 6px;
        white-space: nowrap;
        box-shadow: 0 2px 4px rgba(0,0,0,0.5);
      ">
        🚑 ${vehicleNumber}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-ambulance-icon',
    iconSize: [44, 44],
    iconAnchor: [22, 22]
  });
}

export function createPatientIcon(type: string = 'Emergency') {
  const html = `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -50%);">
      <!-- Outer radar ripple -->
      <div style="
        position: absolute;
        width: 54px;
        height: 54px;
        border-radius: 50%;
        background: rgba(239, 68, 68, 0.25);
        animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
      "></div>

      <!-- Core marker -->
      <div style="
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: #ef4444;
        border: 3px solid #ffffff;
        box-shadow: 0 0 20px rgba(239, 68, 68, 0.8), 0 4px 6px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2;
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
          <path d="M12 2v20M2 12h20"/>
        </svg>
      </div>

      <!-- Label -->
      <div style="
        margin-top: 4px;
        background: #991b1b;
        color: #fff;
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
        padding: 2px 6px;
        border-radius: 6px;
        border: 1px solid #f87171;
        box-shadow: 0 2px 4px rgba(0,0,0,0.5);
        z-index: 2;
      ">
        SOS • ${type}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-patient-icon',
    iconSize: [44, 44],
    iconAnchor: [22, 22]
  });
}

export function createHospitalIcon(name: string, availableBeds: number = 0) {
  const badgeColor = availableBeds > 0 ? '#10B981' : '#EF4444';

  const html = `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -50%);">
      <div style="
        width: 40px;
        height: 40px;
        border-radius: 10px;
        background: #1e3a8a;
        border: 2px solid #60a5fa;
        box-shadow: 0 0 15px rgba(59, 130, 246, 0.4), 0 4px 6px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="color: #ffffff; font-weight: 900; font-size: 18px; font-family: sans-serif;">H</span>
      </div>

      <!-- Available Beds Badge -->
      <div style="
        position: absolute;
        top: -6px;
        right: -8px;
        background: ${badgeColor};
        color: #fff;
        font-size: 9px;
        font-weight: 800;
        border-radius: 9999px;
        padding: 1px 5px;
        border: 1.5px solid #0f172a;
      ">
        ${availableBeds} beds
      </div>

      <!-- Name label -->
      <div style="
        margin-top: 4px;
        background: rgba(15, 23, 42, 0.95);
        color: #93c5fd;
        font-size: 9px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 6px;
        border: 1px solid #3b82f6;
        max-width: 120px;
        text-align: center;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      ">
        ${name.replace(' Hospital', '').replace(' Medical Center', '')}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-hospital-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
}
