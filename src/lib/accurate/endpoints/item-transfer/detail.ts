import { accurateClient } from '../../client';

/**
 * /api/item-transfer/detail.do
 * Melihat detil data Pemindahan Barang berdasarkan id atau identifier tertentu
 */
export async function itemTransferDetail(params: any) {
  return accurateClient.get('/api/item-transfer/detail.do', { params });
}
