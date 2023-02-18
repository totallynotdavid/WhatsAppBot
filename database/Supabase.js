const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

SUPABASE_BASE_URL = process.env.SUPABASE_BASE_URL;
SUPABASE_API_KEY = process.env.SUPABASE_API_KEY;

const supabase = createClient(SUPABASE_BASE_URL, SUPABASE_API_KEY);

module.exports = supabase;