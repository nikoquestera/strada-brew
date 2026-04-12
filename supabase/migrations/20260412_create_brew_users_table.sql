-- Table for storing BREW user profiles and roles
CREATE TABLE IF NOT EXISTS brew_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'HRD', -- 'FINANCE' or 'HRD'
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE brew_users ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow read brew_users for authenticated users" ON brew_users
    FOR SELECT USING (auth.role() = 'authenticated');

-- Insert initial users
INSERT INTO brew_users (email, full_name, role)
VALUES 
    ('selena@stradacoffee.com', 'Selena', 'finance'),
    ('clara@stradacoffee.com', 'Clara', 'finance'),
    ('cipta@stradacoffee.com', 'Cipta', 'finance')
ON CONFLICT (email) DO UPDATE SET 
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;
