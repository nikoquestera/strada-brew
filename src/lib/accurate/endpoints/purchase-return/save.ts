import { accurateClient } from '../../client';

/**
 * /api/purchase-return/save.do
 * Membuat data Retur Pembelian baru atau mengedit data Retur Pembelian yang sudah ada
 */
export async function purchaseReturnSave(data: any) {
  return accurateClient.post('/api/purchase-return/save.do', data);
}
