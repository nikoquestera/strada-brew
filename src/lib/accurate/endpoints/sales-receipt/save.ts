import { accurateClient } from '../../client';

/**
 * /api/sales-receipt/save.do
 * Membuat data Penerimaan Penjualan baru atau mengedit data Penerimaan Penjualan yang sudah ada
 */
export async function salesReceiptSave(data: any) {
  return accurateClient.post('/api/sales-receipt/save.do', data);
}
