import { accurateClient } from '../../client';

/**
 * /api/expense/bulk-save.do
 * Membuat mengedit beberapa data Pencatatan Beban sekaligus (Max: 100 data dalam 1 kali request). Ganti nama parameter "[n]" dengan index data mulai dari nol (Cth: data[0], data[1], dst.) pada parameter request.
 */
export async function expenseBulkSave(data: any) {
  return accurateClient.post('/api/expense/bulk-save.do', data);
}
