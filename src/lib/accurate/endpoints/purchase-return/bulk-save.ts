import { accurateClient } from '../../client';

/**
 * /api/purchase-return/bulk-save.do
 * Membuat mengedit beberapa data Retur Pembelian sekaligus (Max: 100 data dalam 1 kali request). Ganti nama parameter "[n]" dengan index data mulai dari nol (Cth: data[0], data[1], dst.) pada parameter request.
 */
export async function purchaseReturnBulkSave(data: any) {
  return accurateClient.post('/api/purchase-return/bulk-save.do', data);
}
