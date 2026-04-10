import { accurateClient } from '../../client';

/**
 * /api/sales-quotation/save.do
 * Membuat data Penawaran Penjualan baru atau mengedit data Penawaran Penjualan yang sudah ada
 */
export async function salesQuotationSave(data: any) {
  return accurateClient.post('/api/sales-quotation/save.do', data);
}
