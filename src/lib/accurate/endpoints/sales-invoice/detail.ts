import { accurateClient } from '../../client';

/**
 * /api/sales-invoice/detail.do
 * Melihat detil data Faktur Penjualan berdasarkan id atau identifier tertentu
 */
export async function salesInvoiceDetail(params: any) {
  return accurateClient.get('/api/sales-invoice/detail.do', { params });
}
