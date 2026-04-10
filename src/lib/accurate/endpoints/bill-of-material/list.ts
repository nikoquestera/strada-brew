import { accurateClient } from '../../client';

/**
 * /api/bill-of-material/list.do
 * Melihat daftar data Formula Produksi, dengan filter yang sesuai
 */
export async function billOfMaterialList(params: any) {
  return accurateClient.get('/api/bill-of-material/list.do', { params });
}
