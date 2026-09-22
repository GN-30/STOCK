const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

module.exports = supabase;
console.log("Supabase URL:", process.env.SUPABASE_URL);
console.log(
    "Supabase key exists:",
    !!process.env.SUPABASE_KEY
);