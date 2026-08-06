const { createClient } = require('@supabase/supabase-js');

// These must be provided in the server/.env file
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase URL or Service Role Key missing in environment variables. Application may not function correctly.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

module.exports = supabase;
