-- Add missing column that personalia form submit uses
ALTER TABLE employees ADD COLUMN IF NOT EXISTS happiest_workplace TEXT;

-- Ensure anon/public can do all operations on employees (already covered by existing policy but be explicit)
-- The "HRD full access - employees" policy for {public} already covers this.
-- Nothing more needed for RLS.
