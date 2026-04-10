import { accurateClient } from '../../client';

/**
 * /api/sales-invoice/list.do
 * Melihat daftar data Faktur Penjualan, dengan filter yang sesuai
 */
export async function salesInvoiceList(params: any) {
  return accurateClient.get('/api/sales-invoice/list.do', { params });
}
