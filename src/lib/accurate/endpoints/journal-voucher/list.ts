import { accurateClient } from '../../client';

/**
 * /api/journal-voucher/list.do
 * Melihat daftar data Jurnal Umum, dengan filter yang sesuai
 */
export async function journalVoucherList(params: any) {
  return accurateClient.get('/api/journal-voucher/list.do', { params });
}
