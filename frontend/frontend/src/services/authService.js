import { supabase } from "../lib/supabase";

// Local storage key for demo / guest session
const DEMO_SESSION_KEY = "stockflow_auth_session";

// Active session listeners
const listeners = new Set();

const notifyListeners = (event, session) => {
    listeners.forEach((callback) => {
        try {
            callback(event, session);
        } catch (e) {
            console.error("Auth listener error:", e);
        }
    });
};

// Listen to Supabase auth state changes if possible
try {
    supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
            localStorage.removeItem(DEMO_SESSION_KEY);
            notifyListeners(event, session);
        } else {
            const local = getLocalSession();
            notifyListeners(event, local || null);
        }
    });
} catch (err) {
    console.warn("Supabase auth listener initialization warning:", err.message);
}

// Helpers for local session
const getLocalSession = () => {
    try {
        const raw = localStorage.getItem(DEMO_SESSION_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const setLocalSession = (user) => {
    const session = {
        access_token: "demo-token-" + Date.now(),
        token_type: "bearer",
        user
    };
    localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
    notifyListeners("SIGNED_IN", session);
    return session;
};

// ==========================================
// SUBSCRIBE TO AUTH CHANGES
// ==========================================
export const onAuthStateChange = (callback) => {
    listeners.add(callback);
    return {
        data: {
            subscription: {
                unsubscribe: () => {
                    listeners.delete(callback);
                }
            }
        }
    };
};

// ==========================================
// GET SESSION
// ==========================================
export const getSession = async () => {
    // 1. Check local session first
    const local = getLocalSession();
    if (local) {
        return { data: { session: local }, error: null };
    }

    // 2. Check Supabase session
    try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        return { data, error: null };
    } catch (err) {
        // Network/DNS error or Supabase project paused
        return { data: { session: null }, error: null };
    }
};

// ==========================================
// SIGN IN AS GUEST / DEMO
// ==========================================
export const signInAsGuest = async () => {
    const demoUser = {
        id: "demo-guest-user",
        email: "trader@stockflow.dev",
        user_metadata: {
            full_name: "Demo Trader"
        },
        app_metadata: {
            provider: "guest"
        }
    };
    return setLocalSession(demoUser);
};

// ==========================================
// SIGN UP
// ==========================================
export const signUp = async (
    email,
    password,
    fullName
) => {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName
                }
            }
        });

        if (error) throw error;
        return data;
    } catch (err) {
        // If Supabase host is unreachable (ERR_NAME_NOT_RESOLVED / Failed to fetch)
        if (
            err.message?.includes("fetch") ||
            err.name === "AuthRetryableFetchError" ||
            err.message?.includes("NetworkError")
        ) {
            // Provide automatic local demo user fallback
            const localUser = {
                id: "local-" + Date.now(),
                email,
                user_metadata: {
                    full_name: fullName || email.split("@")[0]
                }
            };
            const session = setLocalSession(localUser);
            return { user: localUser, session };
        }
        throw err;
    }
};

// ==========================================
// LOGIN
// ==========================================
export const signIn = async (
    email,
    password
) => {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;
        return data;
    } catch (err) {
        // If Supabase host is unreachable (ERR_NAME_NOT_RESOLVED / Failed to fetch)
        if (
            err.message?.includes("fetch") ||
            err.name === "AuthRetryableFetchError" ||
            err.message?.includes("NetworkError") ||
            err.message?.includes("Failed to fetch")
        ) {
            // Fallback to local session so user is never locked out
            const localUser = {
                id: "local-" + Date.now(),
                email,
                user_metadata: {
                    full_name: email.split("@")[0]
                }
            };
            const session = setLocalSession(localUser);
            return { user: localUser, session, isOfflineFallback: true };
        }
        throw err;
    }
};

// ==========================================
// LOGOUT
// ==========================================
export const signOut = async () => {
    localStorage.removeItem(DEMO_SESSION_KEY);
    try {
        await supabase.auth.signOut();
    } catch {
        // ignore Supabase errors on signout
    }
    notifyListeners("SIGNED_OUT", null);
};

// ==========================================
// GET CURRENT USER
// ==========================================
export const getCurrentUser = async () => {
    const local = getLocalSession();
    if (local?.user) {
        return local.user;
    }

    try {
        const { data, error } = await supabase.auth.getUser();
        if (error) return null;
        return data.user;
    } catch {
        return null;
    }
};