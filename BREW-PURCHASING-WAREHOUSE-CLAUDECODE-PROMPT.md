# BREW Portal — Purchasing & Warehouse Module
## Claude Code Implementation Prompt

---

## PROJECT CONTEXT

You are building a new module inside the existing **BREW Portal** — Strada Coffee Indonesia's internal backoffice tool.

**Tech stack (existing, do not change):**
- Next.js 14, TypeScript, Tailwind CSS
- Supabase (project ID: `yalgiinueczpmrolisdd`, URL: `https://yalgiinueczpmrolisdd.supabase.co`)
- Vercel deployment, auto-deploy from `main`
- Repo: `github.com/nikoquestera/strada-brew`

**Brand colors (use consistently):**
- Strada Blue: `#037894`
- Coffee Black: `#020000`
- Foam White: `#E4DED8`
- Coral (warning): `#FF4F31`
- Amber (caution): `#DE9733`
- Olive (success): `#82A13B`
- Charcoal: `#4C4845`
- Light Teal: `#8FC6C5`

**Existing dashboard structure:** The portal already has an HRD module at `/dashboard/hrd`. Use the exact same `DashboardShell.tsx` pattern and sidebar style for this new Purchasing & Warehouse module at `/dashboard/purchasing`.

---

## BUSINESS LOGIC (Read carefully — this is real operational data)

### Who uses this module:
| User | Role in BREW | What they do |
|------|-------------|-------------|
| Chris | `purchasing` | Creates POs for fresh items, manages vendor price list (Kamus Harga), reconciles invoices |
| Aaron | `warehouse` | Manages gudang HO stock, confirms outgoing transfers (Pemindahan Barang), receives non-fresh goods |
| Ndah/Endah | `roastery` | Manages roastery/production gudang, confirms outgoing transfers to outlets |
| Vetris | `purchasing_approver` | Reviews and approves POs before they go to vendor |
| Selena | `finance` | Receives invoice + surat jalan bundles for payment processing |
| Niko/Admin | `admin` | Full access, can override anything |

### Operational flow (source of truth from transcription):
1. **Trigger:** Every morning (Mon/Tue/Thu are busiest), outlet supervisors export their daily purchase request from **Quinos POS** as PDF → email to `purchasing@shadokopi.com`
2. **Chris parses the email:** splits items into 3 categories per outlet:
   - **Fresh** (sayur, buah, telur, cheesecake, protein) → Direct PO to vendor
   - **Non-fresh / Dry Goods / Frozen / Packaging** → Pemindahan Barang from Aaron's gudang
   - **Roastery / Production items** → Pemindahan Barang from Ndah's gudang
3. **PO creation:** Chris creates POs in Accurate Online (still Draft until Vetris approves)
4. **Approval:** Vetris compares BREW PO vs Quinos PO, verifies against Kamus Harga, releases from DFT to final
5. **Delivery & GR:**
   - Fresh items: vendor delivers directly to outlet → outlet physically checks and signs surat jalan → scans and emails to Chris → physical copy sent via Pak Dayat (logistics driver) to HO
   - Non-fresh: Aaron's team at Hibrida warehouse handles GR
   - Roastery: Ndah's team handles GR
6. **Invoice reconciliation:** Chris staples Invoice + Surat Jalan + PO → submits to Selena (finance) for payment
7. **Price updates:** Vendors send new price list every Monday as PDF → Chris manually updates Kamus Harga → updates Quinos + Accurate. THIS IS THE MOST PAINFUL MANUAL PROCESS.

### Warehouse stock logic (Auto Par Stock Agent):
- Every day at 08:00 WIB, the system checks current stock levels against calculated par stock
- **Par stock formula:** Total quantity ordered (PO) for that item in the last 14 days
  - If no orders in 14 days → extend window to 28 days
  - If no orders in 28 days → extend to 90 days
  - If no orders in 90 days → item is INACTIVE, skip (do not create requisition)
- If current stock < par stock → automatically create a **Draft Permohonan Barang** (Purchase Requisition)
- Draft PR is visible to Chris on his dashboard; he reviews and converts to PO

---

## DATABASE SCHEMA

Run ALL of this SQL in Supabase SQL Editor. Create these tables in the `public` schema.

