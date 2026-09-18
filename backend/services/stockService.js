const axios = require("axios");

// ======================================================
// CONFIGURATION
// ======================================================

const YAHOO_BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart";
const TWELVE_DATA_BASE_URL = "https://api.twelvedata.com";
const API_KEY = process.env.TWELVE_DATA_API_KEY;

// Cache TTLs in milliseconds
const QUOTE_CACHE_TTL_MS = 60 * 1000;         // 60 seconds for quotes
const HISTORY_CACHE_TTL_MS = 5 * 60 * 1000;   // 5 minutes for charts
const SEARCH_CACHE_TTL_MS = 60 * 60 * 1000;   // 1 hour for search

// In-memory caches to eliminate unnecessary API calls
const quoteCache = new Map();       // symbol -> { data, expiresAt }
const historyCache = new Map();     // `${symbol}:${range}` -> { data, expiresAt }
const searchCache = new Map();      // query -> { data, expiresAt }
const inFlightRequests = new Map(); // deduplicate concurrent calls

// Valid time ranges
const VALID_RANGES = ["1d", "5d", "1mo", "3mo", "6mo", "1y"];

// Well-known foreign / US ticker symbols
const KNOWN_FOREIGN_SYMBOLS = new Set([
    "AAPL", "MSFT", "GOOG", "GOOGL", "AMZN", "TSLA", "NVDA", "META",
    "NFLX", "AMD", "INTC", "IBM", "BABA", "UBER", "COIN", "DIS",
    "PYPL", "ADBE", "ORCL", "CRM", "SPOT", "QCOM", "NKE", "SBUX",
    "JPM", "V", "MA", "WMT", "PG", "JNJ", "HD", "BAC", "XOM", "CVX",
    "KO", "PEP", "MCD", "COST", "ABBV", "AVGO", "CSCO", "ACN", "LIN",
    "TXN", "PM", "UNH", "NEE", "HON", "RTX", "LOW", "CAT", "GE",
    "DE", "BA", "GS", "MS", "PLTR", "ARM", "SNOW", "SQ", "SHOP",
    "PANW", "CRWD", "NOW", "INTU", "AMAT", "MU", "LRCX", "ADI"
]);

