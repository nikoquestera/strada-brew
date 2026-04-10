import { accurateClient } from '../../client';

/**
 * /api/sales-receipt/detail.do
 * Melihat detil data Penerimaan Penjualan berdasarkan id atau identifier tertentu
 */
export async function salesReceiptDetail(params: any) {
  return accurateClient.get('/api/sales-receipt/detail.do', { params });
}
