-- Add bank and payment fields to revenue_reports table
-- This migration adds fields for BCA, Gobiz, and calculated fee fields

ALTER TABLE revenue_reports ADD COLUMN IF NOT EXISTS bca_income DECIMAL(15, 2);
ALTER TABLE revenue_reports ADD COLUMN IF NOT EXISTS gobiz_income DECIMAL(15, 2);
ALTER TABLE revenue_reports ADD COLUMN IF NOT EXISTS payment_credit_bca DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE revenue_reports ADD COLUMN IF NOT EXISTS payment_debit_bca DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE revenue_reports ADD COLUMN IF NOT EXISTS payment_qris DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE revenue_reports ADD COLUMN IF NOT EXISTS piutang_gobiz DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE revenue_reports ADD COLUMN IF NOT EXISTS biaya_admin_bank DECIMAL(15, 2);
ALTER TABLE revenue_reports ADD COLUMN IF NOT EXISTS biaya_penjualan_merchant_online DECIMAL(15, 2);

-- Add comments for clarity
COMMENT ON COLUMN revenue_reports.bca_income IS 'Uang Masuk Bank BCA - from bank statement';
COMMENT ON COLUMN revenue_reports.gobiz_income IS 'Uang Masuk Gobiz - from Gobiz statement';
COMMENT ON COLUMN revenue_reports.payment_credit_bca IS 'Credit card payments via BCA';
COMMENT ON COLUMN revenue_reports.payment_debit_bca IS 'Debit card payments via BCA';
COMMENT ON COLUMN revenue_reports.payment_qris IS 'QRIS payments';
COMMENT ON COLUMN revenue_reports.piutang_gobiz IS 'Gobiz outstanding/debt';
COMMENT ON COLUMN revenue_reports.biaya_admin_bank IS 'Calculated: (Payment Credit BCA + Payment Debit BCA + Payment QRIS) - BCA Income';
COMMENT ON COLUMN revenue_reports.biaya_penjualan_merchant_online IS 'Calculated: Piutang Gobiz - Gobiz Income';
