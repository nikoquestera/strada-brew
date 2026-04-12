-- Table for storing abnormal transactions that need finance review
CREATE TABLE IF NOT EXISTS abnormal_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_date DATE NOT NULL,
    report_type TEXT NOT NULL,
    store_name TEXT NOT NULL,
    issue_description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    resolution_notes TEXT,
    resolved_by TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(store_name, transaction_date, report_type)
);

CREATE INDEX IF NOT EXISTS idx_abnormal_transactions_status ON abnormal_transactions(status);
CREATE INDEX IF NOT EXISTS idx_abnormal_transactions_date ON abnormal_transactions(transaction_date);

ALTER TABLE abnormal_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read abnormal_transactions for authenticated users" ON abnormal_transactions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert abnormal_transactions for authenticated users" ON abnormal_transactions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update abnormal_transactions for authenticated users" ON abnormal_transactions
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow delete abnormal_transactions for authenticated users" ON abnormal_transactions
    FOR DELETE USING (auth.role() = 'authenticated');
