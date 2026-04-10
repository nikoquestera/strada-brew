import { accurateClient } from '../../client';

/**
 * /api/job-order/delete.do
 * Menghapus data Pekerjaan Pesanan berdasarkan id tertentu
 */
export async function jobOrderDelete(params: any) {
  return accurateClient.delete('/api/job-order/delete.do', params);
}
