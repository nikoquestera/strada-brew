import { accurateClient } from '../../client';

/**
 * /api/fixed-asset/detail.do
 * Melihat detil data Aset Tetap berdasarkan id atau identifier tertentu
 */
export async function fixedAssetDetail(params: any) {
  return accurateClient.get('/api/fixed-asset/detail.do', { params });
}
