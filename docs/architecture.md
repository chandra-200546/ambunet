# AmbuNet V2.0 Architecture Notes

## Current Repository Audit

AmbuNet is currently a Vite + React + TypeScript application with Tailwind CSS, Leaflet maps, Recharts analytics, Supabase integration, and deterministic client-side AI modules.

Implemented before the V2.0 upgrade:

- Patient, driver, hospital staff, and admin role dashboards
- Supabase auth/data wiring with local fallback data
- Bangalore ambulance, hospital, bed, zone, and emergency seed data
- Live map rendering with hospitals, ambulances, incidents, and routes
- AI modules for triage, ETA adjustment, demand forecasting, bed probability, standby positioning, and dispatch scoring
- Admin simulation benchmark comparing baseline and adaptive dispatch
- Vitest coverage for the existing AI modules

Added in this upgrade:

- `/review-demo` route for the Review 2 engineering walkthrough
- Deterministic Koramangala road graph fallback digital twin
- Dijkstra, A*, and traffic-aware routing candidates
- Simulated emergency traffic-signal priority events
- Ambulance selection audit based on reproducible ETA calculations
- Hospital matching from seeded Bangalore hospital records
- Baseline vs AmbuNet metric comparison and CSV export
- Unit tests for routing, signal priority, deterministic scenario output, and export

## Runtime Architecture

```mermaid
flowchart TD
  A[React Vite Dashboard] --> B[Role Dashboards]
  A --> C[Review Demo Route]
  B --> D[Supabase Client]
  B --> E[AI Dispatch Modules]
  C --> F[Review Demo Engine]
  F --> G[Bangalore Road Graph]
  F --> H[Dijkstra and A* Routing]
  F --> I[Traffic-Aware Corridor Optimizer]
  F --> J[Signal Priority Simulator]
  F --> K[CSV Experiment Export]
  D --> L[Supabase PostgreSQL]
  E --> M[Client-Side Deterministic Fallback]
```

## Review 2 Workflow

```mermaid
flowchart LR
  A[Load Scenario] --> B[Select Ambulance]
  B --> C[Compute Baseline Route]
  C --> D[Predict Synthetic Traffic]
  D --> E[Optimize AmbuNet Corridor]
  E --> F[Simulate Signal Priority]
  F --> G[Match Hospital]
  G --> H[Compare Metrics]
  H --> I[Explain Decision]
  I --> J[Export CSV]
```

## Algorithm Notes

Baseline:

- Uses Dijkstra routing over the seeded road graph.
- Uses free-flow travel time plus normal signal delay.
- Does not apply predictive traffic optimization or signal priority.

AmbuNet optimized:

- Compares available ambulances by traffic-aware ETA.
- Applies traffic intensity, weather, and simulated vehicle-load multipliers.
- Reduces signal waiting only through labeled simulated priority events.
- Produces route, ETA, congestion delay, signal wait, and percentage improvement.

Improvement formula:

```text
((Baseline Time - AmbuNet Time) / Baseline Time) * 100
```

## Local Execution

```bash
npm install
npm run test
npm run dev
```

Open:

```text
http://localhost:5173/review-demo
```

## Limitations and Future Scope

- This repository does not currently contain a separate Node/Express backend, Socket.IO server, Python FastAPI service, or SUMO/TraCI bundle.
- The Review 2 demo is intentionally implemented as a lightweight deterministic fallback so it runs on a Windows development machine without paid APIs.
- Future backend work should move orchestration into Node.js APIs and keep the Python ML/digital-twin services behind explicit endpoints.
- SUMO integration should be added as an optional service with installation instructions, not silently required for the local demo.
