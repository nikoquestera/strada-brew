import { accurateClient } from '../../client';

/**
 * /api/purchase-invoice/detail.do
 * Melihat detil data Faktur Pembelian berdasarkan id atau identifier tertentu
 */
export async function purchaseInvoiceDetail(params: any) {
  return accurateClient.get('/api/purchase-invoice/detail.do', { params });
}
