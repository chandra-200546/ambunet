# AmbuNet feature audit - 2026-10-22

Source: the 23-section AmbuNet V2.0 pasted specification supplied in this chat. No PDF was found in the available attachment directory. This is not certification of every production integration.

## Implemented in this update

- Removed the traffic-aware-only 0.72 congestion discount. Both methods now experience the same seeded road costs.
- Shortest-distance Dijkstra and A* share an objective; A* heuristic is scaled to the minimum graph edge/geographic ratio.
- Ambulance selection is independent per strategy. Baseline selects shortest road distance; adaptive selects lowest evaluated ETA.
- Response time ends at the patient. Hospital transportation is separately exported as total mission time.
- Added segment-time interpolation, signal waiting, pause/resume/reset and playback speed.
- Added incident/start/hospital/fleet/demand/seed controls, paired experiments, mean/P90 and raw CSV exports.
- Random Forest training, CSV ingestion, missing-feature imputation fitted on train only, chronological 60/20/20 split, validation depth selection, held-out MAE/RMSE/MAPE, joblib persistence, browser forest export and FastAPI inference.
- Old admin benchmark now uses paired graph experiments instead of algorithm-specific random multipliers. Removed invented median and critical-target percentages and default 26.4% metric.

## Requirements status

| Requirement | Status and evidence |
| --- | --- |
| Existing role dashboards and emergency registration | Existing code preserved; full authenticated production workflow not re-certified |
| Bengaluru map | Existing Leaflet map; Review Demo explicitly centered in Bengaluru |
| Real OSM road network / SUMO / TraCI | Missing; current graph is a hand-authored schematic, not an imported street network |
| Dijkstra / A* / traffic-aware routes | Implemented, all-pairs Dijkstra/A* equivalence tested |
| Dynamic rerouting | Existing app OSRM refresh; review scenarios recompute when parameters change, no live road-closure engine |
| Signal priority | Synthetic minimum-phase/yellow/all-red timing with playback; no conflicting-approach controller or TraCI integration |
| Ambulance selection | Single-incident fleet selection; no joint simultaneous dispatch optimizer or capability constraint solver |
| Random Forest | Implemented on synthetic observations; exported forest used in route cost estimation |
| LSTM | Missing |
| Simulation Lab | Route-time playback and scenario controls; normal vehicle count is demand input, not individual vehicle simulation |
| Algorithm comparison | Paired synthetic scenarios, mean/P90, response vs mission distinction, exports; no real-world improvement claim |
| Explainability | Route cost factors and fleet audit; not a clinical decision model |
| Hospital intelligence | Seeded facility selection; no verified capacity, resource freshness, or dispatcher-confirmed reservation workflow |
| Medical profiles | Existing editable profile; private document upload/download authorization incomplete |
| First aid | Curated assistance module missing |
| Tracking | Existing emergency-ID tracking; random token expiration and minimal public payload missing |
| Notifications | Existing in-app sounds/status; external SMS delivery not tested |
| Authentication | Existing Supabase Google/phone flows; provider credentials and live sign-in not re-tested |
| Database security | Existing migration includes permissive demo RLS; operational role enforcement and secure document storage require migration |
| Node / Socket.IO orchestration | Missing; existing Supabase realtime retained |
| FastAPI | Local prediction service and tests provided; not deployed as a persistent service on Vercel |
| Docker / CI | Local web+ML Compose and CI supplied; Docker execution requires installed Docker and remains unverified here |

## Outstanding integration work

The earlier claim that Priority 1 was complete was incorrect. OSM import, backend-owned simulation sessions, robust emergency assignment integration, and end-to-end tests remain necessary to meet it fully. Priority 2 and 3 features must not be presented as complete merely because a panel exists.

Preserve the existing database. Do not run reset_public_schema.sql or seed.sql against existing records as an upgrade operation. No database schema or records were changed in this update.

## Local ML runbook (Windows)

```powershell
py -m venv .venv
.\.venv\Scripts\python -m pip install -r ml/requirements.txt
.\.venv\Scripts\python ml/train.py
.\.venv\Scripts\python -m unittest ml.test_api
.\.venv\Scripts\python -m uvicorn ml.app:app --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000/docs` for request schemas. POST `/api/traffic/predict` takes `free_flow_sec`, `congestion`, `traffic_level` (0/1/2), `rain` (0/1), and `vehicles`. GET `/api/traffic/metrics` returns held-out evaluation. The Vercel frontend uses the exported model artifact and needs no Python server.

CSV training: `python ml/train.py --csv path/to/data.csv`. Columns: numeric `timestamp`, `free_flow_sec`, `congestion`, `traffic_level`, `rain`, `vehicles`, `travel_sec`. The bundled generator uses ordinal synthetic timestamps and seed 42; they are not dates of Bengaluru observations. Replace provenance labels before publishing results from any separately sourced real dataset.

Model references: [RandomForestRegressor](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.RandomForestRegressor.html) and [FastAPI testing](https://fastapi.tiangolo.com/tutorial/testing/).
