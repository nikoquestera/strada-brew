import { accurateClient } from '../../client';

/**
 * /api/purchase-invoice/save.do
 * Membuat data Faktur Pembelian baru atau mengedit data Faktur Pembelian yang sudah ada
 */
export async function purchaseInvoiceSave(data: any) {
  return accurateClient.post('/api/purchase-invoice/save.do', data);
}
