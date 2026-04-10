import { accurateClient } from '../../client';

/**
 * /api/finished-good-slip/save.do
 * Membuat data Penyelesaian Barang Jadi baru atau mengedit data Penyelesaian Barang Jadi yang sudah ada
 */
export async function finishedGoodSlipSave(data: any) {
  return accurateClient.post('/api/finished-good-slip/save.do', data);
}
