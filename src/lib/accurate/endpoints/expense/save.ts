import { accurateClient } from '../../client';

/**
 * /api/expense/save.do
 * Membuat data Pencatatan Beban baru atau mengedit data Pencatatan Beban yang sudah ada
 */
export async function expenseSave(data: any) {
  return accurateClient.post('/api/expense/save.do', data);
}
