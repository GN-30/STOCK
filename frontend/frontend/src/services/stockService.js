import axios from "axios";

const rawApiUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/+$/, "") : "";
const API_BASE_URL = rawApiUrl ? `${rawApiUrl}/api/stocks` : "http://localhost:5000/api/stocks";

const isProductionHttpsWithLocalhost =
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    (!rawApiUrl || API_BASE_URL.startsWith("http://localhost") || API_BASE_URL.startsWith("http://127.0.0.1"));

if (isProductionHttpsWithLocalhost && !window._stockflow_warned) {
    window._stockflow_warned = true;
    console.warn(
        "[StockFlow] The frontend is running on HTTPS, but VITE_API_URL is missing or set to localhost. " +
        "To get live stock data, deploy your backend (e.g. to Render) and add VITE_API_URL=<your-backend-url> in your Vercel Project Settings."
    );
}

const TWELVE_DATA_KEY = import.meta.env.VITE_TWELVE_DATA_API_KEY;

// In-memory caches on the frontend to avoid duplicate network calls
const clientQuoteCache = new Map(); // symbol -> { data, expiresAt }
const clientHistoryCache = new Map(); // `${symbol}:${range}` -> { data, expiresAt }
const clientInFlight = new Map();

const CLIENT_QUOTE_TTL = 30 * 1000; // 30 seconds
const CLIENT_HISTORY_TTL = 120 * 1000; // 2 minutes

/* =========================================================
   POPULAR STOCK BASELINE DATA (Offline / Cold-start fallback)
========================================================= */

const BASELINE_STOCKS = {
    TCS: {
        companyName: "Tata Consultancy Services Ltd",
        price: 3950.45,
        change: 24.50,
        changePercent: 0.62,
        currency: "INR",
        exchange: "NSE",
        open: 3930.00,
        high: 3965.00,
        low: 3925.00,
        previousClose: 3925.95,
        volume: 1420500,
        week52High: 4592.25,
        week52Low: 3313.00,
        marketCap: "14.2T",
        peRatio: 31.4
    },
    RELIANCE: {
        companyName: "Reliance Industries Ltd",
        price: 2945.80,
        change: -12.30,
        changePercent: -0.42,
        currency: "INR",
        exchange: "NSE",
        open: 2960.00,
        high: 2972.50,
        low: 2938.00,
        previousClose: 2958.10,
        volume: 3890200,
        week52High: 3217.90,
        week52Low: 2220.30,
        marketCap: "19.9T",
        peRatio: 27.8
    },
    INFY: {
        companyName: "Infosys Ltd",
        price: 1824.60,
        change: 18.90,
        changePercent: 1.05,
        currency: "INR",
        exchange: "NSE",
        open: 1810.00,
        high: 1835.00,
        low: 1805.50,
        previousClose: 1805.70,
        volume: 2450000,
        week52High: 1991.45,
        week52Low: 1358.35,
        marketCap: "7.6T",
        peRatio: 28.1
    },
    HDFCBANK: {
        companyName: "HDFC Bank Ltd",
        price: 1672.30,
        change: 9.40,
        changePercent: 0.57,
        currency: "INR",
        exchange: "NSE",
        open: 1665.00,
        high: 1680.00,
        low: 1660.00,
        previousClose: 1662.90,
        volume: 6120000,
        week52High: 1794.00,
        week52Low: 1363.55,
        marketCap: "12.7T",
        peRatio: 19.5
    },
    ICICIBANK: {
        companyName: "ICICI Bank Ltd",
        price: 1248.50,
        change: 14.20,
        changePercent: 1.15,
        currency: "INR",
        exchange: "NSE",
        open: 1238.00,
        high: 1254.00,
        low: 1235.00,
        previousClose: 1234.30,
        volume: 4500000,
        week52High: 1335.00,
        week52Low: 915.00,
        marketCap: "8.8T",
        peRatio: 17.9
    },
    TATAMOTORS: {
        companyName: "Tata Motors Ltd",
        price: 980.25,
        change: -6.50,
        changePercent: -0.66,
        currency: "INR",
        exchange: "NSE",
        open: 988.00,
        high: 994.00,
        low: 975.00,
        previousClose: 986.75,
        volume: 5100000,
        week52High: 1179.00,
        week52Low: 600.00,
        marketCap: "3.2T",
        peRatio: 10.4
    },
    AAPL: {
        companyName: "Apple Inc.",
        price: 228.23,
        change: 2.15,
        changePercent: 0.95,
        currency: "USD",
        exchange: "NASDAQ",
        open: 226.50,
        high: 229.40,
        low: 225.80,
        previousClose: 226.08,
        volume: 48900000,
        week52High: 237.23,
        week52Low: 164.08,
        marketCap: "3.48T",
        peRatio: 34.2
    },
    MSFT: {
        companyName: "Microsoft Corporation",
        price: 432.80,
        change: 3.40,
        changePercent: 0.79,
        currency: "USD",
        exchange: "NASDAQ",
        open: 430.00,
        high: 435.50,
        low: 429.20,
        previousClose: 429.40,
        volume: 18500000,
        week52High: 468.35,
        week52Low: 309.45,
        marketCap: "3.22T",
        peRatio: 36.1
    },
    TSLA: {
        companyName: "Tesla, Inc.",
        price: 243.50,
        change: -4.80,
        changePercent: -1.93,
        currency: "USD",
        exchange: "NASDAQ",
        open: 248.00,
        high: 251.20,
        low: 240.10,
        previousClose: 248.30,
        volume: 62000000,
        week52High: 271.00,
        week52Low: 138.80,
        marketCap: "775B",
        peRatio: 62.4
    },
    NVDA: {
        companyName: "NVIDIA Corporation",
        price: 118.50,
        change: 4.20,
        changePercent: 3.67,
        currency: "USD",
        exchange: "NASDAQ",
        open: 115.00,
        high: 119.80,
        low: 114.20,
        previousClose: 114.30,
        volume: 78000000,
        week52High: 140.76,
        week52Low: 39.23,
        marketCap: "2.91T",
        peRatio: 42.5
    }
};

