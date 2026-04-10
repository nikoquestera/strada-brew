import { accurateClient } from '../../client';

/**
 * /api/expense/delete.do
 * Menghapus data Pencatatan Beban berdasarkan id tertentu
 */
export async function expenseDelete(params: any) {
  return accurateClient.delete('/api/expense/delete.do', params);
}
