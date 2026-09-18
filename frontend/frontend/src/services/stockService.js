import axios from "axios";


const API_BASE_URL =
    import.meta.env.VITE_API_URL
        ? `${import.meta.env.VITE_API_URL}/api/stocks`
        : "http://localhost:5000/api/stocks";

// In-memory cache on the frontend to avoid duplicate network calls
const clientQuoteCache = new Map(); // symbol -> { data, expiresAt }
const clientHistoryCache = new Map(); // `${symbol}:${range}` -> { data, expiresAt }
const clientInFlight = new Map();

const CLIENT_QUOTE_TTL = 30 * 1000; // 30 seconds
const CLIENT_HISTORY_TTL = 120 * 1000; // 2 minutes


// ======================================================
// GET CURRENT STOCK QUOTE
// ======================================================

export const getStock = async (symbol, options = {}) => {
    const clean = String(symbol).trim().toUpperCase();
    const { forceRefresh = false } = options;

    if (!forceRefresh) {
        const cached = clientQuoteCache.get(clean);
        if (cached && Date.now() < cached.expiresAt) {
            return cached.data;
        }

        if (clientInFlight.has(clean)) {
            return clientInFlight.get(clean);
        }
    }

    const promise = (async () => {
        try {
            const response = await axios.get(
                `${API_BASE_URL}/${clean}`
            );

            clientQuoteCache.set(clean, {
                data: response.data,
                expiresAt: Date.now() + CLIENT_QUOTE_TTL
            });

            return response.data;

        } catch (error) {
            console.error("Error fetching stock:", error);
            throw error;
        } finally {
            clientInFlight.delete(clean);
        }
    })();

    clientInFlight.set(clean, promise);
    return promise;
};


// ======================================================
// GET STOCK HISTORY (TIME SERIES)
// ======================================================

export const getStockHistory = async (
    symbol,
    range = "1mo",
    options = {}
) => {
    const clean = String(symbol).trim().toUpperCase();
    const cacheKey = `${clean}:${range}`;
    const { forceRefresh = false } = options;

    if (!forceRefresh) {
        const cached = clientHistoryCache.get(cacheKey);
        if (cached && Date.now() < cached.expiresAt) {
            return cached.data;
        }

        if (clientInFlight.has(cacheKey)) {
            return clientInFlight.get(cacheKey);
        }
    }

    const promise = (async () => {
        try {
            const response = await axios.get(
                `${API_BASE_URL}/${clean}/history`,
                { params: { range } }
            );

            clientHistoryCache.set(cacheKey, {
                data: response.data,
                expiresAt: Date.now() + CLIENT_HISTORY_TTL
            });

            return response.data;

        } catch (error) {
            console.error("Error fetching stock history:", error);
            throw error;
        } finally {
            clientInFlight.delete(cacheKey);
        }
    })();

    clientInFlight.set(cacheKey, promise);
    return promise;
};


// ======================================================
// SEARCH SYMBOLS
// ======================================================

export const searchStocks = async (query) => {

    if (!query || query.trim().length < 1) {
        return [];
    }

    try {

        const response = await axios.get(
            `${API_BASE_URL}/search`,
            { params: { q: query.trim() } }
        );

        return response.data?.results || [];

    } catch (error) {

        console.error("Error searching stocks:", error);
        return [];
    }
};