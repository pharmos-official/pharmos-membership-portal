import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error('Missing Supabase env vars. Check .env file.');
}

// Admin client — no session persistence (shared staff device, open access)
export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: { persistSession: false },
});

// Customer portal client — persists session in localStorage so customers stay logged in
export const supabaseCustomer = createClient(url ?? '', anonKey ?? '', {
  auth: { persistSession: true, storageKey: 'pharmos-customer-auth' },
});
