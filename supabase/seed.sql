-- ==============================================================================
-- AMBUNET: Seed Data (Bangalore Emergency Response Ecosystem)
-- ==============================================================================

TRUNCATE TABLE public.simulation_runs CASCADE;
TRUNCATE TABLE public.zone_time_matrix CASCADE;
TRUNCATE TABLE public.demand_history CASCADE;
TRUNCATE TABLE public.traffic_factors CASCADE;
TRUNCATE TABLE public.dispatch_decisions CASCADE;
TRUNCATE TABLE public.emergency_status_log CASCADE;
TRUNCATE TABLE public.emergencies CASCADE;
TRUNCATE TABLE public.ambulances CASCADE;
TRUNCATE TABLE public.beds CASCADE;
TRUNCATE TABLE public.hospitals CASCADE;
TRUNCATE TABLE public.medical_profiles CASCADE;
TRUNCATE TABLE public.users CASCADE;
TRUNCATE TABLE public.zones CASCADE;

-- 1. BANGALORE ZONES (8 Key Traffic Hubs)
INSERT INTO public.zones (id, name, center_lat, center_lng) VALUES
('whitefield', 'Whitefield IT Corridor', 12.9698, 77.7499),
('electronic_city', 'Electronic City Tech Hub', 12.8452, 77.6602),
('hebbal', 'Hebbal Flyover & North Corridor', 13.0358, 77.5970),
('koramangala', 'Koramangala Commercial Zone', 12.9352, 77.6245),
('jayanagar', 'Jayanagar & South Suburbs', 12.9250, 77.5938),
('yeshwanthpur', 'Yeshwanthpur Industrial/Transit', 13.0285, 77.5455),
('central_majestic', 'Central & Majestic EOC', 12.9767, 77.5713),
('kr_puram', 'KR Puram Junction & East Belt', 13.0075, 77.6959);

-- 2. DEMO USERS
INSERT INTO public.users (id, name, email, phone, role) VALUES
('11111111-1111-1111-1111-111111111111', 'Rahul Sharma (Patient)', 'patient.demo@ambunet.in', '+919876543210', 'patient'),
('22222222-2222-2222-2222-222222222222', 'Suresh Kumar (Driver)', 'driver.demo@ambunet.in', '+919876543211', 'driver'),
('33333333-3333-3333-3333-333333333333', 'Dr. Ananya Rao (Hospital Staff)', 'hospital.demo@ambunet.in', '+919876543212', 'hospital_staff'),
('44444444-4444-4444-4444-444444444444', 'Commander Vikram Singh (Admin)', 'admin.demo@ambunet.in', '+919876543213', 'admin');

-- 3. MEDICAL PROFILES
INSERT INTO public.medical_profiles (user_id, blood_group, allergies, conditions, emergency_contact) VALUES
('11111111-1111-1111-1111-111111111111', 'O+', 'Penicillin', 'Asthma, Hypertension', 'Priya Sharma (+91 9876543219)');

