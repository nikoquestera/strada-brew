-- Fix RLS for public applicant submission
ALTER TABLE applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE applicant_quest_scores ENABLE ROW LEVEL SECURITY;

-- Allow unauthenticated (public) users to submit applications
DROP POLICY IF EXISTS "Allow public insert for applicants" ON applicants;
CREATE POLICY "Allow public insert for applicants" 
ON applicants FOR INSERT 
TO anon 
WITH CHECK (true);

-- Allow unauthenticated (public) users to insert initial score records (pending status)
DROP POLICY IF EXISTS "Allow public insert for quest_scores" ON applicant_quest_scores;
CREATE POLICY "Allow public insert for quest_scores" 
ON applicant_quest_scores FOR INSERT 
TO anon 
WITH CHECK (true);

-- Ensure authenticated users (HRD) can read all applicants
DROP POLICY IF EXISTS "Allow authenticated read for applicants" ON applicants;
CREATE POLICY "Allow authenticated read for applicants" 
ON applicants FOR SELECT 
TO authenticated 
USING (true);

-- Ensure authenticated users (HRD) can update applicants (for status changes)
DROP POLICY IF EXISTS "Allow authenticated update for applicants" ON applicants;
CREATE POLICY "Allow authenticated update for applicants" 
ON applicants FOR UPDATE 
TO authenticated 
USING (true);

-- Ensure authenticated users can read quest scores
DROP POLICY IF EXISTS "Allow authenticated read for quest_scores" ON applicant_quest_scores;
CREATE POLICY "Allow authenticated read for quest_scores" 
ON applicant_quest_scores FOR SELECT 
TO authenticated 
USING (true);

-- Ensure authenticated users can update/insert quest scores (AI processing)
DROP POLICY IF EXISTS "Allow authenticated write for quest_scores" ON applicant_quest_scores;
CREATE POLICY "Allow authenticated write for quest_scores" 
ON applicant_quest_scores FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);
