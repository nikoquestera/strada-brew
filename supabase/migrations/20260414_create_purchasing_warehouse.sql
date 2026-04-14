-- ============================================================
-- PURCHASING & WAREHOUSE MODULE
-- Migration: 20260414_create_purchasing_warehouse.sql
-- ============================================================

-- 1. OUTLETS (store reference)
CREATE TABLE IF NOT EXISTS outlets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode TEXT UNIQUE NOT NULL,
  nama TEXT NOT NULL,
  tipe TEXT DEFAULT 'cafe',   -- 'cafe' | 'roastery' | 'hq'
  aktif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO outlets (kode, nama, tipe) VALUES
  ('LPZ', 'La Piazza Kelapa Gading', 'cafe'),
  ('MKG', 'Mall Kelapa Gading', 'cafe'),
  ('BSD', 'BSD Serpong', 'cafe'),
  ('SMS', 'Summarecon Serpong', 'cafe'),
  ('SMB', 'Summarecon Bekasi', 'cafe'),
  ('SMB-GL', 'SMB Gold Lounge', 'cafe'),
  ('SMG', 'Semarang', 'cafe'),
  ('RST', 'Roastery Hibrida', 'roastery'),
  ('HO', 'Head Office Hibrida', 'hq')
ON CONFLICT (kode) DO NOTHING;

-- 2. VENDORS
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode TEXT UNIQUE NOT NULL,
  nama TEXT NOT NULL,
  kategori TEXT NOT NULL,   -- 'fresh' | 'dry_goods' | 'packaging' | 'frozen' | 'roastery' | 'other'
  kontak_nama TEXT,
  kontak_wa TEXT,
  kontak_email TEXT,
  outlet_khusus TEXT[],     -- NULL = all outlets; filled = outlet-specific
  aktif BOOLEAN DEFAULT true,
  catatan TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. ITEM MASTER
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_accurate TEXT UNIQUE NOT NULL,
  kode_quinos TEXT,
  nama TEXT NOT NULL,
  kategori TEXT NOT NULL,
  tipe TEXT NOT NULL,       -- 'fresh' | 'dry_goods' | 'frozen' | 'packaging' | 'roastery' | 'other'
  satuan TEXT NOT NULL,
  satuan2 TEXT,
  rasio_satuan2 NUMERIC,
  par_stock_override NUMERIC,
  gudang_sumber TEXT DEFAULT 'aaron',  -- 'aaron' | 'ndah' | 'direct_vendor'
  vendor_id UUID REFERENCES vendors(id),
  aktif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. KAMUS HARGA
CREATE TABLE IF NOT EXISTS kamus_harga (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id),
  harga_beli NUMERIC NOT NULL,
  satuan TEXT NOT NULL,
  berlaku_dari DATE NOT NULL,
  berlaku_sampai DATE,
  sumber TEXT DEFAULT 'manual',  -- 'manual' | 'pdf_import' | 'api'
  catatan TEXT,
  created_by UUID REFERENCES brew_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(item_id, vendor_id, outlet_id, berlaku_dari)
);

-- View: current active price per item per vendor
CREATE OR REPLACE VIEW kamus_harga_aktif AS
SELECT DISTINCT ON (kh.item_id, kh.vendor_id, kh.outlet_id)
  kh.*,
  i.nama AS nama_item,
  i.kode_accurate,
  i.kategori AS kategori_item,
  v.nama AS nama_vendor
FROM kamus_harga kh
JOIN items i ON i.id = kh.item_id
JOIN vendors v ON v.id = kh.vendor_id
WHERE (kh.berlaku_sampai IS NULL OR kh.berlaku_sampai >= CURRENT_DATE)
ORDER BY kh.item_id, kh.vendor_id, kh.outlet_id, kh.berlaku_dari DESC;

-- 5. PURCHASE REQUESTS
CREATE TABLE IF NOT EXISTS purchase_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor TEXT UNIQUE NOT NULL,
  outlet_id UUID NOT NULL REFERENCES outlets(id),
  tanggal_permintaan DATE NOT NULL DEFAULT CURRENT_DATE,
  tanggal_dibutuhkan DATE NOT NULL,
  sumber TEXT NOT NULL DEFAULT 'manual',  -- 'manual' | 'quinos_pdf' | 'auto_parstock'
  status TEXT NOT NULL DEFAULT 'draft',   -- 'draft' | 'reviewed' | 'converted' | 'cancelled'
  catatan TEXT,
  quinos_pdf_url TEXT,
  created_by UUID REFERENCES brew_users(id),
  reviewed_by UUID REFERENCES brew_users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. PURCHASE REQUEST LINES
