import { accurateClient } from '../../client';

/**
 * /api/journal-voucher/delete.do
 * Menghapus data Jurnal Umum berdasarkan id tertentu
 */
export async function journalVoucherDelete(params: any) {
  return accurateClient.delete('/api/journal-voucher/delete.do', params);
}
