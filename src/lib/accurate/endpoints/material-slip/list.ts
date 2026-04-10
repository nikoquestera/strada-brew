import { accurateClient } from '../../client';

/**
 * /api/material-slip/list.do
 * Melihat daftar data Pengambilan Bahan Baku, dengan filter yang sesuai
 */
export async function materialSlipList(params: any) {
  return accurateClient.get('/api/material-slip/list.do', { params });
}