```sql
-- ============================================================
-- PURCHASING & WAREHOUSE MODULE
-- ============================================================

-- 1. OUTLETS (store reference)
CREATE TABLE IF NOT EXISTS outlets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode TEXT UNIQUE NOT NULL,           -- e.g. 'SMB', 'BSD', 'MKG', 'SMS', 'LPZ', 'SMB-GL'
  nama TEXT NOT NULL,                   -- e.g. 'Summarecon Bekasi'
  tipe TEXT DEFAULT 'cafe',             -- 'cafe' | 'roastery' | 'hq'
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
  kategori TEXT NOT NULL,              -- 'fresh' | 'dry_goods' | 'packaging' | 'frozen' | 'roastery' | 'other'
  kontak_nama TEXT,
  kontak_wa TEXT,
  kontak_email TEXT,
  outlet_khusus TEXT[],               -- NULL = semua outlet, array kode outlet jika spesifik (e.g. BSD punya vendor sayur sendiri)
  aktif BOOLEAN DEFAULT true,
  catatan TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. ITEM MASTER (mirror of Accurate item master, sync manually or via API)
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_accurate TEXT UNIQUE NOT NULL,  -- e.g. '1400.001'
  kode_quinos TEXT,                    -- may differ from kode_accurate
  nama TEXT NOT NULL,
  kategori TEXT NOT NULL,              -- '1400 Bahan Makanan Segar', etc.
  tipe TEXT NOT NULL,                  -- 'fresh' | 'dry_goods' | 'frozen' | 'packaging' | 'roastery' | 'other'
  satuan TEXT NOT NULL,                -- 'kg', 'pcs', 'btl', etc.
  satuan2 TEXT,                        -- secondary unit if exists
  rasio_satuan2 NUMERIC,               -- how many satuan = 1 satuan2
  par_stock_override NUMERIC,          -- manual override for auto-calculated par stock; NULL = auto-calculate
  gudang_sumber TEXT DEFAULT 'aaron',  -- 'aaron' | 'ndah' | 'direct_vendor' (for fresh)
  vendor_id UUID REFERENCES vendors(id),
  aktif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. KAMUS HARGA (vendor price dictionary — the "master pricing" from transcription)
CREATE TABLE IF NOT EXISTS kamus_harga (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id),  -- NULL = semua outlet; filled = outlet-specific pricing
  harga_beli NUMERIC NOT NULL,
  satuan TEXT NOT NULL,
  berlaku_dari DATE NOT NULL,
  berlaku_sampai DATE,                    -- NULL = still active
  sumber TEXT DEFAULT 'manual',           -- 'manual' | 'pdf_import' | 'api'
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

-- 5. PURCHASE REQUESTS (Permohonan Barang — from outlet Quinos PDF or auto par stock)
CREATE TABLE IF NOT EXISTS purchase_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor TEXT UNIQUE NOT NULL,           -- e.g. 'PR-20260414-001'
  outlet_id UUID NOT NULL REFERENCES outlets(id),
  tanggal_permintaan DATE NOT NULL DEFAULT CURRENT_DATE,
  tanggal_dibutuhkan DATE NOT NULL,
  sumber TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'quinos_pdf' | 'auto_parstock'
  status TEXT NOT NULL DEFAULT 'draft',  -- 'draft' | 'reviewed' | 'converted' | 'cancelled'
  catatan TEXT,
  quinos_pdf_url TEXT,                   -- Supabase Storage URL of original Quinos PDF
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
  qty_disetujui NUMERIC,               -- may differ after review
  catatan TEXT,
  tipe TEXT NOT NULL,                  -- 'fresh' | 'dry_goods' | 'frozen' | 'packaging' | 'roastery'
  gudang_sumber TEXT,                  -- 'aaron' | 'ndah' | 'direct_vendor'
  po_id UUID,                          -- filled after converted to PO (FK added below)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. PURCHASE ORDERS
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor TEXT UNIQUE NOT NULL,           -- e.g. 'PO-20260414-FRESH-001'
  outlet_id UUID NOT NULL REFERENCES outlets(id),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  tipe TEXT NOT NULL,                   -- 'fresh' | 'dry_goods' | 'frozen' | 'packaging' | 'roastery'
  tanggal_po DATE NOT NULL DEFAULT CURRENT_DATE,
  tanggal_dibutuhkan DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'pending_approval' | 'approved' | 'sent_vendor' | 'partial_received' | 'fully_received' | 'cancelled'
  total_nilai NUMERIC,                  -- auto-calculated
  catatan TEXT,
  pr_id UUID REFERENCES purchase_requests(id),
  accurate_po_number TEXT,              -- PO number in Accurate after manual input
  created_by UUID REFERENCES brew_users(id),
  approved_by UUID REFERENCES brew_users(id),
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. PO LINES
CREATE TABLE IF NOT EXISTS purchase_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id),
  qty_order NUMERIC NOT NULL,
  satuan TEXT NOT NULL,
  harga_satuan NUMERIC NOT NULL,        -- from kamus_harga at time of PO creation
  total_harga NUMERIC GENERATED ALWAYS AS (qty_order * harga_satuan) STORED,
  qty_received NUMERIC DEFAULT 0,       -- updated on GR
  catatan TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add FK back to PRL
ALTER TABLE purchase_request_lines ADD CONSTRAINT fk_prl_po FOREIGN KEY (po_id) REFERENCES purchase_orders(id);

-- 9. GOODS RECEIPT (Penerimaan Barang)
CREATE TABLE IF NOT EXISTS goods_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor TEXT UNIQUE NOT NULL,           -- e.g. 'GR-20260414-001'
  po_id UUID NOT NULL REFERENCES purchase_orders(id),
  outlet_id UUID NOT NULL REFERENCES outlets(id),
  tanggal_terima DATE NOT NULL DEFAULT CURRENT_DATE,
  penerima TEXT NOT NULL,               -- name of person who received
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'verified' | 'discrepancy' | 'finalized'
  surat_jalan_url TEXT,                 -- scan/photo of surat jalan in Supabase Storage
  surat_jalan_nomor TEXT,
  invoice_nomor TEXT,
  catatan TEXT,
  discrepancy_notes TEXT,               -- any notes on qty/price differences
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
  harga_aktual NUMERIC NOT NULL,        -- may differ from PO price (timbangan, etc.)
  total_aktual NUMERIC GENERATED ALWAYS AS (qty_diterima * harga_aktual) STORED,
  ada_selisih BOOLEAN GENERATED ALWAYS AS (qty_diterima != (SELECT pol.qty_order FROM purchase_order_lines pol WHERE pol.id = po_line_id)) STORED,
  catatan TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. WAREHOUSE STOCK (real-time snapshot from Accurate — synced manually or via API)
CREATE TABLE IF NOT EXISTS warehouse_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id),
  gudang TEXT NOT NULL,                 -- 'aaron' | 'ndah'
  qty_saat_ini NUMERIC NOT NULL DEFAULT 0,
  satuan TEXT NOT NULL,
  par_stock_calculated NUMERIC,         -- calculated by daily agent
  par_stock_effective NUMERIC,          -- = override if set, else calculated
  is_below_par BOOLEAN GENERATED ALWAYS AS (qty_saat_ini < COALESCE(par_stock_calculated, 0)) STORED,
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(item_id, gudang)
);

-- 12. PAR STOCK CALCULATION HISTORY (for audit trail of agent runs)
CREATE TABLE IF NOT EXISTS parstock_agent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  item_id UUID NOT NULL REFERENCES items(id),
  gudang TEXT NOT NULL,
  window_days INTEGER NOT NULL,         -- 14, 28, or 90
  avg_usage_per_day NUMERIC,
  par_stock_calculated NUMERIC,
  qty_at_time_of_check NUMERIC,
  action_taken TEXT,                    -- 'pr_created' | 'skipped_inactive' | 'skipped_sufficient'
  pr_id UUID REFERENCES purchase_requests(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. PRICE LIST IMPORT LOG (track every vendor PDF price list upload)
CREATE TABLE IF NOT EXISTS price_list_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  berlaku_dari DATE NOT NULL,
  pdf_url TEXT,
  total_items_in_file INTEGER,
  total_items_matched INTEGER,
  total_items_unmatched INTEGER,
  items_unmatched JSONB,               -- array of {nama_vendor: string, closest_match: string}
  status TEXT DEFAULT 'pending',       -- 'pending' | 'partial' | 'applied' | 'rejected'
  applied_by UUID REFERENCES brew_users(id),
  applied_at TIMESTAMPTZ,
  created_by UUID REFERENCES brew_users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. AUDIT LOG (every sensitive action)
CREATE TABLE IF NOT EXISTS purchasing_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabel TEXT NOT NULL,
  record_id UUID NOT NULL,
  aksi TEXT NOT NULL,                   -- 'create' | 'update' | 'approve' | 'cancel' | 'override'
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
CREATE INDEX idx_po_status ON purchase_orders(status);
CREATE INDEX idx_po_outlet ON purchase_orders(outlet_id);
CREATE INDEX idx_po_tanggal ON purchase_orders(tanggal_po);
CREATE INDEX idx_pr_status ON purchase_requests(status);
CREATE INDEX idx_gr_po ON goods_receipts(po_id);
CREATE INDEX idx_stock_below_par ON warehouse_stock(is_below_par) WHERE is_below_par = true;
CREATE INDEX idx_kamus_harga_item ON kamus_harga(item_id, berlaku_dari DESC);
CREATE INDEX idx_audit_record ON purchasing_audit_log(tabel, record_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE kamus_harga ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_stock ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read everything in this module
CREATE POLICY "authenticated_read_all" ON vendors FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_all" ON items FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_all" ON kamus_harga FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_all" ON purchase_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_all" ON purchase_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_all" ON goods_receipts FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_all" ON warehouse_stock FOR SELECT TO authenticated USING (true);

-- Write policies — only purchasing + admin can write POs; warehouse writes GR
CREATE POLICY "purchasing_write_po" ON purchase_orders FOR INSERT TO authenticated USING (true);
CREATE POLICY "purchasing_write_pr" ON purchase_requests FOR INSERT TO authenticated USING (true);
CREATE POLICY "warehouse_write_gr" ON goods_receipts FOR INSERT TO authenticated USING (true);
```

