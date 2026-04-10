import { accurateClient } from '../../client';

/**
 * /api/sales-quotation/detail.do
 * Melihat detil data Penawaran Penjualan berdasarkan id atau identifier tertentu
 */
export async function salesQuotationDetail(params: any) {
  return accurateClient.get('/api/sales-quotation/detail.do', { params });
}
