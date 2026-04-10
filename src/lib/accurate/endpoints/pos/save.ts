import { accurateClient } from '../../client';

/**
 * /api/pos/transaction/save.do
 * API untuk mempermudah integrasi dengan sistem POS untuk melakukan import data Faktur Penjualan, Pembayaran Pelanggan dan Retur Penjualan ke Accurate Online. Jika data terkait sudah ada di Accurate Online maka akan diabaikan.
 */
export async function posTransactionSave(data: any) {
  return accurateClient.post('/api/pos/transaction/save.do', data);
}
