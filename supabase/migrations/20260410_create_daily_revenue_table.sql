-- Table for storing daily revenue reports from Quinos Cloud
CREATE TABLE IF NOT EXISTS daily_revenue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_name TEXT NOT NULL,
    transaction_date DATE NOT NULL,
    penjualan_bar NUMERIC DEFAULT 0,
    penjualan_coffee_beans NUMERIC DEFAULT 0,
    penjualan_makanan NUMERIC DEFAULT 0,
    penjualan_konsinyasi NUMERIC DEFAULT 0,
    payment_academy_100_vouc NUMERIC DEFAULT 0,
    payment_credit_bca NUMERIC DEFAULT 0,
    payment_debit_bca NUMERIC DEFAULT 0,
    payment_gobiz NUMERIC DEFAULT 0,
    payment_qris NUMERIC DEFAULT 0,
    payment_strada_reward NUMERIC DEFAULT 0,
    revenue_discount NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(store_name, transaction_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_revenue_date ON daily_revenue(transaction_date);
CREATE INDEX IF NOT EXISTS idx_daily_revenue_store ON daily_revenue(store_name);

ALTER TABLE daily_revenue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read daily_revenue for authenticated users" ON daily_revenue
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert daily_revenue for service role" ON daily_revenue
    FOR INSERT WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'authenticated');

CREATE POLICY "Allow update daily_revenue for service role" ON daily_revenue
    FOR UPDATE USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

CREATE POLICY "Allow delete daily_revenue for service role" ON daily_revenue
    FOR DELETE USING (auth.role() = 'service_role');
