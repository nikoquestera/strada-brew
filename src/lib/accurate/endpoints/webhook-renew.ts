import { accurateClient } from '../client';

/**
 * /api/webhook-renew.do
 * Memperpanjang lama aktif webhook
 */
export async function webhookRenew(params: any) {
  return accurateClient.get('/api/webhook-renew.do', { params });
}
