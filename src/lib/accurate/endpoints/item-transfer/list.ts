import { accurateClient } from '../../client';

/**
 * /api/item-transfer/list.do
 * Melihat daftar data Pemindahan Barang, dengan filter yang sesuai
 */
export async function itemTransferList(params: any) {
  return accurateClient.get('/api/item-transfer/list.do', { params });
}
