import { accurateClient } from '../../client';

/**
 * /api/item/list-stock.do
 * Melihat daftar Jumlah barang yang tersedia 
 */
export async function itemListStock(params: any) {
  return accurateClient.get('/api/item/list-stock.do', { params });
}
