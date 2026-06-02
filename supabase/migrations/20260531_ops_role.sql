-- Add ops_manager and other newer roles to brew_users check constraint
ALTER TABLE brew_users DROP CONSTRAINT IF EXISTS brew_users_role_check;
ALTER TABLE brew_users ADD CONSTRAINT brew_users_role_check
  CHECK (role IN ('hrd','ops_manager','finance','warehouse','purchasing','admin','roastery','purchasing_approver'));

-- Create Rinda's brew_users row (run after creating the auth user)
INSERT INTO brew_users (id, email, role, full_name, created_at)
VALUES ('440bf86a-0a71-4e29-bc51-bcdd46636159', 'rinda@stradacoffee.com', 'ops_manager', 'Rinda', now())
ON CONFLICT (email) DO UPDATE SET role = 'ops_manager', full_name = 'Rinda';
