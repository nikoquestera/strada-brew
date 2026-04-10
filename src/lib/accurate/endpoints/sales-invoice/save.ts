import { accurateClient } from '../../client';

/**
 * /api/sales-invoice/save.do
 * Membuat data Faktur Penjualan baru atau mengedit data Faktur Penjualan yang sudah ada
 */
export async function salesInvoiceSave(data: any) {
  return accurateClient.post('/api/sales-invoice/save.do', data);
}
