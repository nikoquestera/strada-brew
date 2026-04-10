import { accurateClient } from '../../client';

/**
 * /api/unit/detail.do
 * Melihat detil data Satuan Barang berdasarkan id atau identifier tertentu
 */
export async function unitDetail(params: any) {
  return accurateClient.get('/api/unit/detail.do', { params });
}
