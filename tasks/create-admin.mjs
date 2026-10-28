import { createClient } from '@supabase/supabase-js';

const url = 'https://backend.miaoda.online/projects/supabase366463487624396800';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoyMTA2Nzk4OTA0LCJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIiwic3ViIjoiYW5vbiJ9.yP1aYbnsG3pFATehXLqWD3yn93_KJg3jwNQdwTgpfnA';
const password = process.argv[2];

const supabase = createClient(url, anonKey);
const { data, error } = await supabase.auth.signUp({
  email: 'admin@miaoda.com',
  password,
});
if (error) {
  console.error('SIGNUP_FAILED:', error.message);
  process.exit(1);
}
console.log('SIGNUP_OK:', data.user?.id ?? 'no-id');