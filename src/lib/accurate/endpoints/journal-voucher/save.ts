import { accurateClient } from '../../client';

/**
 * /api/journal-voucher/save.do
 * Membuat data Jurnal Umum baru atau mengedit data Jurnal Umum yang sudah ada
 */
export async function journalVoucherSave(data: any) {
  return accurateClient.post('/api/journal-voucher/save.do', data);
}
