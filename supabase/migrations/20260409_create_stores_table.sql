-- Centralized stores/outlets master data
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stores_active_sort ON stores(is_active, sort_order, name);

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read stores for authenticated users" ON stores
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert stores for service role" ON stores
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Allow update stores for service role" ON stores
    FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "Allow delete stores for service role" ON stores
    FOR DELETE USING (auth.role() = 'service_role');

INSERT INTO stores (name, sort_order)
VALUES
    ('LA.PIAZZA', 10),
    ('MKG', 20),
    ('SMB', 30),
    ('SMB GOLD LOUNGE', 40),
    ('SMS', 50)
ON CONFLICT (name) DO NOTHING;