CREATE TABLE IF NOT EXISTS purchase_request_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_id UUID NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id),
  qty_diminta NUMERIC NOT NULL,
  satuan TEXT NOT NULL,
  qty_disetujui NUMERIC,
  catatan TEXT,
  tipe TEXT NOT NULL,        -- 'fresh' | 'dry_goods' | 'frozen' | 'packaging' | 'roastery'
  gudang_sumber TEXT,        -- 'aaron' | 'ndah' | 'direct_vendor'
  po_id UUID,                -- FK added below after purchase_orders is created
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. PURCHASE ORDERS
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor TEXT UNIQUE NOT NULL,
  outlet_id UUID NOT NULL REFERENCES outlets(id),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  tipe TEXT NOT NULL,        -- 'fresh' | 'dry_goods' | 'frozen' | 'packaging' | 'roastery'
  tanggal_po DATE NOT NULL DEFAULT CURRENT_DATE,
  tanggal_dibutuhkan DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  -- 'draft' | 'pending_approval' | 'approved' | 'sent_vendor' | 'partial_received' | 'fully_received' | 'cancelled'
  total_nilai NUMERIC,
  catatan TEXT,
  pr_id UUID REFERENCES purchase_requests(id),
  accurate_po_number TEXT,
  created_by UUID REFERENCES brew_users(id),
  approved_by UUID REFERENCES brew_users(id),
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add FK back from purchase_request_lines to purchase_orders
ALTER TABLE purchase_request_lines
  ADD CONSTRAINT fk_prl_po FOREIGN KEY (po_id) REFERENCES purchase_orders(id);

-- 8. PO LINES
CREATE TABLE IF NOT EXISTS purchase_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id),
  qty_order NUMERIC NOT NULL,
  satuan TEXT NOT NULL,
  harga_satuan NUMERIC NOT NULL,
  total_harga NUMERIC GENERATED ALWAYS AS (qty_order * harga_satuan) STORED,
  qty_received NUMERIC DEFAULT 0,
  catatan TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. GOODS RECEIPTS
CREATE TABLE IF NOT EXISTS goods_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor TEXT UNIQUE NOT NULL,
  po_id UUID NOT NULL REFERENCES purchase_orders(id),
  outlet_id UUID NOT NULL REFERENCES outlets(id),
  tanggal_terima DATE NOT NULL DEFAULT CURRENT_DATE,
  penerima TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  -- 'draft' | 'verified' | 'discrepancy' | 'finalized'
  surat_jalan_url TEXT,
  surat_jalan_nomor TEXT,
  invoice_nomor TEXT,
  catatan TEXT,
  discrepancy_notes TEXT,
  created_by UUID REFERENCES brew_users(id),
  verified_by UUID REFERENCES brew_users(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. GR LINES
CREATE TABLE IF NOT EXISTS goods_receipt_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gr_id UUID NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  po_line_id UUID NOT NULL REFERENCES purchase_order_lines(id),
  item_id UUID NOT NULL REFERENCES items(id),
  qty_diterima NUMERIC NOT NULL,
  satuan TEXT NOT NULL,
  harga_aktual NUMERIC NOT NULL,
  total_aktual NUMERIC GENERATED ALWAYS AS (qty_diterima * harga_aktual) STORED,
  alasan_selisih TEXT,
  catatan TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. WAREHOUSE STOCK
CREATE TABLE IF NOT EXISTS warehouse_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id),
  gudang TEXT NOT NULL,  -- 'aaron' | 'ndah'
  qty_saat_ini NUMERIC NOT NULL DEFAULT 0,
  satuan TEXT NOT NULL,
  par_stock_calculated NUMERIC,
  par_stock_effective NUMERIC,
  is_below_par BOOLEAN GENERATED ALWAYS AS (qty_saat_ini < COALESCE(par_stock_calculated, 0)) STORED,
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(item_id, gudang)
);