---

## FILE STRUCTURE TO CREATE

```
src/app/dashboard/purchasing/
├── layout.tsx                          ← DashboardShell with purchasing sidebar nav
├── page.tsx                            ← Overview / command center
├── po/
│   ├── page.tsx                        ← PO List
│   ├── baru/page.tsx                   ← Create new PO
│   └── [id]/page.tsx                   ← PO Detail + approval action
├── pr/
│   ├── page.tsx                        ← Purchase Request list (from par stock agent or manual)
│   └── [id]/page.tsx                   ← PR Detail → convert to PO
├── terima/
│   ├── page.tsx                        ← Goods Receipt list
│   └── [id]/page.tsx                   ← GR Detail with discrepancy form
├── stok/
│   └── page.tsx                        ← Warehouse stock monitor + par stock status
├── kamus-harga/
│   ├── page.tsx                        ← Master price list per vendor
│   └── import/page.tsx                 ← PDF price list upload + AI matching
└── laporan/
    └── page.tsx                        ← Summary: PO value, GR discrepancies, stock alerts

src/app/api/purchasing/
├── parstock-agent/route.ts             ← Called by cron at 08:00 WIB daily
├── price-import/route.ts               ← OCR + AI item matching for PDF price list
└── po-number/route.ts                  ← Generate sequential PO/PR/GR numbers
```