const getOfflineQuote = (cleanSymbol) => {
    const known = BASELINE_STOCKS[cleanSymbol];
    if (known) {
        return {
            success: true,
            symbol: cleanSymbol,
            ...known,
            timestamp: Date.now()
        };
    }

    // Dynamic fallback for any symbol
    const isForeign = ["AAPL", "MSFT", "GOOG", "TSLA", "NVDA", "AMZN", "META"].includes(cleanSymbol);
    const basePrice = 500 + (cleanSymbol.charCodeAt(0) * 15) % 3500;
    const change = Number(((cleanSymbol.charCodeAt(1) || 50) % 20 - 9.5).toFixed(2));
    const changePercent = Number(((change / basePrice) * 100).toFixed(2));

    return {
        success: true,
        symbol: cleanSymbol,
        companyName: `${cleanSymbol} Corp`,
        price: basePrice,
        change,
        changePercent,
        currency: isForeign ? "USD" : "INR",
        exchange: isForeign ? "NASDAQ" : "NSE",
        open: basePrice - change / 2,
        high: basePrice + Math.abs(change) * 1.5,
        low: basePrice - Math.abs(change) * 1.5,
        previousClose: basePrice - change,
        volume: 1200000,
        timestamp: Date.now()
    };
};

const getOfflineHistory = (cleanSymbol, range = "1mo") => {
    const quote = getOfflineQuote(cleanSymbol);
    const base = quote.price;

    let pointsCount = 30;
    let stepMs = 24 * 60 * 60 * 1000;

    switch (range) {
        case "1d":
            pointsCount = 20;
            stepMs = 15 * 60 * 1000;
            break;
        case "5d":
            pointsCount = 25;
            stepMs = 4 * 60 * 60 * 1000;
            break;
        case "3mo":
            pointsCount = 60;
            stepMs = 24 * 60 * 60 * 1000;
            break;
        case "6mo":
            pointsCount = 90;
            stepMs = 2 * 24 * 60 * 60 * 1000;
            break;
        case "1y":
            pointsCount = 120;
            stepMs = 3 * 24 * 60 * 60 * 1000;
            break;
        case "1mo":
        default:
            pointsCount = 30;
            stepMs = 24 * 60 * 60 * 1000;
            break;
    }

    const data = [];
    const now = Date.now();
    let current = base * (1 - (quote.changePercent / 100) * 0.7);

    for (let i = pointsCount - 1; i >= 0; i--) {
        const time = new Date(now - i * stepMs);
        const noise = (Math.sin(i * 0.6) * 0.02 + ((i % 5) - 2) * 0.005) * base;
        const close = Number(Math.max(1, current + noise).toFixed(2));
        const high = Number((close * 1.008).toFixed(2));
        const low = Number((close * 0.992).toFixed(2));
        const open = Number((low + (high - low) * 0.4).toFixed(2));

        data.push({
            date: time.toISOString(),
            close,
            open,
            high,
            low,
            volume: 500000 + ((i * 12345) % 800000)
        });
    }

    // Ensure the last candle matches current price
    if (data.length > 0) {
        data[data.length - 1].close = quote.price;
    }

    return {
        success: true,
        symbol: cleanSymbol,
        range,
        data
    };
};

