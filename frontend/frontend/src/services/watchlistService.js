import { supabase } from "../lib/supabase";
import { getCurrentUser as getAuthCurrentUser } from "./authService";

/* =========================================================
   LOCAL STORAGE & DEFAULT WATCHLIST HELPERS
========================================================= */

const LOCAL_WATCHLIST_PREFIX = "stockflow_watchlist_";

const DEFAULT_WATCHLIST = [
    {
        id: "def-1",
        symbol: "TCS",
        company_name: "Tata Consultancy Services Ltd",
        created_at: new Date().toISOString()
    },
    {
        id: "def-2",
        symbol: "RELIANCE",
        company_name: "Reliance Industries Ltd",
        created_at: new Date().toISOString()
    },
    {
        id: "def-3",
        symbol: "INFY",
        company_name: "Infosys Ltd",
        created_at: new Date().toISOString()
    },
    {
        id: "def-4",
        symbol: "HDFCBANK",
        company_name: "HDFC Bank Ltd",
        created_at: new Date().toISOString()
    },
    {
        id: "def-5",
        symbol: "AAPL",
        company_name: "Apple Inc.",
        created_at: new Date().toISOString()
    }
];

const getLocalWatchlist = (userId = "guest") => {
    try {
        const key = `${LOCAL_WATCHLIST_PREFIX}${userId}`;
        const raw = localStorage.getItem(key);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        }
        // If guest or empty, initialize with default list
        localStorage.setItem(key, JSON.stringify(DEFAULT_WATCHLIST));
        return DEFAULT_WATCHLIST;
    } catch {
        return DEFAULT_WATCHLIST;
    }
};

