import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
    import.meta.env.VITE_SUPABASE_URL;

const supabaseKey =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log("========== SUPABASE DEBUG ==========");
console.log("Supabase URL:", supabaseUrl);
console.log("Supabase Key exists:", !!supabaseKey);
console.log("Supabase URL type:", typeof supabaseUrl);
console.log("Supabase Key type:", typeof supabaseKey);
console.log("====================================");

if (!supabaseUrl) {
    throw new Error("VITE_SUPABASE_URL is missing");
}

if (!supabaseKey) {
    throw new Error(
        "VITE_SUPABASE_PUBLISHABLE_KEY is missing"
    );
}

export const supabase = createClient(
    supabaseUrl,
    supabaseKey
);

// TEMPORARY DEBUG
fetch(`${supabaseUrl}/auth/v1/settings`, {
    method: "GET",
    headers: {
        apikey: supabaseKey
    }
})
    .then(async (response) => {
        console.log(
            "[SUPABASE TEST] Status:",
            response.status
        );

        console.log(
            "[SUPABASE TEST] Response:",
            await response.text()
        );
    })
    .catch((error) => {
        console.error(
            "[SUPABASE TEST] Error:",
            error
        );
    });