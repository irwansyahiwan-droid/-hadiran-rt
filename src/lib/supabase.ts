import { createClient } from '@supabase/supabase-js';
import { buatFetchBerbatas } from './fetchBerbatas';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Batas sabar tiap request dipasang DI SINI, sekali, supaya tak ada jalur baca
// atau tulis yang bisa menggantung selamanya. Alasan lengkap: ./fetchBerbatas.ts
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: buatFetchBerbatas() },
});
