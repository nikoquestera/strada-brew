import { accurateClient } from '../../client';

/**
 * /api/item-transfer/delete.do
 * Menghapus data Pemindahan Barang berdasarkan id tertentu
 */
export async function itemTransferDelete(params: any) {
  return accurateClient.delete('/api/item-transfer/delete.do', params);
}