-- 4. REAL BANGALORE HOSPITALS (Simulated Bed Counts Labeled)
INSERT INTO public.hospitals (id, name, address, lat, lng, contact, specialties, zone_id) VALUES
('h1000000-0000-0000-0000-000000000001', 'Victoria Hospital (BMCRI)', 'Fort Road, Near City Market, Kalasipalyam, Bengaluru', 12.9634, 77.5753, '+91 80 2670 1150', ARRAY['Trauma', 'Burn', 'ICU', 'General Emergency'], 'central_majestic'),
('h1000000-0000-0000-0000-000000000002', 'Bowring & Lady Curzon Hospital', 'Lady Curzon Rd, Shivaji Nagar, Bengaluru', 12.9835, 77.6015, '+91 80 2559 1325', ARRAY['General Emergency', 'Maternity', 'ICU'], 'central_majestic'),
('h1000000-0000-0000-0000-000000000003', 'NIMHANS Neuro & Trauma Center', 'Hosur Road, Lakkasandra, Bengaluru', 12.9392, 77.5959, '+91 80 2699 5000', ARRAY['Neurology', 'Trauma', 'ICU'], 'jayanagar'),
('h1000000-0000-0000-0000-000000000004', 'St. Johns Medical College Hospital', 'Sarjapur Main Rd, John Nagar, Koramangala, Bengaluru', 12.9304, 77.6200, '+91 80 2206 5000', ARRAY['Trauma', 'Cardiac', 'ICU', 'General Emergency'], 'koramangala'),
('h1000000-0000-0000-0000-000000000005', 'Manipal Hospital Old Airport Road', '98 HAL Old Airport Rd, Kodihalli, Bengaluru', 12.9577, 77.6475, '+91 80 2502 4444', ARRAY['Cardiac', 'Stroke', 'ICU', 'Trauma'], 'koramangala'),
('h1000000-0000-0000-0000-000000000006', 'Narayana Health City', '258/A, Bommasandra Industrial Area, Anekal, Bengaluru', 12.8123, 77.6895, '+91 80 7122 2222', ARRAY['Cardiac', 'Trauma', 'Burn', 'ICU'], 'electronic_city'),
('h1000000-0000-0000-0000-000000000007', 'Manipal Hospital Hebbal (Columbia Asia)', 'Bellary Rd, Near Hebbal Flyover, Bengaluru', 13.0478, 77.5926, '+91 80 4179 1000', ARRAY['Trauma', 'General Emergency', 'ICU'], 'hebbal'),
('h1000000-0000-0000-0000-000000000008', 'Sakra World Hospital', 'SY NO 52/2 & 52/3, Devarabeesanahalli, Marathahalli ORR, Bengaluru', 12.9284, 77.6836, '+91 80 4969 4969', ARRAY['Trauma', 'Stroke', 'ICU', 'Cardiac'], 'whitefield'),
('h1000000-0000-0000-0000-000000000009', 'Fortis Hospital Bannerghatta Road',154/9, Bannerghatta Main Rd, Opposite IIMB, Bengaluru', 12.8943, 77.5985, '+91 80 6621 4444', ARRAY['Cardiac', 'Trauma', 'ICU'], 'jayanagar'),
('h1000000-0000-0000-0000-000000000010', 'Apollo Hospitals Bannerghatta', '154/11, Bannerghatta Main Rd, Opposite IIMB, Bengaluru', 12.8958, 77.5988, '+91 80 2630 4050', ARRAY['Cardiac', 'Maternity', 'ICU', 'Burn'], 'jayanagar');

-- 5. BEDS (Simulated Statuses)
INSERT INTO public.beds (hospital_id, bed_number, bed_type, status) VALUES
-- Victoria Hospital
('h1000000-0000-0000-0000-000000000001', 'VIC-ICU-01', 'ICU', 'available'),
('h1000000-0000-0000-0000-000000000001', 'VIC-ICU-02', 'ICU', 'occupied'),
('h1000000-0000-0000-0000-000000000001', 'VIC-TRM-01', 'Trauma', 'available'),
('h1000000-0000-0000-0000-000000000001', 'VIC-GEN-01', 'General', 'available'),
-- Bowring Hospital
('h1000000-0000-0000-0000-000000000002', 'BOW-MAT-01', 'Maternity', 'available'),
('h1000000-0000-0000-0000-000000000002', 'BOW-GEN-01', 'General', 'available'),
-- NIMHANS
('h1000000-0000-0000-0000-000000000003', 'NIM-ICU-01', 'ICU', 'available'),
('h1000000-0000-0000-0000-000000000003', 'NIM-TRM-01', 'Trauma', 'available'),
-- St. Johns
('h1000000-0000-0000-0000-000000000004', 'STJ-ICU-01', 'ICU', 'available'),
('h1000000-0000-0000-0000-000000000004', 'STJ-TRM-01', 'Trauma', 'available'),
('h1000000-0000-0000-0000-000000000004', 'STJ-GEN-01', 'General', 'available'),
-- Manipal Old Airport Rd
('h1000000-0000-0000-0000-000000000005', 'MNP-ICU-01', 'ICU', 'available'),
('h1000000-0000-0000-0000-000000000005', 'MNP-TRM-01', 'Trauma', 'available'),
-- Narayana Health
('h1000000-0000-0000-0000-000000000006', 'NH-ICU-01', 'ICU', 'available'),
('h1000000-0000-0000-0000-000000000006', 'NH-TRM-01', 'Trauma', 'available'),
-- Sakra
('h1000000-0000-0000-0000-000000000008', 'SKR-ICU-01', 'ICU', 'available'),
('h1000000-0000-0000-0000-000000000008', 'SKR-TRM-01', 'Trauma', 'available'),
-- Fortis & Apollo
('h1000000-0000-0000-0000-000000000009', 'FOR-ICU-01', 'ICU', 'available'),
('h1000000-0000-0000-0000-000000000010', 'APO-ICU-01', 'ICU', 'available');

-- 6. DEMO AMBULANCES (14 units stationed across Bangalore zones)
INSERT INTO public.ambulances (id, driver_id, driver_name, vehicle_number, current_lat, current_lng, status, standby_zone_id, hospital_id) VALUES
('a1000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Suresh Kumar', 'KA-01-EA-1008', 12.9715, 77.5735, 'idle', 'central_majestic', 'h1000000-0000-0000-0000-000000000001'),
('a1000000-0000-0000-0000-000000000002', NULL, 'Ramesh Gowda', 'KA-05-EM-9090', 12.9350, 77.6210, 'idle', 'koramangala', 'h1000000-0000-0000-0000-000000000004'),
('a1000000-0000-0000-0000-000000000003', NULL, 'Venkatesh Prasad', 'KA-03-EM-4040', 12.9720, 77.7450, 'idle', 'whitefield', 'h1000000-0000-0000-0000-000000000008'),
('a1000000-0000-0000-0000-000000000004', NULL, 'Mohammed Aslam', 'KA-51-EM-3030', 12.8480, 77.6630, 'idle', 'electronic_city', 'h1000000-0000-0000-0000-000000000006'),
('a1000000-0000-0000-0000-000000000005', NULL, 'Manjunath B', 'KA-04-EM-7070', 13.0380, 77.5990, 'idle', 'hebbal', 'h1000000-0000-0000-0000-000000000007'),
('a1000000-0000-0000-0000-000000000006', NULL, 'Prakash Reddy', 'KA-05-EM-1122', 12.9230, 77.5910, 'idle', 'jayanagar', 'h1000000-0000-0000-0000-000000000003'),
('a1000000-0000-0000-0000-000000000007', NULL, 'Sunil Naidu', 'KA-02-EM-5544', 13.0290, 77.5480, 'idle', 'yeshwanthpur', NULL),
('a1000000-0000-0000-0000-000000000008', NULL, 'Ganesh Bhat', 'KA-53-EM-8877', 13.0100, 77.6980, 'idle', 'kr_puram', NULL),
('a1000000-0000-0000-0000-000000000009', NULL, 'Dharmendra Yadav', 'KA-01-EM-9900', 12.9560, 77.6490, 'idle', 'koramangala', 'h1000000-0000-0000-0000-000000000005'),
('a1000000-0000-0000-0000-000000000010', NULL, 'Shiva Kumar', 'KA-03-EM-1234', 12.9640, 77.7520, 'idle', 'whitefield', NULL),
('a1000000-0000-0000-0000-000000000011', NULL, 'Kiran Hegde', 'KA-51-EM-5678', 12.8420, 77.6580, 'idle', 'electronic_city', NULL),
('a1000000-0000-0000-0000-000000000012', NULL, 'Syed Imran', 'KA-04-EM-9101', 13.0320, 77.5940, 'idle', 'hebbal', NULL);

-- 7. INITIAL SYNTHETIC TRAFFIC FACTORS (Bangalore Traffic Peaks)
-- Peak hours: 8-11 AM (8-10) and 5-9 PM (17-20) in Silk Board (koramangala/electronic_city), Hebbal, KR Puram
INSERT INTO public.traffic_factors (zone_id, hour_bucket, daytype, multiplier, samples) VALUES
('kr_puram', 9, 'weekday', 2.1, 50),
('kr_puram', 18, 'weekday', 2.3, 50),
('koramangala', 9, 'weekday', 1.9, 45),
('koramangala', 18, 'weekday', 2.2, 45),
('hebbal', 9, 'weekday', 1.8, 40),
('hebbal', 18, 'weekday', 2.0, 40),
('whitefield', 9, 'weekday', 1.85, 38),
('whitefield', 18, 'weekday', 2.1, 38),
('electronic_city', 9, 'weekday', 1.75, 35),
('electronic_city', 18, 'weekday', 1.95, 35),
('central_majestic', 10, 'weekday', 1.6, 60),
('jayanagar', 17, 'weekday', 1.5, 40),
('yeshwanthpur', 9, 'weekday', 1.45, 30);

-- 8. SYNTHETIC DEMAND HISTORY SEED DATA (Labeled Synthetic)
INSERT INTO public.demand_history (zone_id, hour, weekday, count) VALUES
('whitefield', 9, 1, 12), ('whitefield', 18, 1, 15),
('electronic_city', 9, 1, 10), ('electronic_city', 18, 1, 14),
('koramangala', 12, 5, 18), ('koramangala', 20, 5, 22),
('central_majestic', 10, 2, 16), ('central_majestic', 17, 2, 19),
('hebbal', 8, 1, 11), ('hebbal', 19, 1, 13),
('kr_puram', 9, 3, 14), ('kr_puram', 18, 3, 17);
