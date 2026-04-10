import { accurateClient } from '../../client';

/**
 * /api/bill-of-material/delete.do
 * Menghapus data Formula Produksi berdasarkan id tertentu
 */
export async function billOfMaterialDelete(params: any) {
  return accurateClient.delete('/api/bill-of-material/delete.do', params);
}
