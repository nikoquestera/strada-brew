import http from 'http';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

require('dotenv').config({ path: '.env.local' });

const clientId = process.env.ACCURATE_OAUTH_CLIENT_ID!;
const clientSecret = process.env.ACCURATE_OAUTH_CLIENT_SECRET!;
const redirectUri = 'http://localhost:8080/api/accurate/callback';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SERVICE_SUPABASE_KEY!);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url!, `http://${req.headers.host}`);
  
  if (url.pathname === '/api/accurate/callback') {
    const code = url.searchParams.get('code');
    if (!code) {
      res.writeHead(400);
      res.end('No code provided');
      return;
    }

    try {
      const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const response = await axios.post('https://account.accurate.id/oauth/token', 
        new URLSearchParams({
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri
        }).toString(),
        {
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const { access_token, refresh_token, expires_in } = response.data;
      const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

      // Upsert using eq user_id to avoid unique constraint if it already exists,
      // or we can just update the most recent token directly.
      const testUserId = 'a6752b19-8eb9-4237-ac24-d6dd84875431'; 

      const { data: existing } = await supabase.from('accurate_tokens').select('id').eq('user_id', testUserId).maybeSingle();
      
      if (existing) {
        await supabase.from('accurate_tokens').update({
          access_token,
          refresh_token,
          expires_at: expiresAt,
          updated_at: new Date().toISOString()
        }).eq('id', existing.id);
      } else {
        await supabase.from('accurate_tokens').insert({
          user_id: testUserId,
          access_token,
          refresh_token,
          expires_at: expiresAt,
          updated_at: new Date().toISOString()
        });
      }

      console.log('\n--- TOKEN OBTAINED LOCALLY ---');
      console.log('Access Token:', access_token);
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>Authentication Successful!</h1><p>You can close this window now.</p>');
      
      // Test the token
      const dbListRes = await axios.get('https://account.accurate.id/api/db-list.do', { headers: { 'Authorization': `Bearer ${access_token}` } });
      console.log('db-list.do output:', dbListRes.data);
      
      process.exit(0);
    } catch (err: any) {
      console.error('Error exchanging code:', err.response?.data || err.message);
      res.writeHead(500);
      res.end('Failed to exchange code: ' + JSON.stringify(err.response?.data || err.message));
    }
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(8080, () => {
  console.log(`\nLocal Auth Server running on http://localhost:8080`);
  const scope = 'glaccount_view company_data journal_voucher_save journal_voucher_view journal_voucher_delete purchase_invoice_view purchase_payment_view';
  const authUrl = `https://account.accurate.id/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
  console.log(`\nPlease ask the user to visit this URL to authenticate:\n\n${authUrl}\n`);
});
