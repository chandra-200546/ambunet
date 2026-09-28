-- ==============================================================================
-- AMBUNET: AI-Driven Adaptive Emergency Response Ecosystem
-- Database Migration 001 Schema
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ZONES TABLE (8 Bangalore Zones)
CREATE TABLE IF NOT EXISTS public.zones (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    center_lat DOUBLE PRECISION NOT NULL,
    center_lng DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    phone TEXT,
    role TEXT CHECK (role IN ('patient', 'driver', 'hospital_staff', 'admin')),
    hospital_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. MEDICAL PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.medical_profiles (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    blood_group TEXT DEFAULT 'O+',
    allergies TEXT DEFAULT 'None reported',
    conditions TEXT DEFAULT 'None reported',
    emergency_contact TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. HOSPITALS TABLE
CREATE TABLE IF NOT EXISTS public.hospitals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    contact TEXT NOT NULL,
    specialties TEXT[] DEFAULT ARRAY['General Emergency', 'Trauma', 'ICU'],
    zone_id TEXT REFERENCES public.zones(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. BEDS TABLE
CREATE TABLE IF NOT EXISTS public.beds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
    bed_number TEXT NOT NULL,
    bed_type TEXT NOT NULL CHECK (bed_type IN ('ICU', 'General', 'Trauma', 'Maternity')),
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved')),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. AMBULANCES TABLE
CREATE TABLE IF NOT EXISTS public.ambulances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    driver_name TEXT,
    vehicle_number TEXT NOT NULL UNIQUE,
    current_lat DOUBLE PRECISION NOT NULL,
    current_lng DOUBLE PRECISION NOT NULL,
    heading DOUBLE PRECISION DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'en_route_to_patient', 'transporting', 'at_hospital', 'standby', 'off_duty')),
    standby_zone_id TEXT REFERENCES public.zones(id),
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. EMERGENCIES TABLE
CREATE TABLE IF NOT EXISTS public.emergencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    patient_name TEXT NOT NULL,
    patient_phone TEXT,
    patient_medical_profile JSONB DEFAULT '{}'::jsonb,
    emergency_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'P2' CHECK (severity IN ('P1', 'P2', 'P3')),
    symptoms JSONB DEFAULT '{}'::jsonb,
    pickup_lat DOUBLE PRECISION NOT NULL,
    pickup_lng DOUBLE PRECISION NOT NULL,
    pickup_address TEXT,
    zone_id TEXT REFERENCES public.zones(id),
    assigned_ambulance_id UUID REFERENCES public.ambulances(id) ON DELETE SET NULL,
    assigned_hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
    assigned_bed_id UUID REFERENCES public.beds(id) ON DELETE SET NULL,
    predicted_eta_sec INTEGER DEFAULT 0,
    actual_response_sec INTEGER,
    eta_seconds INTEGER DEFAULT 0,
    distance_km DOUBLE PRECISION DEFAULT 0.0,
    route_geometry JSONB,
    status TEXT NOT NULL DEFAULT 'requested' CHECK (
        status IN ('requested', 'assigned', 'en_route_to_patient', 'picked_up', 'en_route_to_hospital', 'completed', 'cancelled')
    ),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. EMERGENCY STATUS LOG TABLE
CREATE TABLE IF NOT EXISTS public.emergency_status_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    emergency_id UUID NOT NULL REFERENCES public.emergencies(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    notes TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 9. DISPATCH DECISIONS TABLE (Explainability & Auditing)
CREATE TABLE IF NOT EXISTS public.dispatch_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    emergency_id UUID NOT NULL REFERENCES public.emergencies(id) ON DELETE CASCADE,
    candidates JSONB NOT NULL,
    chosen_ambulance_id UUID REFERENCES public.ambulances(id),
    chosen_hospital_id UUID REFERENCES public.hospitals(id),
    mode TEXT NOT NULL DEFAULT 'adaptive' CHECK (mode IN ('baseline', 'adaptive')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. TRAFFIC FACTORS TABLE (Adaptive Multipliers)
CREATE TABLE IF NOT EXISTS public.traffic_factors (
    zone_id TEXT NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
    hour_bucket INTEGER NOT NULL CHECK (hour_bucket BETWEEN 0 AND 23),
    daytype TEXT NOT NULL CHECK (daytype IN ('weekday', 'weekend')),
    multiplier DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    samples INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (zone_id, hour_bucket, daytype)
);

-- 11. DEMAND HISTORY TABLE (Synthetic Demand Forecasting)
CREATE TABLE IF NOT EXISTS public.demand_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_id TEXT NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
    hour INTEGER NOT NULL CHECK (hour BETWEEN 0 AND 23),
    weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
    count INTEGER NOT NULL DEFAULT 0
);

-- 12. ZONE TIME MATRIX TABLE (Pre-cached OSRM Table Durations)
CREATE TABLE IF NOT EXISTS public.zone_time_matrix (
    from_zone TEXT NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
    to_zone TEXT NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
    base_seconds INTEGER NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (from_zone, to_zone)
);

-- 13. SIMULATION RUNS TABLE (Benchmark History)
CREATE TABLE IF NOT EXISTS public.simulation_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_at TIMESTAMPTZ DEFAULT NOW(),
    num_emergencies INTEGER NOT NULL,
    baseline_avg_sec DOUBLE PRECISION NOT NULL,
    adaptive_avg_sec DOUBLE PRECISION NOT NULL,
    baseline_p90_sec DOUBLE PRECISION NOT NULL,
    adaptive_p90_sec DOUBLE PRECISION NOT NULL,
    improvement_pct DOUBLE PRECISION NOT NULL,
    config JSONB NOT NULL
);

-- ==============================================================================
-- AUTH TRIGGER: Automatically create user entry with role=NULL on auth signup
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, name, email, phone, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, NEW.phone, 'User'),
        NEW.email,
        NEW.phone,
        NULL
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- RLS POLICIES
-- ==============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambulances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_status_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demand_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zone_time_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_runs ENABLE ROW LEVEL SECURITY;

