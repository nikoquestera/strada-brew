-- Add CV URL to applicants table
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS cv_url TEXT;

-- Link employees back to their original applicant record
ALTER TABLE employees ADD COLUMN IF NOT EXISTS applicant_id UUID REFERENCES applicants(id);

-- Create CVs storage bucket (public read)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('cvs', 'cvs', true, 10485760, ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/jpeg','image/png'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
DROP POLICY IF EXISTS "Public can read cvs" ON storage.objects;
CREATE POLICY "Public can read cvs" ON storage.objects
  FOR SELECT USING (bucket_id = 'cvs');

DROP POLICY IF EXISTS "Anon can upload cvs" ON storage.objects;
CREATE POLICY "Anon can upload cvs" ON storage.objects
  FOR INSERT TO anon WITH CHECK (bucket_id = 'cvs');

DROP POLICY IF EXISTS "Authenticated can upload cvs" ON storage.objects;
CREATE POLICY "Authenticated can upload cvs" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'cvs');

DROP POLICY IF EXISTS "Authenticated can update cvs" ON storage.objects;
CREATE POLICY "Authenticated can update cvs" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'cvs');

DROP POLICY IF EXISTS "Authenticated can delete cvs" ON storage.objects;
CREATE POLICY "Authenticated can delete cvs" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'cvs');

-- RLS on applicants: allow anon to update cv_url (for apply form)
DROP POLICY IF EXISTS "Anon can update cv_url on applicants" ON applicants;
CREATE POLICY "Anon can update cv_url on applicants" ON applicants
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
