-- Add extensive columns to employees table based on DATA PERSONALIA form
ALTER TABLE employees ADD COLUMN IF NOT EXISTS nickname TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS birth_place TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS religion TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS blood_type TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS identity_number TEXT; -- KTP/SIM
ALTER TABLE employees ADD COLUMN IF NOT EXISTS address_ktp TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS address_domicile TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS home_phone TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS postal_code TEXT;

-- Family Status
ALTER TABLE employees ADD COLUMN IF NOT EXISTS marital_status TEXT; -- Bujangan/Bertunangan/Menikah/Bercerai
ALTER TABLE employees ADD COLUMN IF NOT EXISTS marital_since DATE;

-- Family Data (JSONB for flexibility)
-- [ {name, gender, birth_date, education, occupation, relation} ]
ALTER TABLE employees ADD COLUMN IF NOT EXISTS family_data JSONB DEFAULT '[]'::jsonb;

-- Housing & Transport
ALTER TABLE employees ADD COLUMN IF NOT EXISTS housing_status TEXT; -- Rumah pribadi, Orang Tua, Kontrak, Sewa, Kost, dll
ALTER TABLE employees ADD COLUMN IF NOT EXISTS vehicle_used TEXT; -- Mobil, Motor, Kendaraan Umum

-- Education History (JSONB)
-- [ {level, school_name, major, city, graduation_year} ]
ALTER TABLE employees ADD COLUMN IF NOT EXISTS education_history JSONB DEFAULT '[]'::jsonb;

-- Languages (JSONB)
-- [ {language, spoken_level, written_level} ]
ALTER TABLE employees ADD COLUMN IF NOT EXISTS language_skills JSONB DEFAULT '[]'::jsonb;

-- Courses/Training (JSONB)
-- [ {name, location, duration, year, description} ]
ALTER TABLE employees ADD COLUMN IF NOT EXISTS training_history JSONB DEFAULT '[]'::jsonb;

-- Work Experience (JSONB)
-- [ {company_name, duration, position, salary, reason_for_leaving} ]
ALTER TABLE employees ADD COLUMN IF NOT EXISTS work_history JSONB DEFAULT '[]'::jsonb;

-- Financial / Official IDs
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bpjs_kesehatan_number TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bpjs_ketenagakerjaan_number TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS npwp_number TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_account_name TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS expected_salary TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS happiest_workplace_reason TEXT;

-- Preferences & Interests
ALTER TABLE employees ADD COLUMN IF NOT EXISTS favorite_work_environment TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS job_interests JSONB DEFAULT '[]'::jsonb; -- {type, rank}
ALTER TABLE employees ADD COLUMN IF NOT EXISTS expected_facilities TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS willing_to_be_relocated BOOLEAN;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS relocation_refusal_reason TEXT;

-- Social Activities
ALTER TABLE employees ADD COLUMN IF NOT EXISTS social_sports TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS social_hobbies TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS social_organizations TEXT;

-- References (JSONB)
-- [ {name, address, phone, relationship} ]
ALTER TABLE employees ADD COLUMN IF NOT EXISTS references_data JSONB DEFAULT '[]'::jsonb;

-- Emergency Contacts / Internal Relations
-- [ {name, position, relationship} ]
ALTER TABLE employees ADD COLUMN IF NOT EXISTS internal_relations JSONB DEFAULT '[]'::jsonb;

-- Medical & Psychological
-- [ {hospital, year, duration, reason} ]
ALTER TABLE employees ADD COLUMN IF NOT EXISTS medical_history JSONB DEFAULT '[]'::jsonb;
-- [ {place, year, purpose} ]
ALTER TABLE employees ADD COLUMN IF NOT EXISTS psychotest_history JSONB DEFAULT '[]'::jsonb;

-- Self Description
ALTER TABLE employees ADD COLUMN IF NOT EXISTS self_description TEXT;

-- Personalia Session Table
CREATE TABLE IF NOT EXISTS personalia_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    applicant_id UUID NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
    access_code TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
    form_data JSONB
);

-- RLS for personalia_sessions
ALTER TABLE personalia_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access to personalia_sessions" ON personalia_sessions;
CREATE POLICY "Allow authenticated full access to personalia_sessions" 
ON personalia_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select for personalia_sessions" ON personalia_sessions;
CREATE POLICY "Allow public select for personalia_sessions" 
ON personalia_sessions FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow public update for personalia_sessions" ON personalia_sessions;
CREATE POLICY "Allow public update for personalia_sessions" 
ON personalia_sessions FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Ensure employees table RLS allows insertions from API
DROP POLICY IF EXISTS "Allow service role insert for employees" ON employees;
CREATE POLICY "Allow service role insert for employees"
ON employees FOR INSERT TO authenticated WITH CHECK (true);
