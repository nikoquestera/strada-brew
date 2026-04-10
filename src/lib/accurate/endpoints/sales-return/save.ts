import { accurateClient } from '../../client';

/**
 * /api/sales-return/save.do
 * Membuat data Retur Penjualan baru atau mengedit data Retur Penjualan yang sudah ada
 */
export async function salesReturnSave(data: any) {
  return accurateClient.post('/api/sales-return/save.do', data);
}
