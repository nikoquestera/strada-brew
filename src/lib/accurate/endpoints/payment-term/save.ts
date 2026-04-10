import { accurateClient } from '../../client';

/**
 * /api/payment-term/save.do
 * Membuat data Syarat Pembayaran baru atau mengedit data Syarat Pembayaran yang sudah ada
 */
export async function paymentTermSave(data: any) {
  return accurateClient.post('/api/payment-term/save.do', data);
}
