import { accurateClient } from '../../client';

/**
 * /api/currency/bulk-save.do
 * Membuat mengedit beberapa data Mata Uang sekaligus (Max: 100 data dalam 1 kali request). Ganti nama parameter "[n]" dengan index data mulai dari nol (Cth: data[0], data[1], dst.) pada parameter request.
 */
export async function currencyBulkSave(data: any) {
  return accurateClient.post('/api/currency/bulk-save.do', data);
}
