import { accurateClient } from '../../client';

/**
 * /api/journal-voucher/detail.do
 * Melihat detil data Jurnal Umum berdasarkan id atau identifier tertentu
 */
export async function journalVoucherDetail(params: any) {
  return accurateClient.get('/api/journal-voucher/detail.do', { params });
}