// Popular Indian stocks for local symbol search matching
const POPULAR_INDIAN_STOCKS = [
    { symbol: "TCS", name: "Tata Consultancy Services", exchange: "NSE", country: "India", currency: "INR" },
    { symbol: "RELIANCE", name: "Reliance Industries Ltd", exchange: "NSE", country: "India", currency: "INR" },
    { symbol: "INFY", name: "Infosys Ltd", exchange: "NSE", country: "India", currency: "INR" },
    { symbol: "HDFCBANK", name: "HDFC Bank Ltd", exchange: "NSE", country: "India", currency: "INR" },
    { symbol: "ICICIBANK", name: "ICICI Bank Ltd", exchange: "NSE", country: "India", currency: "INR" },
    { symbol: "TATAMOTORS", name: "Tata Motors Ltd", exchange: "NSE", country: "India", currency: "INR" },
    { symbol: "SBIN", name: "State Bank of India", exchange: "NSE", country: "India", currency: "INR" },
    { symbol: "ITC", name: "ITC Ltd", exchange: "NSE", country: "India", currency: "INR" },
    { symbol: "WIPRO", name: "Wipro Ltd", exchange: "NSE", country: "India", currency: "INR" },
    { symbol: "BHARTIARTL", name: "Bharti Airtel Ltd", exchange: "NSE", country: "India", currency: "INR" },
    { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", exchange: "NSE", country: "India", currency: "INR" },
    { symbol: "LT", name: "Larsen & Toubro Ltd", exchange: "NSE", country: "India", currency: "INR" },
    { symbol: "MARUTI", name: "Maruti Suzuki India Ltd", exchange: "NSE", country: "India", currency: "INR" },
    { symbol: "ASIANPAINT", name: "Asian Paints Ltd", exchange: "NSE", country: "India", currency: "INR" },
    { symbol: "BAJFINANCE", name: "Bajaj Finance Ltd", exchange: "NSE", country: "India", currency: "INR" },
    { symbol: "TITAN", name: "Titan Company Ltd", exchange: "NSE", country: "India", currency: "INR" },
    { symbol: "HCLTECH", name: "HCL Technologies Ltd", exchange: "NSE", country: "India", currency: "INR" },
    { symbol: "SUNPHARMA", name: "Sun Pharmaceutical Industries", exchange: "NSE", country: "India", currency: "INR" },
    { symbol: "AXISBANK", name: "Axis Bank Ltd", exchange: "NSE", country: "India", currency: "INR" },
    { symbol: "ZOMATO", name: "Zomato Ltd", exchange: "NSE", country: "India", currency: "INR" }
];


// ======================================================
// SYMBOL ROUTING DETECTOR
// ======================================================

/**
 * Returns true if the stock symbol represents an Indian company (NSE/BSE).
 * Returns false if the stock symbol represents a foreign company.
 */
const isIndianSymbol = (symbol) => {
    const clean = String(symbol).trim().toUpperCase();

    // Explicit exchange indicators
    if (
        clean.endsWith(".NS") ||
        clean.endsWith(".BO") ||
        clean.includes(":NSE") ||
        clean.includes(":BSE")
    ) {
        return true;
    }

    if (
        clean.includes(":NASDAQ") ||
        clean.includes(":NYSE") ||
        clean.endsWith(".US")
    ) {
        return false;
    }

    // Check known foreign symbols
    if (KNOWN_FOREIGN_SYMBOLS.has(clean)) {
        return false;
    }

    // Default to Indian (StockFlow is an NSE/BSE focused tracker)
    return true;
};

// Convert symbol for Yahoo Finance
const getYahooSymbol = (symbol, isIndian = true) => {
    const clean = String(symbol).trim().toUpperCase();
    if (clean.includes(":")) {
        const parts = clean.split(":");
        if (parts[1] === "NSE") return `${parts[0]}.NS`;
        if (parts[1] === "BSE") return `${parts[0]}.BO`;
        return parts[0];
    }
    if (clean.endsWith(".NS") || clean.endsWith(".BO")) {
        return clean;
    }
    return isIndian ? `${clean}.NS` : clean;
};

// Convert symbol for Twelve Data
const getTwelveSymbol = (symbol) => {
    const clean = String(symbol).trim().toUpperCase();
    if (clean.includes(":")) return clean;
    if (clean.endsWith(".NS")) return clean.replace(".NS", ":NSE");
    if (clean.endsWith(".BO")) return clean.replace(".BO", ":BSE");
    return clean;
};


// ======================================================
// YAHOO FINANCE HANDLER (FOR INDIAN STOCKS)
// ======================================================

const getYahooInterval = (range) => {
    switch (range) {
        case "1d": return "5m";
        case "5d": return "15m";
        case "1mo":
        case "3mo":
        case "6mo":
        case "1y":
        default: return "1d";
    }
};

const fetchYahooQuote = async (rawSymbol, isIndian = true) => {
    const yahooSymbol = getYahooSymbol(rawSymbol, isIndian);

    const response = await axios.get(
        `${YAHOO_BASE_URL}/${yahooSymbol}`,
        {
            params: {
                range: "1d",
                interval: "5m",
                events: "history"
            },
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            },
            timeout: 15000
        }
    );

    const result = response.data?.chart?.result?.[0];
    if (!result) {
        throw new Error(`Stock data not available for ${rawSymbol}`);
    }

    const meta = result.meta || {};
    const price = Number(meta.regularMarketPrice);
    const previousClose = Number(meta.previousClose || meta.chartPreviousClose || 0);

    if (!Number.isFinite(price)) {
        throw new Error(`Current stock price unavailable for ${rawSymbol}`);
    }

    const change = price - previousClose;
    const changePercent = previousClose ? (change / previousClose) * 100 : 0;

    return {
        success: true,
        symbol: rawSymbol.toString().toUpperCase().replace(/\.(NS|BO)$/, "").replace(/:(NSE|BSE)$/, ""),
        displaySymbol: yahooSymbol,
        companyName: meta.longName || meta.shortName || rawSymbol.toUpperCase(),
        exchange: meta.fullExchangeName || meta.exchangeName || (isIndian ? "NSE" : "US"),
        currency: meta.currency || (isIndian ? "INR" : "USD"),
        price,
        previousClose,
        change,
        changePercent,
        dayHigh: Number(meta.regularMarketDayHigh || 0),
        dayLow: Number(meta.regularMarketDayLow || 0),
        volume: Number(meta.regularMarketVolume || 0),
        fiftyTwoWeekHigh: Number(meta.fiftyTwoWeekHigh || 0),
        fiftyTwoWeekLow: Number(meta.fiftyTwoWeekLow || 0),
        open: Number(meta.regularMarketPrice || previousClose),
        marketCap: Number(meta.marketCap || 0),
        isMarketOpen: null,
        lastUpdated: new Date().toISOString(),
        source: "Yahoo Finance"
    };
};