---

## PAGE-BY-PAGE SPECIFICATIONS

---

### 1. `layout.tsx` — Purchasing Sidebar

Replicate the exact style of `DashboardShell.tsx` (black sidebar `#020000`, Strada Blue active state `#037894`). 

Sidebar nav items:
```typescript
const purchasingNav = [
  { label: 'Overview', href: '/dashboard/purchasing', icon: Home },
  { label: 'Purchase Order', href: '/dashboard/purchasing/po', icon: ShoppingCart },
  { label: 'Permohonan Barang', href: '/dashboard/purchasing/pr', icon: ClipboardList },
  { label: 'Penerimaan Barang', href: '/dashboard/purchasing/terima', icon: PackageCheck },
  { label: 'Stok Gudang', href: '/dashboard/purchasing/stok', icon: Warehouse },
  { label: 'Kamus Harga', href: '/dashboard/purchasing/kamus-harga', icon: BookOpen },
  { label: 'Laporan', href: '/dashboard/purchasing/laporan', icon: BarChart3 },
]
```

Show current user's role below their email in the sidebar footer.

---

### 2. `page.tsx` — Overview Dashboard

This is the **command center**. Layout: full-width, card-based.

**Top row — alert cards (show only if count > 0, use Coral `#FF4F31` for urgent):**
- 🔴 PO menunggu approval Vetris: `{count}` PO
- 🟡 Stok gudang di bawah par stock: `{count}` item
- 🟠 Permohonan Barang auto-generated hari ini: `{count}` PR
- 🔵 Penerimaan barang belum diverifikasi: `{count}` GR

