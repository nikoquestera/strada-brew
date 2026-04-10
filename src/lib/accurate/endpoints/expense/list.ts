import { accurateClient } from '../../client';

/**
 * /api/expense/list.do
 * Melihat daftar data Pencatatan Beban, dengan filter yang sesuai
 */
export async function expenseList(params: any) {
  return accurateClient.get('/api/expense/list.do', { params });
}