-- Permissive public policies for client-side demo operations & auth handling
CREATE POLICY "Public Read/Write Users" ON public.users FOR ALL USING (true);
CREATE POLICY "Public Read/Write Profiles" ON public.medical_profiles FOR ALL USING (true);
CREATE POLICY "Public Read Zones" ON public.zones FOR SELECT USING (true);
CREATE POLICY "Public Read/Write Hospitals" ON public.hospitals FOR ALL USING (true);
CREATE POLICY "Public Read/Write Beds" ON public.beds FOR ALL USING (true);
CREATE POLICY "Public Read/Write Ambulances" ON public.ambulances FOR ALL USING (true);
CREATE POLICY "Public Read/Write Emergencies" ON public.emergencies FOR ALL USING (true);
CREATE POLICY "Public Read/Write Logs" ON public.emergency_status_log FOR ALL USING (true);
CREATE POLICY "Public Read/Write Decisions" ON public.dispatch_decisions FOR ALL USING (true);
CREATE POLICY "Public Read/Write Traffic" ON public.traffic_factors FOR ALL USING (true);
CREATE POLICY "Public Read/Write Demand" ON public.demand_history FOR ALL USING (true);
CREATE POLICY "Public Read/Write Matrix" ON public.zone_time_matrix FOR ALL USING (true);
CREATE POLICY "Public Read/Write Simulations" ON public.simulation_runs FOR ALL USING (true);

-- ==============================================================================
-- REALTIME SUBSCRIPTIONS ENABLEMENT
-- ==============================================================================
ALTER TABLE public.ambulances REPLICA IDENTITY FULL;
ALTER TABLE public.emergencies REPLICA IDENTITY FULL;
ALTER TABLE public.beds REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'ambulances') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ambulances;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'emergencies') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.emergencies;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'beds') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.beds;
  END IF;
END $$;
