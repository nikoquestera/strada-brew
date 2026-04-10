import { accurateClient } from '../../client';

/**
 * /api/data-classification/delete.do
 * Menghapus data Kategori Keuangan berdasarkan id tertentu
 */
export async function dataClassificationDelete(params: any) {
  return accurateClient.delete('/api/data-classification/delete.do', params);
}
