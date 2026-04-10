import { accurateClient } from '../../client';

/**
 * /api/item/delete.do
 * Menghapus data Barang & Jasa berdasarkan id tertentu
 */
export async function itemDelete(params: any) {
  return accurateClient.delete('/api/item/delete.do', params);
}
