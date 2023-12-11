const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const { createClient } = require("@supabase/supabase-js");

const supabase_base_url = process.env.supabase_base_url;
const supabase_api_key = process.env.supabase_api_key;

const supabase = createClient(supabase_base_url, supabase_api_key, {
  auth: {
    persistSession: false,
  },
});

module.exports = supabase;
