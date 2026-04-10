import { accurateClient } from '../../client';

/**
 * /api/item/stock-mutation-history.do
 * Melihat histori mutasi stok (hanya menampilkan data 7 hari terakhir)
 */
export async function itemStockMutationHistory(params: any) {
  return accurateClient.get('/api/item/stock-mutation-history.do', { params });
}
