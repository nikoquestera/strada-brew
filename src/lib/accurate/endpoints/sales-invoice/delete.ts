import { accurateClient } from '../../client';

/**
 * /api/sales-invoice/delete.do
 * Menghapus data Faktur Penjualan berdasarkan id tertentu
 */
export async function salesInvoiceDelete(params: any) {
  return accurateClient.delete('/api/sales-invoice/delete.do', params);
}
