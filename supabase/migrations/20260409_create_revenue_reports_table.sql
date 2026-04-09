-- Create revenue_reports table for Finance module
CREATE TABLE IF NOT EXISTS revenue_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    store_name VARCHAR(255) NOT NULL,
    bar_sales DECIMAL(15, 2),
    coffee_beans_sales DECIMAL(15, 2),
    kitchen_sales DECIMAL(15, 2),
    konsinyasi_sales DECIMAL(15, 2),
    total_sales DECIMAL(15, 2),
    raw_json JSONB NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_revenue_reports_date_store ON revenue_reports(date, store_name);
CREATE INDEX IF NOT EXISTS idx_revenue_reports_created_at ON revenue_reports(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE revenue_reports ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read
CREATE POLICY "Allow read revenue reports" ON revenue_reports
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create policy to allow service role to insert/update
CREATE POLICY "Allow insert revenue reports" ON revenue_reports
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Allow update revenue reports" ON revenue_reports
    FOR UPDATE USING (auth.role() = 'service_role');