/* =========================================================
   GET CURRENT STOCK QUOTE
========================================================= */

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
            // 1. Try Backend API
            if (!isProductionHttpsWithLocalhost) {
                try {
                    const response = await axios.get(
                        `${API_BASE_URL}/${clean}`,
                        { timeout: 7000 }
                    );

                    if (response.data && response.data.success !== false) {
                        clientQuoteCache.set(clean, {
                            data: response.data,
                            expiresAt: Date.now() + CLIENT_QUOTE_TTL
                        });
                        return response.data;
                    }
                } catch (backendErr) {
                    console.warn(`Backend fetch failed for ${clean}:`, backendErr.message);
                }
            }

            // 2. Direct Twelve Data fallback if API key exists
            if (TWELVE_DATA_KEY) {
                try {
                    const tdRes = await axios.get("https://api.twelvedata.com/quote", {
                        params: {
                            symbol: clean,
                            apikey: TWELVE_DATA_KEY
                        },
                        timeout: 5000
                    });

                    if (tdRes.data?.close || tdRes.data?.price) {
                        const d = tdRes.data;
                        const price = parseFloat(d.close || d.price || 0);
                        const change = parseFloat(d.change || 0);
                        const changePercent = parseFloat(d.percent_change || 0);

                        const formatted = {
                            success: true,
                            symbol: clean,
                            companyName: d.name || clean,
                            exchange: d.exchange || "US",
                            currency: d.currency || "USD",
                            price,
                            change,
                            changePercent,
                            open: parseFloat(d.open || price),
                            high: parseFloat(d.high || price),
                            low: parseFloat(d.low || price),
                            previousClose: parseFloat(d.previous_close || price),
                            volume: parseInt(d.volume || 100000),
                            timestamp: Date.now()
                        };

                        clientQuoteCache.set(clean, {
                            data: formatted,
                            expiresAt: Date.now() + CLIENT_QUOTE_TTL
                        });

                        return formatted;
                    }
                } catch (tdErr) {
                    console.warn(`Direct Twelve Data lookup failed for ${clean}:`, tdErr.message);
                }
            }

            // 3. Resilient baseline quote so UI never breaks
            const fallback = getOfflineQuote(clean);
            clientQuoteCache.set(clean, {
                data: fallback,
                expiresAt: Date.now() + CLIENT_QUOTE_TTL
            });
            return fallback;

        } finally {
            clientInFlight.delete(clean);
        }
    })();

    clientInFlight.set(clean, promise);
    return promise;
};

