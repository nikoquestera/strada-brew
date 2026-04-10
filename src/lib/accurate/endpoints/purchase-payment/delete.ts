import { accurateClient } from '../../client';

/**
 * /api/purchase-payment/delete.do
 * Menghapus data Pembayaran Pembelian berdasarkan id tertentu
 */
export async function purchasePaymentDelete(params: any) {
  return accurateClient.delete('/api/purchase-payment/delete.do', params);
}
