import { accurateClient } from '../../client';

/**
 * /api/sales-invoice/detail-invoice.do
 * Menampilkan faktur penjualan berdasarkan filter tertentu
 */
export async function salesInvoiceDetailInvoice(params: any) {
  return accurateClient.get('/api/sales-invoice/detail-invoice.do', { params });
}
