import { accurateClient } from '../../client';

/**
 * /api/fixed-asset/list.do
 * Melihat daftar data Aset Tetap, dengan filter yang sesuai
 */
export async function fixedAssetList(params: any) {
  return accurateClient.get('/api/fixed-asset/list.do', { params });
}
