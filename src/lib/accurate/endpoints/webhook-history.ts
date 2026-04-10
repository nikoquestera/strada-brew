import { accurateClient } from '../client';

/**
 * /api/webhook-history.do
 * Menampilkan daftar data pengiriman webhook yang sudah terjadi dalam 1 bulan terakhir dan API ini hanya dapat diakses oleh token dari pengguna yang merupakan developer dari aplikasi
 */
export async function webhookHistory(params: any) {
  return accurateClient.get('/api/webhook-history.do', { params });
}
