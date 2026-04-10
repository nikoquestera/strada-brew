import { accurateClient } from '../../client';

/**
 * /api/work-order/delete.do
 * Menghapus data Perintah Kerja berdasarkan id tertentu
 */
export async function workOrderDelete(params: any) {
  return accurateClient.delete('/api/work-order/delete.do', params);
}