**Middle row — activity tables (today's data):**

Left: "PO Hari Ini" table
| Nomor PO | Outlet | Tipe | Vendor | Nilai | Status |
Right: "Stok Kritis" table  
| Item | Gudang | Stok Saat Ini | Par Stock | Selisih |

**Bottom row — mini stats:**
- Total nilai PO bulan ini: IDR
- PO selesai diterima: `x / y`
- Selisih GR bulan ini (discrepancy value): IDR

---

### 3. `po/page.tsx` — Purchase Order List

**Filters (horizontal filter bar):**
- Filter outlet (dropdown, multi-select)
- Filter tipe: All / Fresh / Dry Goods / Frozen / Packaging / Roastery
- Filter status: All / Draft / Pending Approval / Approved / Sent / Received / Cancelled
- Filter tanggal: date range picker (default: today)
- Search: item name or PO number

**Table columns:**
| Nomor PO | Tanggal | Outlet | Vendor | Tipe | Total Items | Nilai (IDR) | Status | Aksi |

**Status badge colors:**
- `draft` → Gray
- `pending_approval` → Amber `#DE9733`
- `approved` → Strada Blue `#037894`
- `sent_vendor` → Light Teal `#8FC6C5`
- `fully_received` → Olive `#82A13B`
- `cancelled` → Coral `#FF4F31`

**Action buttons per row (role-based):**
- Chris (purchasing): Edit if draft, View otherwise
- Vetris (approver): "Approve" button if `pending_approval`
- Aaron/Ndah (warehouse): "Terima Barang" button if `sent_vendor`

**HUMAN ERROR PREVENTION:**
- PO cannot be submitted for approval if any line item has no matching price in `kamus_harga_aktif` → show inline error: "Harga untuk [nama item] belum ada di Kamus Harga. Update Kamus Harga dulu."
- Cannot create duplicate PO for same outlet + vendor + tipe + tanggal_dibutuhkan → show warning: "Sudah ada PO untuk outlet ini hari ini. Lanjut buat PO baru?"
- If tipe = `fresh` AND gudang_sumber = `aaron`, warn: "Item ini bukan Fresh — pastikan tipe PO sudah benar."

---

### 4. `po/baru/page.tsx` — Create New PO

**Step 1 — Header:**
- Outlet (dropdown, required)
- Tipe (dropdown: Fresh / Dry Goods / Frozen / Packaging / Roastery, required)
- Vendor (dropdown filtered by tipe + outlet, required)
- Tanggal dibutuhkan (date picker, required, cannot be in the past)
- Catatan (textarea, optional)
- Upload Quinos PDF: drag-drop zone, stores to Supabase Storage bucket `purchasing-docs`

**Step 2 — Line Items:**
- Searchable item picker (search by nama or kode_accurate, filtered by tipe)
- Each line shows: Nama Item | Kode | Qty | Satuan | Harga Satuan (auto-filled from kamus_harga) | Total
- "Add Item" button adds a new row
- Delete row button (trash icon)
- Running total at bottom: **Total Nilai PO: Rp xxx.xxx.xxx**

**HUMAN ERROR PREVENTION on line items:**
- If harga_satuan = 0 or null → red border + inline warning: "Harga belum ada di Kamus Harga"
- If qty = 0 or negative → block save, show: "Qty harus lebih dari 0"
- If same item added twice → auto-merge qty and show: "Item sudah ada, qty digabung"
- If total PO nilai > Rp 5.000.000 AND status would be submitted directly → force "Pending Approval" status (cannot bypass Vetris for large POs)

**Step 3 — Review & Submit:**
- Summary card: outlet, vendor, tipe, tanggal, total items, total nilai
- Two buttons:
  - "Simpan Draft" → status = `draft`
  - "Ajukan ke Vetris" → status = `pending_approval`, triggers in-app notification

Auto-generate PO number on save: `PO-{YYYYMMDD}-{TIPE_PREFIX}-{SEQ}` e.g. `PO-20260414-FSH-001`

---

### 5. `po/[id]/page.tsx` — PO Detail

**Header:** PO number, status badge, outlet, vendor, tipe, tanggal

**Line items table:** full read-only view of all PO lines with harga + total

**Footer total:** Total Nilai PO

**Action panel (role-based, right column):**

**For Vetris (approver) when status = `pending_approval`:**
```
Verifikasi PO
─────────────────
Checklist sebelum approve:
☐ Harga sesuai Kamus Harga
☐ Item sesuai PO Quinos
☐ Vendor benar untuk outlet ini

[Tolak dengan catatan]  [✓ Approve & Release]
```
- "Approve" → status = `approved`, log to audit table, timestamp
- "Tolak" → modal asking for rejection reason → status = `draft`, reason saved to catatan

**For Chris (purchasing) when status = `approved`:**
- Button: "Tandai Sudah Dikirim ke Vendor" → status = `sent_vendor`
- Input field: "No. PO di Accurate" (for cross-reference)

**For Aaron/Ndah (warehouse) when status = `sent_vendor`:**
- Button: "Buat Penerimaan Barang" → navigates to `/dashboard/purchasing/terima/baru?po_id={id}`

**RISK ANALYSIS PANEL (always visible, bottom):**
Show a small risk section computed on-load:
- ⚠️ "Harga berubah sejak PO dibuat" — compare PO line prices vs current kamus_harga; flag any item where delta > 5%
- ⚠️ "Item tidak ada di stok gudang Aaron" — check warehouse_stock for non-fresh items
- ℹ️ "PO ini menggunakan akun HO" — if created_by is not vetris/purchasing role, show yellow notice

---

### 6. `pr/page.tsx` — Purchase Request (Permohonan Barang) List

Show ALL purchase requests, with tab filter:
- **Auto (Par Stock)** — `sumber = 'auto_parstock'`
- **Manual** — `sumber = 'manual'`
- **Dari Quinos PDF** — `sumber = 'quinos_pdf'`

Table columns:
| Nomor PR | Tanggal | Outlet | Dibutuhkan | Total Items | Sumber | Status | Aksi |

For auto-generated PRs, show a badge "🤖 Auto" in Strada Blue.

Action: "Konversi ke PO" → opens PO creation form pre-filled with PR data, split by tipe automatically.

---

### 7. `terima/page.tsx` + `terima/[id]/page.tsx` — Goods Receipt

**List page:** same filter pattern as PO list. Add column "Surat Jalan" with upload status icon.

**Detail page — GR form:**

Header fields:
- Linked PO (read-only, shows PO number + outlet + vendor)
- Tanggal terima (date picker)
- Nama penerima (text field — person who physically received)
- Nomor surat jalan (text field)
- Nomor invoice (text field)
- Upload surat jalan (file upload → Supabase Storage `purchasing-docs/{gr_id}/sj.*`)

Line items comparison table:
| Item | Qty Order | Qty Diterima | Satuan | Harga PO | Harga Aktual | Selisih Qty | Selisih Nilai |
- Selisih columns auto-calculated, highlighted red if != 0

**DISCREPANCY WORKFLOW:**
- If any `qty_diterima != qty_order` OR `harga_aktual != harga_satuan_po`:
  - Status → `discrepancy`
  - Show warning banner: "Ada selisih pada {x} item. Chris wajib rekonsiliasi sebelum kirim ke Selena."
  - Show "Catat Alasan Selisih" field per line (e.g. "timbangan outlet beda 0.3kg")
  - Button "Kirim ke Selena untuk Pembayaran" is DISABLED until all discrepancy lines have alasan filled

**For fresh items:** note shown: "Harga aktual dapat berbeda karena timbangan outlet. Sesuaikan qty sesuai surat jalan dari outlet."

Finalized GR shows a "Bundle untuk Selena" summary: Invoice + SJ + PO reference → generate a simple print view with all 3 document references stapled together.

---

### 8. `stok/page.tsx` — Warehouse Stock Monitor

**Two tabs:**
- Tab "Gudang Aaron" (dry goods, frozen, packaging)
- Tab "Gudang Ndah" (roastery, production)

**Per tab — stock table:**
| Item | Kode | Kategori | Stok Saat Ini | Par Stock | Status | Last Updated | Aksi |

**Status column logic:**
- Stok > par_stock × 1.5 → "Aman" badge (Olive green)
- Stok between par_stock and par_stock × 1.5 → "Cukup" badge (Amber)
- Stok < par_stock AND stok > 0 → "Di Bawah Par" badge (Coral)
- Stok = 0 → "HABIS" badge (red background, white text, bold)

**Top of page:**
- Summary chips: `{x} item HABIS` | `{y} item di bawah par` | `{z} item aman`
- Button: "Sync dari Accurate" (calls a manual sync endpoint) — shows last synced timestamp
- Button: "Jalankan Par Stock Agent" (manual trigger, for testing outside of 08:00 schedule)

**AKSI column:**
- "Buat PR Manual" → opens PR creation pre-filled with this item
- "Edit Par Stock" → inline edit of `par_stock_override`

**Par stock override UI:**
- If `par_stock_override` is set, show "(override: {value})" in gray under the calculated value
- Click → small inline form: "Override par stock untuk item ini: [input] [Simpan] [Reset ke Auto]"
- GUARD: If override is set, show warning icon with tooltip: "Par stock ini di-override manual. Data agent tidak akan mengubah nilai ini."

---

### 9. `kamus-harga/page.tsx` — Master Price Dictionary

**Layout: two-panel**

Left panel — vendor list (sidebar):
- List all vendors with their category badge
- Click to select vendor → right panel shows their items

Right panel — price table for selected vendor:
| Item | Kode Accurate | Satuan | Harga Berlaku | Berlaku Dari | Berlaku Sampai | Riwayat |
- "Riwayat" → small modal showing price history for that item × vendor
- Inline "Edit Harga" button → opens small form with price + berlaku_dari

**Top bar:**
- Search across all items
- Filter by kategori
- Button: "Import dari PDF Vendor" → `/dashboard/purchasing/kamus-harga/import`

---

### 10. `kamus-harga/import/page.tsx` — PDF Price List Import (AI-Powered)

This is the most important feature — it automates the most painful manual task Chris has.

**UI flow:**

**Step 1 — Upload:**
- Vendor selector (required)
- Berlaku dari (date, default: next Monday)
- Drag-drop PDF uploader
- On upload: show "Membaca price list dengan AI..." spinner

**Step 2 — AI Matching Review:**
After upload, call `/api/purchasing/price-import` which:
1. Reads the PDF text (use pdf-parse or similar)
2. Sends to Claude API (`claude-sonnet-4-20250514`) with prompt:
```
You are a purchasing assistant for Strada Coffee Indonesia.
Extract all items and their prices from this vendor price list PDF.
Return a JSON array:
[{"nama_vendor": string, "harga": number, "satuan": string}]
Return ONLY valid JSON, no markdown, no preamble.
```
3. For each extracted item, fuzzy-match against `items` table in Supabase using:
   - Exact kode_quinos match first
   - Then normalized name match (lowercase, remove spaces)
   - Then AI similarity match for aliases (e.g. "Cabe Merah Besar" → "Cabe Teropong Merah")

**Review table (Step 2):**
| Nama di Vendor PDF | Matched ke Item Kita | Confidence | Harga Baru | Harga Lama | Delta % | Action |
- Green row = high confidence match (>85%)
- Yellow row = medium confidence (60–85%), user must confirm
- Red row = no match found → user must manually select item or skip

**HUMAN ERROR PREVENTION in import:**
- Delta % column: if price change > 20%, add 🚨 icon and require user to check before applying
- If ALL prices for a vendor increased by exact same %, show banner: "Seluruh harga naik {x}% — kemungkinan bulk price increase. Cek dulu sebelum apply."
- If berlaku_dari is in the past (more than 7 days ago), warn: "Tanggal berlaku sudah lewat lebih dari 7 hari. Pastikan ini bukan data lama."

**Step 3 — Apply:**
- "Apply {x} harga baru" → inserts into `kamus_harga` with berlaku_dari set
- Shows summary: {x} harga diperbarui, {y} item tidak cocok (simpan untuk dicek manual)
- Unmatched items saved to `price_list_imports.items_unmatched` for manual follow-up
- After apply: show "Next steps" banner:
  - ✅ Kamus Harga Brew → Updated
  - ⏳ Quinos → Perlu update manual oleh Chris
  - ⏳ Accurate → Perlu update manual (PO baru akan otomatis pakai harga baru)

---

### 11. API Routes

#### `/api/purchasing/parstock-agent/route.ts`
POST endpoint (called by cron or manual trigger).

Logic:
```typescript
for each item in warehouse_stock (both gudangs):
  1. Get qty_saat_ini
  2. Query purchase_order_lines WHERE item_id = X AND po.tanggal_po >= 14 days ago
     → sum qty_order → this is total_ordered_14d
  3. If total_ordered_14d > 0:
       par_stock = total_ordered_14d  (2 weeks of demand = minimum safety stock)
  4. Else if has orders in last 28 days:
       par_stock = (total_ordered_28d / 28) * 14
  5. Else if has orders in last 90 days:
       par_stock = (total_ordered_90d / 90) * 14
  6. Else:
       → mark as inactive, skip, log 'skipped_inactive'
  
  7. Update warehouse_stock.par_stock_calculated = par_stock
  
  8. If qty_saat_ini < par_stock AND no open PR/PO exists for this item:
       → Create purchase_request with sumber = 'auto_parstock'
       → Create purchase_request_line for the item
       → Qty = (par_stock - qty_saat_ini) rounded up to nearest satuan
       → Log to parstock_agent_log
```

Return: `{ prs_created: number, items_checked: number, items_skipped_inactive: number }`

#### `/api/purchasing/po-number/route.ts`
GET endpoint → returns next sequential PO/PR/GR number.
Format: `{PREFIX}-{YYYYMMDD}-{TYPE}-{3-digit-seq}` e.g. `PO-20260414-FSH-007`
Type codes: FSH=Fresh, DRY=Dry Goods, FRZ=Frozen, PKG=Packaging, RST=Roastery
Uses `SELECT MAX(nomor) FROM purchase_orders WHERE tanggal_po = today AND tipe = X` to determine next sequence.

---

## BUSINESS RULES & VALIDATION (implement as server-side checks in API routes)

| # | Rule | Where to enforce | Error message |
|---|------|-----------------|---------------|
| R1 | PO cannot have value > Rp 5.000.000 AND be auto-approved | PO creation API | "PO di atas Rp 5 juta memerlukan approval Vetris" |
| R2 | Only `purchasing` and `admin` roles can create POs | Middleware + RLS | 403 response |
| R3 | Only `purchasing_approver` and `admin` can approve POs | PO approval API | 403 response |
| R4 | Cannot create GR if no approved/sent PO exists | GR creation API | "Belum ada PO yang disetujui untuk barang ini" |
| R5 | Cannot mark GR as finalized if discrepancy lines have no alasan | GR finalize API | "Isi alasan untuk semua selisih sebelum finalisasi" |
| R6 | Price in PO must exist in kamus_harga at time of creation | PO creation API | "Harga item X belum ada. Update Kamus Harga dulu." |
| R7 | tanggal_dibutuhkan cannot be before tanggal_po | PO form validation | "Tanggal dibutuhkan tidak boleh sebelum hari ini" |
| R8 | Item coded as `fresh` (1400.xxx) cannot be in warehouse transfer PO | Item type check | "Item fresh harus PO langsung ke vendor, bukan transfer gudang" |
| R9 | Duplicate PO for same outlet+vendor+tipe+tanggal_dibutuhkan | PO creation | Warning modal (not hard block) |
| R10 | If stock update from Accurate is older than 24h, show stale data warning | Stock page | Yellow banner "Data stok terakhir diperbarui {x} jam lalu" |
| R11 | Par stock override cannot be set to 0 | Stock page | "Par stock minimal 1 unit" |
| R12 | Price import: price change > 50% triggers mandatory manual review | Price import | Cannot be applied without explicit checkbox confirmation |

---

## EXCEPTION HANDLING (from transcription patterns)

| Situation | System behavior |
|-----------|----------------|
| Chris uses HO account to bypass Vetris on urgent Mondays | Log to `purchasing_audit_log` with `aksi = 'override'`; show warning banner on that PO: "PO ini dibuat menggunakan akun override" |
| Vendor surat jalan qty ≠ Quinos PO qty (timbangan) | GR form allows qty_diterima to differ; price_aktual can differ; both logged; required before sending to Selena |
| New item in vendor PDF not yet in our item master | Saved to `price_list_imports.items_unmatched`; surfaced as task on Kamus Harga page |
| Outlet orders item that is out of stock at gudang | Par stock agent creates PR automatically; stock page shows "HABIS" badge; purchasing gets alert |
| Vendor changes item naming in their PDF | AI matching catches aliases; medium-confidence matches require human confirmation |
| Monday morning flood of POs (all outlets submit same day) | Batch PO creation: after Quinos PDF upload, show "Buat semua PO sekaligus" button that generates POs for all items grouped by tipe |

---

## SUPABASE STORAGE BUCKETS

Create these buckets (set to private, authenticated access only):
- `purchasing-docs` — for surat jalan scans, vendor PDFs, Quinos exports
  - Path structure: `{gr_id}/surat-jalan.{ext}`, `{po_id}/quinos-export.pdf`, `price-imports/{vendor_id}/{date}.pdf`

---

## ROLE-BASED ACCESS MATRIX

| Page/Action | admin | purchasing | purchasing_approver | warehouse | roastery | finance |
|-------------|-------|-----------|-------------------|-----------|----------|---------|
| View all POs | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create PO | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Approve PO | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Create GR (fresh) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create GR (non-fresh) | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Create GR (roastery) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Edit Kamus Harga | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Import price list | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Edit par stock override | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| View Laporan | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Run par stock agent | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

Implement role check by reading `brew_users.role` from Supabase for the authenticated user.

---

## NAVIGATION INTEGRATION

Update `DashboardShell.tsx` to support multiple module contexts. The sidebar module label should change based on the path:
- `/dashboard/hrd/*` → "HRD Module"
- `/dashboard/purchasing/*` → "Purchasing & Gudang"

Add a top-level module switcher (small dropdown or link row) at the top of the sidebar so users can switch between modules they have access to.

---

## ENVIRONMENT VARIABLES NEEDED

Add to Vercel env (in addition to existing Supabase vars):
```env
NEXT_PUBLIC_SUPABASE_URL=https://yalgiinueczpmrolisdd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[existing]
ANTHROPIC_API_KEY=[existing — used for price list AI matching]
CRON_SECRET=[generate random string — used to protect parstock-agent endpoint]
```

Cron job setup (Vercel Cron in `vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/purchasing/parstock-agent",
      "schedule": "0 1 * * *"
    }
  ]
}
```
Note: `0 1 * * *` = 01:00 UTC = 08:00 WIB (Jakarta, UTC+7).

---

## NPM DEPENDENCIES TO ADD

```bash
npm install pdf-parse @types/pdf-parse
```
(Already have: `@anthropic-ai/sdk` from Quest AI, `@supabase/supabase-js`)

---

## IMPORTANT NOTES FOR CLAUDE CODE

1. **Supabase project ID is `yalgiinueczpmrolisdd`** — do NOT use the old deprecated project `suaxtfakvvhrxotfqsdc`
2. **Use server components** for data-fetching pages (same pattern as existing HRD pages), client components only where interactivity is needed
3. **All monetary values in IDR** — format as `Rp x.xxx.xxx` using Indonesian locale
4. **No WhatsApp integration yet** — notifications are in-app only for now
5. **Accurate Online is NOT directly connected** — stock data is synced manually by Aaron/Ndah entering data in BREW, or imported via CSV. The "Sync dari Accurate" button is a placeholder that shows last_synced_at only; actual sync is manual for now
6. **Quinos PDF parsing is manual for Phase 1** — Chris uploads the PDF → BREW extracts items using AI → Chris confirms before PO is created. Full auto-parse is Phase 2.
7. **Always write to `purchasing_audit_log`** for: PO approval/rejection, par stock override changes, price import apply, GR finalization with discrepancy
8. **Use `brew_users` table** (already exists) for user identity and role — do not create a new auth table
9. **Mobile responsive** — Chris and Aaron may use this on phone while at gudang or on the road
