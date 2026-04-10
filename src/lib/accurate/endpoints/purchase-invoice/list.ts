import { accurateClient } from '../../client';

/**
 * /api/purchase-invoice/list.do
 * Melihat daftar data Faktur Pembelian, dengan filter yang sesuai
 */
export async function purchaseInvoiceList(params: any) {
  return accurateClient.get('/api/purchase-invoice/list.do', { params });
}
