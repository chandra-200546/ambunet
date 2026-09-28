# 🚑 AmbuNet — AI-Driven Adaptive Emergency Response Ecosystem

AmbuNet is an AI-powered emergency response and hospital coordination ecosystem designed to cut ambulance response times in Bangalore using real-time predictive routing, dynamic traffic learning, hospital bed probability modeling, and intelligent pre-positioning.

> ⚠️ **Academic Prototype Notice**: This application is an academic prototype for demonstration and simulation purposes — not for real emergencies. In a real medical emergency in India, call **108** or **112**.

---

## 🚀 Quick Setup & Execution

### 1. Install Dependencies
```bash
npm install
```

### 2. Run AI Unit Tests
```bash
npm run test
```
Executes Vitest unit test suite covering triage logic (`triage.ts`), predictive traffic multipliers & online learning (`etaModel.ts`), demand forecasting (`demandModel.ts`), standby pre-positioning (`positioning.ts`), bed probability modeling (`bedModel.ts`), and multi-objective dispatch candidate scoring (`dispatchScore.ts`).

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔑 Environment Variables (`.env`)

Copy `.env.example` to `.env`:
```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
VITE_DEMO_MODE=true
```

- `VITE_SUPABASE_URL`: Supabase project HTTPS URL.
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous public key.
- `VITE_DEMO_MODE`: Set to `true` to enable client-side AI dispatch execution and one-click demo role accounts for instant live presentation without relying on SMS or email delivery.

---

## 🗄️ Database Setup (Supabase PostgreSQL)

To set up your live Supabase database instance:

1. Open your [Supabase Dashboard](https://supabase.com).
2. Go to the **SQL Editor**.
3. Run the migration script located at [`/supabase/migrations/001_schema.sql`](file:///C:/Users/Chandrashekhar/.gemini/antigravity/scratch/ambunet/supabase/migrations/001_schema.sql). This creates all 13 tables (`users`, `medical_profiles`, `zones`, `hospitals`, `beds`, `ambulances`, `emergencies`, `emergency_status_log`, `dispatch_decisions`, `traffic_factors`, `demand_history`, `zone_time_matrix`, `simulation_runs`), database triggers, and RLS policies.
4. Run the seed script located at [`/supabase/seed.sql`](file:///C:/Users/Chandrashekhar/.gemini/antigravity/scratch/ambunet/supabase/seed.sql). This populates the 8 Bangalore zones, 10 real Bangalore hospitals with exact coordinates, 14 demo ambulances, initial peak traffic factors, and synthetic demand history.
5. **Enable Realtime Replication**:
   - Go to **Database -> Replication** in your Supabase dashboard.
   - Ensure tables `ambulances`, `emergencies`, and `beds` are enabled for Realtime broadcasting.
6. **Provider Setup (Twilio & Google)**:
   - For Phone OTP: Go to **Authentication -> Providers -> Phone**, select Twilio, and supply your Twilio Account SID, Auth Token, and Messaging Service SID.
   - For Google OAuth: Go to **Authentication -> Providers -> Google**, enable Google provider, and configure Client ID and Client Secret with redirect URI set to your app URL.

---

## 📊 Simulation & Benchmark Suite

The Simulation & Benchmark module is located in the **Admin Dashboard** (`AnalyticsDashboard.tsx`).

### How to Run:
1. Switch to the **Admin Dispatcher** role using the floating role switcher bar at the bottom.
2. Scroll to the **Simulation & Benchmark Module**.
3. Configure the number of synthetic emergencies (default: 200).
4. Click **Run Simulation Benchmark**.

### How it Works:
- On first run, it fetches and caches an $N \times N$ zone duration matrix using the public OSRM Table API (`/table/v1/driving`).
- Runs the exact same set of $N$ synthetic emergencies through two dispatch algorithms under a hidden ground-truth traffic model with random noise:
  1. **Baseline Dispatch**: Straight-line distance nearest-ambulance selection, nearest hospital, raw ETA, no traffic predictions.
  2. **AmbuNet AI Adaptive**: Triage priority assessment, traffic-adjusted ETA prediction, bed availability probability modeling, multi-objective scoring ($w_1..w_5$), and online multiplier learning.
- Displays side-by-side comparative analysis: Average Response Time, Median, P90, % of P1 critical cases under target, and the **Measured Improvement %**.
- Displays the KPI Card: **Target 25% | Measured X%**.
- Includes a one-click **CSV Export** button for benchmark reports.

---

## 🧠 AI Engine Modules (`/src/ai`)

1. **`triage.ts`**: Triage algorithm evaluating emergency category, symptom checklist (unconscious, not breathing, severe bleeding, chest pain, stroke, fracture, burns), and age band into severity level (P1, P2, P3), required medical specialty, bed type, and clinical rationale.
2. **`etaModel.ts`**: Calculates traffic-adjusted predicted ETA: $\text{ETA} = \text{OSRM Base} \times \text{Multiplier}(\text{zone}, \text{hour}, \text{daytype})$. Upon trip completion, updates multiplier online: $m_{\text{new}} = 0.8 m_{\text{old}} + 0.2 (\text{actual} / \text{osrm\_base})$. Tracks MAE error over time.
3. **`demandModel.ts`**: Forecasts incident demand per zone 1–6 hours ahead using Laplace-smoothed Poisson rate estimation.
4. **`positioning.ts`**: Greedy optimization matching idle ambulances to high forecast-demand, low-coverage deficit zones.
5. **`bedModel.ts`**: Computes arrival bed availability probability: $P(\text{bed}) = \max(0, \min(1, (\text{available} - \text{reserved} - \text{inbound} + \text{expected\_discharges}) / \text{total}))$.
6. **`dispatchScore.ts`**: Multi-objective dispatch optimization:
   $$\text{Score} = w_1 \cdot \text{ETA}_{\text{patient}} + w_2 \cdot \text{ETA}_{\text{hospital}} + w_3 \cdot (1 - P_{\text{bed}}) + w_4 \cdot \text{SpecialtyMismatch} + w_5 \cdot \text{CoverageLoss}$$

---

## 📐 Sensible Assumptions Made

1. **OSRM & Nominatim Public APIs**: Uses free public OSRM routing (`https://router.project-osrm.org`) and OSM Nominatim geocoding. Includes automatic fallback to Haversine straight-line road-factor calculations ($35\text{ km/h}$) when offline or rate-limited.
2. **Bangalore Geo-Grid**: Anchored around 8 primary Bangalore traffic hubs (Whitefield, Electronic City, Hebbal, Koramangala, Jayanagar, Yeshwanthpur, Central/Majestic, KR Puram) and 10 real hospitals (Victoria, NIMHANS, St. John's, Manipal, Sakra, Fortis, Apollo, etc.).
3. **Client-Side Fallback Execution**: In `VITE_DEMO_MODE=true`, dispatch scoring, triage, and route animations run client-side to ensure 100% runnable, zero-dependency offline demonstration.
4. **Target vs Measured**: 25% is stated as the benchmark target, while the actual percentage reduction is computed dynamically from simulation results.