-- 12. PAR STOCK AGENT LOG
CREATE TABLE IF NOT EXISTS parstock_agent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  item_id UUID NOT NULL REFERENCES items(id),
  gudang TEXT NOT NULL,
  window_days INTEGER NOT NULL,
  avg_usage_per_day NUMERIC,
  par_stock_calculated NUMERIC,
  qty_at_time_of_check NUMERIC,
  action_taken TEXT,  -- 'pr_created' | 'skipped_inactive' | 'skipped_sufficient'
  pr_id UUID REFERENCES purchase_requests(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. PRICE LIST IMPORTS
CREATE TABLE IF NOT EXISTS price_list_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  berlaku_dari DATE NOT NULL,
  pdf_url TEXT,
  total_items_in_file INTEGER,
  total_items_matched INTEGER,
  total_items_unmatched INTEGER,
  items_unmatched JSONB,
  status TEXT DEFAULT 'pending',  -- 'pending' | 'partial' | 'applied' | 'rejected'
  applied_by UUID REFERENCES brew_users(id),
  applied_at TIMESTAMPTZ,
  created_by UUID REFERENCES brew_users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. PURCHASING AUDIT LOG
CREATE TABLE IF NOT EXISTS purchasing_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabel TEXT NOT NULL,
  record_id UUID NOT NULL,
  aksi TEXT NOT NULL,  -- 'create' | 'update' | 'approve' | 'cancel' | 'override'
  field_berubah TEXT,
  nilai_lama JSONB,
  nilai_baru JSONB,
  dilakukan_oleh UUID REFERENCES brew_users(id),
  alasan TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_outlet ON purchase_orders(outlet_id);
CREATE INDEX IF NOT EXISTS idx_po_tanggal ON purchase_orders(tanggal_po);
CREATE INDEX IF NOT EXISTS idx_pr_status ON purchase_requests(status);
CREATE INDEX IF NOT EXISTS idx_gr_po ON goods_receipts(po_id);
CREATE INDEX IF NOT EXISTS idx_stock_below_par ON warehouse_stock(is_below_par) WHERE is_below_par = true;
CREATE INDEX IF NOT EXISTS idx_kamus_harga_item ON kamus_harga(item_id, berlaku_dari DESC);
CREATE INDEX IF NOT EXISTS idx_audit_record ON purchasing_audit_log(tabel, record_id);
CREATE INDEX IF NOT EXISTS idx_items_nama ON items(nama);
CREATE INDEX IF NOT EXISTS idx_items_tipe ON items(tipe);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE kamus_harga ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_request_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipt_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE parstock_agent_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_list_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchasing_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlets ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all purchasing data
CREATE POLICY "authenticated_read" ON vendors FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read" ON items FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read" ON kamus_harga FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read" ON purchase_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read" ON purchase_request_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read" ON purchase_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read" ON purchase_order_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read" ON goods_receipts FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read" ON goods_receipt_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read" ON warehouse_stock FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read" ON parstock_agent_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read" ON price_list_imports FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read" ON purchasing_audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read" ON outlets FOR SELECT TO authenticated USING (true);

-- Write policies (authenticated for now; server-side role checks enforce business rules)
CREATE POLICY "authenticated_write" ON vendors FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_write" ON items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_write" ON kamus_harga FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_write" ON purchase_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_write" ON purchase_request_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_write" ON purchase_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_write" ON purchase_order_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_write" ON goods_receipts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_write" ON goods_receipt_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_write" ON warehouse_stock FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_write" ON parstock_agent_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_write" ON price_list_imports FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_write" ON purchasing_audit_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_write" ON outlets FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- STORAGE BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'purchasing-docs',
  'purchasing-docs',
  false,
  52428800,  -- 50MB limit
  ARRAY['application/pdf','image/jpeg','image/png','image/webp','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/csv']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "authenticated_storage_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'purchasing-docs');

CREATE POLICY "authenticated_storage_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'purchasing-docs');

-- ============================================================
-- ADD CHRIS TO BREW_USERS
-- ============================================================
INSERT INTO brew_users (email, full_name, role)
VALUES ('chris@stradacoffee.com', 'Chris', 'purchasing')
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;