const fetchYahooHistory = async (rawSymbol, range = "1mo", isIndian = true) => {
    if (!VALID_RANGES.includes(range)) range = "1mo";
    const yahooSymbol = getYahooSymbol(rawSymbol, isIndian);
    const interval = getYahooInterval(range);

    const response = await axios.get(
        `${YAHOO_BASE_URL}/${yahooSymbol}`,
        {
            params: {
                range,
                interval,
                events: "history"
            },
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            },
            timeout: 20000
        }
    );

    const result = response.data?.chart?.result?.[0];
    if (!result) {
        throw new Error(`Historical data not available for ${rawSymbol}`);
    }

    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    const closes = quote.close || [];
    const opens = quote.open || [];
    const highs = quote.high || [];
    const lows = quote.low || [];
    const volumes = quote.volume || [];

    const history = [];
    for (let i = 0; i < timestamps.length; i++) {
        const close = Number(closes[i]);
        if (!Number.isFinite(close)) continue;

        history.push({
            timestamp: timestamps[i],
            date: new Date(timestamps[i] * 1000).toISOString(),
            open: Number(opens[i]) || null,
            high: Number(highs[i]) || null,
            low: Number(lows[i]) || null,
            close,
            volume: Number(volumes[i]) || 0
        });
    }

    return {
        success: true,
        symbol: rawSymbol.toString().toUpperCase().replace(/\.(NS|BO)$/, "").replace(/:(NSE|BSE)$/, ""),
        range,
        interval,
        data: history,
        source: "Yahoo Finance"
    };
};


// ======================================================
// TWELVE DATA HANDLER (FOR FOREIGN COMPANIES)
// ======================================================

const getTwelveRangeConfig = (range) => {
    switch (range) {
        case "1d": return { interval: "5min", outputsize: 78 };
        case "5d": return { interval: "15min", outputsize: 130 };
        case "1mo": return { interval: "1day", outputsize: 30 };
        case "3mo": return { interval: "1day", outputsize: 90 };
        case "6mo": return { interval: "1day", outputsize: 180 };
        case "1y": return { interval: "1day", outputsize: 365 };
        default: return { interval: "1day", outputsize: 30 };
    }
};

const isTwelveDataConfigured = () => {
    return Boolean(API_KEY && API_KEY !== "YOUR_TWELVE_DATA_API_KEY");
};

