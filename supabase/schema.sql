-- ==============================================================================
-- AMBUNET: REAL-TIME EMERGENCY MEDICAL RESCUE & HOSPITAL COORDINATION PLATFORM
-- Database Schema, Functions, Triggers, Realtime Publications & Seed Data
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. USERS & PROFILES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('patient', 'driver', 'hospital_staff', 'admin')),
    medical_profile JSONB DEFAULT '{"blood_group": "O+", "allergies": "None", "conditions": "None", "emergency_contact": "+1 (555) 019-2834"}'::jsonb,
    hospital_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. HOSPITALS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hospitals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    contact_number TEXT NOT NULL,
    total_capacity INTEGER DEFAULT 50,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. BEDS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.beds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
    bed_number TEXT NOT NULL,
    bed_type TEXT NOT NULL CHECK (bed_type IN ('ICU', 'General', 'Trauma', 'Maternity')),
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved')),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. AMBULANCES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ambulances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    driver_name TEXT,
    driver_phone TEXT,
    vehicle_number TEXT NOT NULL UNIQUE,
    current_lat DOUBLE PRECISION NOT NULL,
    current_lng DOUBLE PRECISION NOT NULL,
    heading DOUBLE PRECISION DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'dispatched', 'en_route', 'arrived', 'off_duty')),
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5. EMERGENCIES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.emergencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    patient_name TEXT NOT NULL,
    patient_phone TEXT NOT NULL,
    patient_medical_profile JSONB DEFAULT '{}'::jsonb,
    emergency_type TEXT NOT NULL CHECK (emergency_type IN ('accident', 'cardiac', 'burn', 'maternity', 'respiratory', 'other')),
    pickup_lat DOUBLE PRECISION NOT NULL,
    pickup_lng DOUBLE PRECISION NOT NULL,
    pickup_address TEXT,
    assigned_ambulance_id UUID REFERENCES public.ambulances(id) ON DELETE SET NULL,
    assigned_hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
    assigned_bed_id UUID REFERENCES public.beds(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'requested' CHECK (
        status IN (
            'requested',
            'assigned',
            'en_route_to_patient',
            'picked_up',
            'en_route_to_hospital',
            'completed',
            'cancelled'
        )
    ),
    eta_seconds INTEGER DEFAULT 0,
    distance_km DOUBLE PRECISION DEFAULT 0.0,
    route_geometry JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 6. EMERGENCY STATUS LOG TABLE (Audit trail / Analytics)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.emergency_status_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    emergency_id UUID NOT NULL REFERENCES public.emergencies(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    notes TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambulances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_status_log ENABLE ROW LEVEL SECURITY;

-- Allow public read & write for demo / rapid response operations
CREATE POLICY "Public Read All Users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Public Insert/Update Users" ON public.users FOR ALL USING (true);

CREATE POLICY "Public Read Hospitals" ON public.hospitals FOR SELECT USING (true);
CREATE POLICY "Public Manage Hospitals" ON public.hospitals FOR ALL USING (true);

CREATE POLICY "Public Read Beds" ON public.beds FOR SELECT USING (true);
CREATE POLICY "Public Manage Beds" ON public.beds FOR ALL USING (true);

CREATE POLICY "Public Read Ambulances" ON public.ambulances FOR SELECT USING (true);
CREATE POLICY "Public Manage Ambulances" ON public.ambulances FOR ALL USING (true);

CREATE POLICY "Public Read Emergencies" ON public.emergencies FOR SELECT USING (true);
CREATE POLICY "Public Manage Emergencies" ON public.emergencies FOR ALL USING (true);

CREATE POLICY "Public Read Logs" ON public.emergency_status_log FOR SELECT USING (true);
CREATE POLICY "Public Insert Logs" ON public.emergency_status_log FOR ALL USING (true);

-- ------------------------------------------------------------------------------
-- 8. REALTIME REPLICATION CONFIGURATION
-- ------------------------------------------------------------------------------
-- Ensure full row replication is sent to Realtime subscribers
ALTER TABLE public.ambulances REPLICA IDENTITY FULL;
ALTER TABLE public.emergencies REPLICA IDENTITY FULL;
ALTER TABLE public.beds REPLICA IDENTITY FULL;

-- Add tables to the supabase_realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'ambulances'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ambulances;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'emergencies'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.emergencies;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'beds'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.beds;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 9. STATUS LOG TRIGGER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_emergency_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') OR (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.emergency_status_log (emergency_id, status, notes, timestamp)
        VALUES (NEW.id, NEW.status, 'Status transitioned to ' || NEW.status, NOW());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_emergency_status ON public.emergencies;
CREATE TRIGGER trigger_log_emergency_status
AFTER INSERT OR UPDATE OF status ON public.emergencies
FOR EACH ROW EXECUTE FUNCTION log_emergency_status_change();

-- ------------------------------------------------------------------------------
-- 10. REALISTIC SEED DATA (San Francisco / Metro Area Demo Coordinates)
-- ------------------------------------------------------------------------------
-- Clean existing demo seed data if needed
TRUNCATE TABLE public.emergency_status_log CASCADE;
TRUNCATE TABLE public.emergencies CASCADE;
TRUNCATE TABLE public.ambulances CASCADE;
TRUNCATE TABLE public.beds CASCADE;
TRUNCATE TABLE public.hospitals CASCADE;
TRUNCATE TABLE public.users CASCADE;

-- Insert Seed Users (Demo profiles)
INSERT INTO public.users (id, name, phone, email, role, medical_profile) VALUES
('11111111-1111-1111-1111-111111111111', 'Alex Mercer', '+1 (555) 234-5678', 'patient.demo@ambunet.org', 'patient', '{"blood_group": "A+", "allergies": "Penicillin", "conditions": "Asthma", "emergency_contact": "Sarah Mercer (+1 555-901-2345)"}'::jsonb),
('22222222-2222-2222-2222-222222222222', 'Captain Dave Miller', '+1 (555) 876-5432', 'driver.dave@ambunet.org', 'driver', '{"license": "MED-DL-98401", "years_experience": 8}'::jsonb),
('33333333-3333-3333-3333-333333333333', 'Elena Rossi, RN', '+1 (555) 432-1098', 'hospital.elena@ambunet.org', 'hospital_staff', '{"department": "Emergency Trauma", "shift": "Day"}'::jsonb),
('44444444-4444-4444-4444-444444444444', 'Dispatch Commander Chief Sarah Lin', '+1 (555) 999-0000', 'admin.dispatch@ambunet.org', 'admin', '{"clearance_level": "Commander", "station": "Central EOC"}'::jsonb);

-- Insert Hospitals
INSERT INTO public.hospitals (id, name, address, lat, lng, contact_number, total_capacity) VALUES
('c1111111-1111-1111-1111-111111111111', 'Metro Central General Hospital', '1001 Potrero Ave, San Francisco, CA', 37.7558, -122.4048, '+1 (415) 206-8000', 60),
('c2222222-2222-2222-2222-222222222222', 'UCSF Medical Center & Trauma Unit', '505 Parnassus Ave, San Francisco, CA', 37.7631, -122.4580, '+1 (415) 476-1000', 80),
('c3333333-3333-3333-3333-333333333333', 'St. Mary Regional Heart & Burn Center', '450 Stanyan St, San Francisco, CA', 37.7735, -122.4533, '+1 (415) 668-1000', 45),
('c4444444-4444-4444-4444-444444444444', 'Bayview Emergency Health Center', '1450 Mendell St, San Francisco, CA', 37.7372, -122.3892, '+1 (415) 822-7500', 35),
('c5555555-5555-5555-5555-555555555555', 'Presidio LifeCare & Maternity Pavilion', '3601 California St, San Francisco, CA', 37.7865, -122.4528, '+1 (415) 600-6000', 50);

-- Insert Beds across Hospitals
-- Metro Central Beds
INSERT INTO public.beds (hospital_id, bed_number, bed_type, status) VALUES
('c1111111-1111-1111-1111-111111111111', 'ICU-101', 'ICU', 'available'),
('c1111111-1111-1111-1111-111111111111', 'ICU-102', 'ICU', 'occupied'),
('c1111111-1111-1111-1111-111111111111', 'ICU-103', 'ICU', 'available'),
('c1111111-1111-1111-1111-111111111111', 'TRM-201', 'Trauma', 'available'),
('c1111111-1111-1111-1111-111111111111', 'TRM-202', 'Trauma', 'available'),
('c1111111-1111-1111-1111-111111111111', 'GEN-301', 'General', 'available'),
('c1111111-1111-1111-1111-111111111111', 'GEN-302', 'General', 'occupied'),
('c1111111-1111-1111-1111-111111111111', 'MAT-401', 'Maternity', 'available');

-- UCSF Beds
INSERT INTO public.beds (hospital_id, bed_number, bed_type, status) VALUES
('c2222222-2222-2222-2222-222222222222', 'ICU-01', 'ICU', 'available'),
('c2222222-2222-2222-2222-222222222222', 'ICU-02', 'ICU', 'available'),
('c2222222-2222-2222-2222-222222222222', 'TRM-01', 'Trauma', 'available'),
('c2222222-2222-2222-2222-222222222222', 'TRM-02', 'Trauma', 'occupied'),
('c2222222-2222-2222-2222-222222222222', 'GEN-01', 'General', 'available'),
('c2222222-2222-2222-2222-222222222222', 'MAT-01', 'Maternity', 'available');

-- St. Mary Beds
INSERT INTO public.beds (hospital_id, bed_number, bed_type, status) VALUES
('c3333333-3333-3333-3333-333333333333', 'ICU-A', 'ICU', 'available'),
('c3333333-3333-3333-3333-333333333333', 'TRM-A', 'Trauma', 'available'),
('c3333333-3333-3333-3333-333333333333', 'GEN-A', 'General', 'available'),
('c3333333-3333-3333-3333-333333333333', 'GEN-B', 'General', 'available');

-- Bayview & Presidio Beds
INSERT INTO public.beds (hospital_id, bed_number, bed_type, status) VALUES
('c4444444-4444-4444-4444-444444444444', 'TRM-B1', 'Trauma', 'available'),
('c4444444-4444-4444-4444-444444444444', 'GEN-B1', 'General', 'available'),
('c5555555-5555-5555-5555-555555555555', 'MAT-P1', 'Maternity', 'available'),
('c5555555-5555-5555-5555-555555555555', 'MAT-P2', 'Maternity', 'available'),
('c5555555-5555-5555-5555-555555555555', 'ICU-P1', 'ICU', 'available');

-- Insert Ambulances
INSERT INTO public.ambulances (id, driver_id, driver_name, driver_phone, vehicle_number, current_lat, current_lng, status, hospital_id) VALUES
('a1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Captain Dave Miller', '+1 (555) 876-5432', 'AMB-901', 37.7749, -122.4194, 'idle', 'c1111111-1111-1111-1111-111111111111'),
('a2222222-2222-2222-2222-222222222222', NULL, 'Marcus Vance', '+1 (555) 765-4321', 'AMB-404', 37.7600, -122.4350, 'idle', 'c2222222-2222-2222-2222-222222222222'),
('a3333333-3333-3333-3333-333333333333', NULL, 'Sarah Jenkins', '+1 (555) 654-3210', 'AMB-772', 37.7890, -122.4080, 'idle', 'c3333333-3333-3333-3333-333333333333'),
('a4444444-4444-4444-4444-444444444444', NULL, 'Carlos Ortiz', '+1 (555) 543-2109', 'AMB-305', 37.7420, -122.4200, 'idle', 'c4444444-4444-4444-4444-444444444444'),
('a5555555-5555-5555-5555-555555555555', NULL, 'Rachel Kim', '+1 (555) 432-1098', 'AMB-118', 37.7800, -122.4650, 'idle', 'c5555555-5555-5555-5555-555555555555');

-- Create Sample Initial Emergency
INSERT INTO public.emergencies (
    id,
    patient_id,
    patient_name,
    patient_phone,
    patient_medical_profile,
    emergency_type,
    pickup_lat,
    pickup_lng,
    pickup_address,
    status
) VALUES (
    'e1111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'Alex Mercer',
    '+1 (555) 234-5678',
    '{"blood_group": "A+", "allergies": "Penicillin", "conditions": "Asthma"}'::jsonb,
    'cardiac',
    37.7680,
    -122.4270,
    'Market & Castro St, San Francisco, CA',
    'requested'
);