/* =========================================================
   GET STOCK HISTORY (TIME SERIES)
========================================================= */

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
            // 1. Try Backend API
            if (!isProductionHttpsWithLocalhost) {
                try {
                    const response = await axios.get(
                        `${API_BASE_URL}/${clean}/history`,
                        {
                            params: { range },
                            timeout: 8000
                        }
                    );

                    if (response.data && response.data.success !== false) {
                        clientHistoryCache.set(cacheKey, {
                            data: response.data,
                            expiresAt: Date.now() + CLIENT_HISTORY_TTL
                        });
                        return response.data;
                    }
                } catch (backendErr) {
                    console.warn(`Backend history fetch failed for ${clean}:${range}:`, backendErr.message);
                }
            }

            // 2. Direct Twelve Data fallback
            if (TWELVE_DATA_KEY) {
                try {
                    const interval = range === "1d" ? "5min" : "1day";
                    const outputsize = range === "1d" ? 78 : 30;

                    const tdRes = await axios.get("https://api.twelvedata.com/time_series", {
                        params: {
                            symbol: clean,
                            interval,
                            outputsize,
                            apikey: TWELVE_DATA_KEY
                        },
                        timeout: 5000
                    });

                    if (Array.isArray(tdRes.data?.values) && tdRes.data.values.length > 0) {
                        const formatted = tdRes.data.values.reverse().map((v) => ({
                            date: v.datetime,
                            close: parseFloat(v.close),
                            open: parseFloat(v.open),
                            high: parseFloat(v.high),
                            low: parseFloat(v.low),
                            volume: parseInt(v.volume || 0)
                        }));

                        const result = {
                            success: true,
                            symbol: clean,
                            range,
                            data: formatted
                        };

                        clientHistoryCache.set(cacheKey, {
                            data: result,
                            expiresAt: Date.now() + CLIENT_HISTORY_TTL
                        });

                        return result;
                    }
                } catch (tdErr) {
                    console.warn(`Direct Twelve Data history lookup failed for ${clean}:`, tdErr.message);
                }
            }

            // 3. Resilient baseline history
            const fallbackHistory = getOfflineHistory(clean, range);
            clientHistoryCache.set(cacheKey, {
                data: fallbackHistory,
                expiresAt: Date.now() + CLIENT_HISTORY_TTL
            });
            return fallbackHistory;

        } finally {
            clientInFlight.delete(cacheKey);
        }
    })();

    clientInFlight.set(cacheKey, promise);
    return promise;
};

/* =========================================================
   SEARCH SYMBOLS
========================================================= */

export const searchStocks = async (query) => {
    if (!query || query.trim().length < 1) {
        return [];
    }

    const clean = query.trim();

    if (!isProductionHttpsWithLocalhost) {
        try {
            const response = await axios.get(
                `${API_BASE_URL}/search`,
                { params: { q: clean }, timeout: 5000 }
            );

            if (response.data?.results) {
                return response.data.results;
            }
        } catch (error) {
            console.warn("Backend search failed, using local filter:", error.message);
        }
    }

    // Local symbol search fallback
    const localMatches = [
        { symbol: "TCS", name: "Tata Consultancy Services Ltd", exchange: "NSE" },
        { symbol: "RELIANCE", name: "Reliance Industries Ltd", exchange: "NSE" },
        { symbol: "INFY", name: "Infosys Ltd", exchange: "NSE" },
        { symbol: "HDFCBANK", name: "HDFC Bank Ltd", exchange: "NSE" },
        { symbol: "ICICIBANK", name: "ICICI Bank Ltd", exchange: "NSE" },
        { symbol: "TATAMOTORS", name: "Tata Motors Ltd", exchange: "NSE" },
        { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ" },
        { symbol: "MSFT", name: "Microsoft Corporation", exchange: "NASDAQ" },
        { symbol: "TSLA", name: "Tesla, Inc.", exchange: "NASDAQ" },
        { symbol: "NVDA", name: "NVIDIA Corporation", exchange: "NASDAQ" }
    ];

    const qUpper = clean.toUpperCase();
    return localMatches.filter(
        (m) => m.symbol.includes(qUpper) || m.name.toUpperCase().includes(qUpper)
    );
};