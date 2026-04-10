import { accurateClient } from '../../client';

/**
 * /api/sales-receipt/delete.do
 * Menghapus data Penerimaan Penjualan berdasarkan id tertentu
 */
export async function salesReceiptDelete(params: any) {
  return accurateClient.delete('/api/sales-receipt/delete.do', params);
}
