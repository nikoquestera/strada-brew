import { accurateClient } from '../../client';

/**
 * /api/sales-quotation/delete.do
 * Menghapus data Penawaran Penjualan berdasarkan id tertentu
 */
export async function salesQuotationDelete(params: any) {
  return accurateClient.delete('/api/sales-quotation/delete.do', params);
}
