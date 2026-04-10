import { accurateClient } from '../../client';

/**
 * /api/expense/detail.do
 * Melihat detil data Pencatatan Beban berdasarkan id atau identifier tertentu
 */
export async function expenseDetail(params: any) {
  return accurateClient.get('/api/expense/detail.do', { params });
}