const fetchTwelveQuote = async (rawSymbol) => {
    if (!isTwelveDataConfigured()) {
        console.warn(`Twelve Data API key not set. Using Yahoo Finance fallback for foreign stock: ${rawSymbol}`);
        return fetchYahooQuote(rawSymbol, false);
    }

    try {
        const twelveSymbol = getTwelveSymbol(rawSymbol);

        const response = await axios.get(
            `${TWELVE_DATA_BASE_URL}/quote`,
            {
                params: {
                    symbol: twelveSymbol,
                    apikey: API_KEY,
                    dp: 2
                },
                timeout: 15000
            }
        );

        const d = response.data;
        if (d.code || d.status === "error") {
            console.warn(`Twelve Data returned error for ${rawSymbol}: ${d.message}. Falling back to Yahoo Finance.`);
            return fetchYahooQuote(rawSymbol, false);
        }

        const price = Number(d.close);
        const previousClose = Number(d.previous_close || 0);
        const change = Number(d.change || price - previousClose);
        const changePercent = Number(d.percent_change || 0);

        if (!Number.isFinite(price)) {
            return fetchYahooQuote(rawSymbol, false);
        }

        return {
            success: true,
            symbol: rawSymbol.toString().toUpperCase(),
            twelveSymbol,
            companyName: d.name || rawSymbol.toUpperCase(),
            exchange: d.exchange || "NASDAQ/NYSE",
            currency: d.currency || "USD",
            price,
            previousClose,
            change,
            changePercent,
            dayHigh: Number(d.high || 0),
            dayLow: Number(d.low || 0),
            volume: Number(d.volume || 0),
            fiftyTwoWeekHigh: Number(d.fifty_two_week?.high || 0),
            fiftyTwoWeekLow: Number(d.fifty_two_week?.low || 0),
            open: Number(d.open || 0),
            marketCap: Number(d.market_cap || 0),
            isMarketOpen: d.is_market_open ?? null,
            lastUpdated: d.datetime || new Date().toISOString(),
            source: "Twelve Data"
        };

    } catch (err) {
        console.warn(`Twelve Data call failed for ${rawSymbol}: ${err.message}. Falling back to Yahoo Finance.`);
        return fetchYahooQuote(rawSymbol, false);
    }
};

const fetchTwelveHistory = async (rawSymbol, range = "1mo") => {
    if (!isTwelveDataConfigured()) {
        return fetchYahooHistory(rawSymbol, range, false);
    }

    try {
        if (!VALID_RANGES.includes(range)) range = "1mo";
        const twelveSymbol = getTwelveSymbol(rawSymbol);
        const { interval, outputsize } = getTwelveRangeConfig(range);

        const response = await axios.get(
            `${TWELVE_DATA_BASE_URL}/time_series`,
            {
                params: {
                    symbol: twelveSymbol,
                    interval,
                    outputsize,
                    apikey: API_KEY,
                    dp: 2,
                    order: "ASC"
                },
                timeout: 20000
            }
        );

        const d = response.data;
        if (d.code || d.status === "error") {
            console.warn(`Twelve Data time_series error for ${rawSymbol}: ${d.message}. Falling back to Yahoo Finance.`);
            return fetchYahooHistory(rawSymbol, range, false);
        }

        const values = d.values || [];
        const history = values
            .map((item) => {
                const close = Number(item.close);
                if (!Number.isFinite(close)) return null;

                return {
                    timestamp: Math.floor(new Date(item.datetime).getTime() / 1000),
                    date: new Date(item.datetime).toISOString(),
                    open: Number(item.open) || null,
                    high: Number(item.high) || null,
                    low: Number(item.low) || null,
                    close,
                    volume: Number(item.volume) || 0
                };
            })
            .filter(Boolean);

        return {
            success: true,
            symbol: rawSymbol.toString().toUpperCase(),
            range,
            interval,
            data: history,
            source: "Twelve Data"
        };

    } catch (err) {
        console.warn(`Twelve Data history failed for ${rawSymbol}: ${err.message}. Falling back to Yahoo Finance.`);
        return fetchYahooHistory(rawSymbol, range, false);
    }
};


// ======================================================
// PUBLIC API WITH CACHING & DEDUPLICATION
// ======================================================

/**
 * Get current stock quote.
 * Routes Indian stocks to Yahoo Finance (free, zero Twelve Data credit usage).
 * Routes foreign companies to Twelve Data (with Yahoo Finance fallback).
 * Uses in-memory TTL cache to eliminate redundant calls.
 */
