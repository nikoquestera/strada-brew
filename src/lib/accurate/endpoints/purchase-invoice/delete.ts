import { accurateClient } from '../../client';

/**
 * /api/purchase-invoice/delete.do
 * Menghapus data Faktur Pembelian berdasarkan id tertentu
 */
export async function purchaseInvoiceDelete(params: any) {
  return accurateClient.delete('/api/purchase-invoice/delete.do', params);
}
