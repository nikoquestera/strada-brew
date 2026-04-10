import { accurateClient } from '../../client';

/**
 * /api/purchase-payment/detail.do
 * Melihat detil data Pembayaran Pembelian berdasarkan id atau identifier tertentu
 */
export async function purchasePaymentDetail(params: any) {
  return accurateClient.get('/api/purchase-payment/detail.do', { params });
}