const getStock = async (symbol) => {
    const clean = String(symbol).trim().toUpperCase();
    const cacheKey = clean;

    // 1. Check quote cache
    const cached = quoteCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
        return cached.data;
    }

    // 2. Deduplicate simultaneous in-flight requests for the same symbol
    if (inFlightRequests.has(cacheKey)) {
        return inFlightRequests.get(cacheKey);
    }

    const requestPromise = (async () => {
        try {
            let data;
            const indian = isIndianSymbol(clean);

            if (indian) {
                try {
                    data = await fetchYahooQuote(clean, true);
                } catch (err) {
                    // If Indian lookup failed, attempt foreign lookup as a fallback
                    console.warn(`Indian quote lookup for ${clean} failed: ${err.message}. Trying as foreign symbol...`);
                    data = await fetchTwelveQuote(clean);
                }
            } else {
                // Foreign company: Use Twelve Data (with Yahoo fallback)
                data = await fetchTwelveQuote(clean);
            }

            // Save in cache
            quoteCache.set(cacheKey, {
                data,
                expiresAt: Date.now() + QUOTE_CACHE_TTL_MS
            });

            return data;

        } finally {
            inFlightRequests.delete(cacheKey);
        }
    })();

    inFlightRequests.set(cacheKey, requestPromise);
    return requestPromise;
};

/**
 * Get stock historical chart data.
 * Caches results for 5 minutes.
 */
const getStockHistory = async (symbol, range = "1mo") => {
    const clean = String(symbol).trim().toUpperCase();
    const cleanRange = VALID_RANGES.includes(range) ? range : "1mo";
    const cacheKey = `${clean}:${cleanRange}`;

    // 1. Check history cache
    const cached = historyCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
        return cached.data;
    }

    // 2. Deduplicate in-flight requests
    if (inFlightRequests.has(cacheKey)) {
        return inFlightRequests.get(cacheKey);
    }

    const requestPromise = (async () => {
        try {
            let data;
            const indian = isIndianSymbol(clean);

            if (indian) {
                try {
                    data = await fetchYahooHistory(clean, cleanRange, true);
                } catch (err) {
                    console.warn(`Indian history lookup for ${clean} failed: ${err.message}. Trying as foreign symbol...`);
                    data = await fetchTwelveHistory(clean, cleanRange);
                }
            } else {
                data = await fetchTwelveHistory(clean, cleanRange);
            }

            // Save in cache
            historyCache.set(cacheKey, {
                data,
                expiresAt: Date.now() + HISTORY_CACHE_TTL_MS
            });

            return data;

        } finally {
            inFlightRequests.delete(cacheKey);
        }
    })();

    inFlightRequests.set(cacheKey, requestPromise);
    return requestPromise;
};

/**
 * Search symbols with 1-hour cache.
 * Matches Indian stocks and Twelve Data results.
 */
const searchSymbols = async (query) => {
    const cleanQuery = String(query).trim().toUpperCase();
    if (!cleanQuery) return [];

    const cacheKey = cleanQuery;
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
        return cached.data;
    }

    let results = [];

    // 1. Match against popular Indian stocks locally first (instant, 0 API calls)
    const localMatches = POPULAR_INDIAN_STOCKS.filter(
        (s) => s.symbol.includes(cleanQuery) || s.name.toUpperCase().includes(cleanQuery)
    ).map((s) => ({
        symbol: s.symbol,
        name: s.name,
        exchange: s.exchange,
        type: "Common Stock",
        country: s.country,
        currency: s.currency
    }));

    results.push(...localMatches);

    // 2. If Twelve Data key is configured, also query Twelve Data for foreign symbols
    if (isTwelveDataConfigured()) {
        try {
            const response = await axios.get(
                `${TWELVE_DATA_BASE_URL}/symbol_search`,
                {
                    params: {
                        symbol: cleanQuery,
                        apikey: API_KEY,
                        outputsize: 8
                    },
                    timeout: 8000
                }
            );

            const tdResults = (response.data?.data || []).map((item) => ({
                symbol: item.symbol,
                name: item.instrument_name,
                exchange: item.exchange,
                type: item.instrument_type,
                country: item.country,
                currency: item.currency
            }));

            // Avoid duplicate symbols
            const existingSymbols = new Set(results.map((r) => r.symbol));
            tdResults.forEach((item) => {
                if (!existingSymbols.has(item.symbol)) {
                    results.push(item);
                }
            });

        } catch (err) {
            console.warn("Twelve Data symbol search error:", err.message);
        }
    }

    // Cache results for 1 hour
    searchCache.set(cacheKey, {
        data: results,
        expiresAt: Date.now() + SEARCH_CACHE_TTL_MS
    });

    return results;
};


module.exports = {
    getStock,
    getStockHistory,
    searchSymbols,
    isIndianSymbol
};