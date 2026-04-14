// Purchasing & Warehouse module types

export type POStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'sent_vendor'
  | 'partial_received'
  | 'fully_received'
  | 'cancelled'

export type PRStatus = 'draft' | 'reviewed' | 'converted' | 'cancelled'
export type GRStatus = 'draft' | 'verified' | 'discrepancy' | 'finalized'
export type ItemTipe = 'fresh' | 'dry_goods' | 'frozen' | 'packaging' | 'roastery' | 'other'
export type GudangSumber = 'aaron' | 'ndah' | 'direct_vendor'

export const TIPE_LABELS: Record<string, string> = {
  fresh: 'Fresh',
  dry_goods: 'Dry Goods',
  frozen: 'Frozen',
  packaging: 'Packaging',
  roastery: 'Roastery',
  other: 'Lainnya',
}

export const PO_STATUS_LABELS: Record<POStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Menunggu Approval',
  approved: 'Disetujui',
  sent_vendor: 'Dikirim ke Vendor',
  partial_received: 'Diterima Sebagian',
  fully_received: 'Selesai Diterima',
  cancelled: 'Dibatalkan',
}

export const PO_STATUS_COLORS: Record<POStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  pending_approval: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-[#037894]',
  sent_vendor: 'bg-teal-100 text-teal-700',
  partial_received: 'bg-purple-100 text-purple-700',
  fully_received: 'bg-green-100 text-[#82A13B]',
  cancelled: 'bg-red-100 text-[#FF4F31]',
}

export const GR_STATUS_LABELS: Record<GRStatus, string> = {
  draft: 'Draft',
  verified: 'Terverifikasi',
  discrepancy: 'Ada Selisih',
  finalized: 'Finalisasi',
}

// Roles that can perform each action
export const PURCHASING_ROLES = ['purchasing', 'warehouse', 'roastery', 'purchasing_approver', 'finance', 'admin']

export function canCreatePO(role: string) {
  return ['purchasing', 'admin'].includes(role)
}
export function canApprovePO(role: string) {
  return ['purchasing_approver', 'admin'].includes(role)
}
export function canCreateGRFresh(role: string) {
  return ['purchasing', 'admin'].includes(role)
}
export function canCreateGRWarehouse(role: string) {
  return ['warehouse', 'admin'].includes(role)
}
export function canCreateGRRoastery(role: string) {
  return ['roastery', 'admin'].includes(role)
}
export function canEditKamusHarga(role: string) {
  return ['purchasing', 'admin'].includes(role)
}
export function canEditParStock(role: string) {
  return ['purchasing', 'warehouse', 'roastery', 'admin'].includes(role)
}

// Format IDR
export function formatIDR(value: number | null | undefined): string {
  if (value == null) return 'Rp -'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value)
}
