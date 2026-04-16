import { createClient } from '@supabase/supabase-js';

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SERVICE_SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listTokens() {
  const { data, error } = await supabase.from('accurate_tokens').select('*');
  console.log(data);
}

listTokens();