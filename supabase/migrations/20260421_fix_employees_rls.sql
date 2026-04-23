-- Ensure employees table is readable by HRD/authenticated users
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated select for employees" ON employees;
CREATE POLICY "Allow authenticated select for employees"
ON employees FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated update for employees" ON employees;
CREATE POLICY "Allow authenticated update for employees"
ON employees FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Ensure id_number and identity_number stay in sync if possible
-- but at least allow updates to both.