const setLocalWatchlist = (userId = "guest", list) => {
    try {
        const key = `${LOCAL_WATCHLIST_PREFIX}${userId}`;
        localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {
        console.warn("Failed to persist local watchlist:", e);
    }
};

/* =========================================================
   SAFE USER RETRIEVAL
========================================================= */

const getUserSafely = async () => {
    try {
        const user = await getAuthCurrentUser();
        return user || null;
    } catch {
        return null;
    }
};

const isGuestOrLocalUser = (user) => {
    if (!user) return true;
    const uid = String(user.id || "");
    return (
        user.app_metadata?.provider === "guest" ||
        uid.startsWith("demo-") ||
        uid.startsWith("local-") ||
        uid === "demo-guest-user"
    );
};

/* =========================================================
   GET WATCHLIST
========================================================= */

export const getWatchlist = async () => {
    const user = await getUserSafely();
    const userId = user?.id || "guest";

    // Guest / Offline fallback
    if (isGuestOrLocalUser(user)) {
        return getLocalWatchlist(userId);
    }

    // Authenticated Supabase user
    try {
        const { data, error } = await supabase
            .from("watchlists")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (error) {
            console.warn("Supabase watchlist error, using local fallback:", error.message);
            return getLocalWatchlist(user.id);
        }

        if (data && data.length > 0) {
            setLocalWatchlist(user.id, data);
            return data;
        }

        // If Supabase table is empty, check if there was a local watchlist
        const local = getLocalWatchlist(user.id);
        if (local && local.length > 0) {
            return local;
        }

        return data || [];
    } catch (err) {
        console.warn("Error loading watchlist from Supabase, falling back locally:", err);
        return getLocalWatchlist(user.id);
    }
};

/* =========================================================
   ADD SINGLE STOCK (MANUAL ENTRY)
========================================================= */

export const addToWatchlist = async (symbol, companyName = "") => {
    const cleanSymbol = String(symbol || "").trim().toUpperCase();
    const cleanCompanyName = String(companyName || "").trim() || cleanSymbol;

    if (!cleanSymbol) {
        throw new Error("Stock symbol is required.");
    }

    const user = await getUserSafely();
    const userId = user?.id || "guest";
    const isGuest = isGuestOrLocalUser(user);

    if (isGuest) {
        const current = getLocalWatchlist(userId);
        const existing = current.find((item) => item.symbol === cleanSymbol);
        if (existing) return existing;

        const newItem = {
            id: "local-" + Date.now(),
            user_id: userId,
            symbol: cleanSymbol,
            company_name: cleanCompanyName,
            created_at: new Date().toISOString()
        };
        const updated = [newItem, ...current];
        setLocalWatchlist(userId, updated);
        return newItem;
    }

    // Authenticated user with Supabase
    try {
        const { data, error } = await supabase
            .from("watchlists")
            .upsert(
                {
                    user_id: user.id,
                    symbol: cleanSymbol,
                    company_name: cleanCompanyName
                },
                { onConflict: "user_id,symbol" }
            )
            .select()
            .single();

        if (error) throw error;

        // Keep local cache in sync
        const current = getLocalWatchlist(userId);
        if (!current.some((item) => item.symbol === cleanSymbol)) {
            setLocalWatchlist(userId, [data, ...current]);
        }

        return data;
    } catch (err) {
        console.warn("Supabase add error, saving locally:", err.message);
        const current = getLocalWatchlist(userId);
        const existing = current.find((item) => item.symbol === cleanSymbol);
        if (existing) return existing;

        const newItem = {
            id: "item-" + Date.now(),
            user_id: userId,
            symbol: cleanSymbol,
            company_name: cleanCompanyName,
            created_at: new Date().toISOString()
        };
        const updated = [newItem, ...current];
        setLocalWatchlist(userId, updated);
        return newItem;
    }
};

/* =========================================================
   ADD MULTIPLE COMPANIES (EXCEL UPLOAD)
========================================================= */

export const addCompaniesToWatchlist = async (companies) => {
    if (!companies || companies.length === 0) {
        return [];
    }

    const user = await getUserSafely();
    const userId = user?.id || "guest";
    const isGuest = isGuestOrLocalUser(user);

    // Clean and remove duplicates
    const seenSymbols = new Set();
    const uniqueCompanies = [];

    for (const company of companies) {
        const cleanSymbol = String(company.symbol || "").trim().toUpperCase();
        if (!cleanSymbol || seenSymbols.has(cleanSymbol)) continue;

        seenSymbols.add(cleanSymbol);
        uniqueCompanies.push({
            id: "excel-" + Date.now() + "-" + cleanSymbol,
            user_id: userId,
            symbol: cleanSymbol,
            company_name: String(company.companyName || cleanSymbol).trim(),
            created_at: new Date().toISOString()
        });
    }

    if (uniqueCompanies.length === 0) return [];

    if (isGuest) {
        const current = getLocalWatchlist(userId);
        const currentSymbols = new Set(current.map((c) => c.symbol));
        const toAdd = uniqueCompanies.filter((c) => !currentSymbols.has(c.symbol));
        const updated = [...toAdd, ...current];
        setLocalWatchlist(userId, updated);
        return updated;
    }

    // Insert to Supabase in chunks
    const CHUNK_SIZE = 500;
    let savedCompanies = [];

    try {
        for (let i = 0; i < uniqueCompanies.length; i += CHUNK_SIZE) {
            const chunk = uniqueCompanies.slice(i, i + CHUNK_SIZE).map((item) => ({
                user_id: user.id,
                symbol: item.symbol,
                company_name: item.company_name
            }));

            const { data, error } = await supabase
                .from("watchlists")
                .upsert(chunk, { onConflict: "user_id,symbol" })
                .select();

            if (error) throw error;
            if (data) savedCompanies = savedCompanies.concat(data);
        }

        // Sync local cache
        const current = getLocalWatchlist(userId);
        const currentSymbols = new Set(current.map((c) => c.symbol));
        const toAdd = savedCompanies.filter((c) => !currentSymbols.has(c.symbol));
        setLocalWatchlist(userId, [...toAdd, ...current]);

        return savedCompanies;
    } catch (err) {
        console.warn("Supabase bulk insert error, saving locally:", err.message);
        const current = getLocalWatchlist(userId);
        const currentSymbols = new Set(current.map((c) => c.symbol));
        const toAdd = uniqueCompanies.filter((c) => !currentSymbols.has(c.symbol));
        const updated = [...toAdd, ...current];
        setLocalWatchlist(userId, updated);
        return updated;
    }
};

/* =========================================================
   REMOVE STOCK
========================================================= */

export const removeFromWatchlist = async (symbol) => {
    const cleanSymbol = String(symbol || "").trim().toUpperCase();
    if (!cleanSymbol) return;

    const user = await getUserSafely();
    const userId = user?.id || "guest";
    const isGuest = isGuestOrLocalUser(user);

    // Remove from local storage
    const current = getLocalWatchlist(userId);
    const updated = current.filter((item) => item.symbol !== cleanSymbol);
    setLocalWatchlist(userId, updated);

    if (!isGuest && user?.id) {
        try {
            await supabase
                .from("watchlists")
                .delete()
                .eq("user_id", user.id)
                .eq("symbol", cleanSymbol);
        } catch (err) {
            console.warn("Supabase delete error:", err.message);
        }
    }
};

/* =========================================================
   CHECK WATCHLIST STATUS (NEVER THROWS)
========================================================= */

export const isInWatchlist = async (symbol) => {
    try {
        const cleanSymbol = String(symbol || "").trim().toUpperCase();
        if (!cleanSymbol) return false;

        const user = await getUserSafely();
        const userId = user?.id || "guest";
        const isGuest = isGuestOrLocalUser(user);

        if (isGuest) {
            const current = getLocalWatchlist(userId);
            return current.some((item) => item.symbol === cleanSymbol);
        }

        try {
            const { data, error } = await supabase
                .from("watchlists")
                .select("id")
                .eq("user_id", user.id)
                .eq("symbol", cleanSymbol)
                .maybeSingle();

            if (error || !data) {
                // Check local storage fallback
                const current = getLocalWatchlist(userId);
                return current.some((item) => item.symbol === cleanSymbol);
            }

            return !!data;
        } catch {
            const current = getLocalWatchlist(userId);
            return current.some((item) => item.symbol === cleanSymbol);
        }
    } catch {
        return false;
    }
};