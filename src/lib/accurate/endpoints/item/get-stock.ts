import { accurateClient } from '../../client';

/**
 * /api/item/get-stock.do
 * Mengambil Jumlah barang yang tersedia
 */
export async function itemGetStock(params: any) {
  return accurateClient.get('/api/item/get-stock.do', { params });
}
