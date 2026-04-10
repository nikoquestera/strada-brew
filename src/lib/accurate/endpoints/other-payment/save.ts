import { accurateClient } from '../../client';

/**
 * /api/other-payment/save.do
 * Membuat data Pembayaran baru atau mengedit data Pembayaran yang sudah ada
 */
export async function otherPaymentSave(data: any) {
  return accurateClient.post('/api/other-payment/save.do', data);
}
