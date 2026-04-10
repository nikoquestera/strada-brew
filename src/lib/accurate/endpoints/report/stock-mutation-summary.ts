import { accurateClient } from '../../client';

/**
 * /api/report/stock-mutation-summary.do
 * Melihat daftar data Ringkasan mutasi stok barang/jasa, dengan filter yang sesuai
 */
export async function reportStockMutationSummary(params: any) {
  return accurateClient.get('/api/report/stock-mutation-summary.do', { params });
}
