import { accurateClient } from '../../client';

/**
 * /api/data-classification/list.do
 * Melihat daftar data Kategori Keuangan, dengan filter yang sesuai
 */
export async function dataClassificationList(params: any) {
  return accurateClient.get('/api/data-classification/list.do', { params });
}
