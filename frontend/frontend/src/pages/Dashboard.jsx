import {
    useEffect,
    useMemo,
    useState
} from "react";

import {
    Search,
    TrendingUp,
    TrendingDown,
    Star,
    Activity,
    BarChart3,
    RefreshCw,
    Bell
} from "lucide-react";

import StockChart                from "../components/StockChart";
import Watchlist                 from "../components/Watchlist";
import { getStock, getStockHistory } from "../services/stockService";
import { addToWatchlist, removeFromWatchlist, isInWatchlist } from "../services/watchlistService";


// ======================================================
// FORMAT HELPERS
// ======================================================

const formatPrice = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return "--";
    return n.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

const formatVolume = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return "--";
    if (n >= 10000000) return (n / 10000000).toFixed(2) + " Cr";
    if (n >= 100000)   return (n / 100000).toFixed(2)   + " L";
    if (n >= 1000)     return (n / 1000).toFixed(2)      + "K";
    return n.toString();
};


// ======================================================
// DASHBOARD
// ======================================================

export default function Dashboard({ initialSymbol }) {

    // --------------------------------------------------
    // STATE
    // --------------------------------------------------

    const [symbol,        setSymbol]        = useState(initialSymbol || "TCS");
    const [searchInput,   setSearchInput]   = useState(initialSymbol || "TCS");
    const [stock,         setStock]         = useState(null);
    const [history,       setHistory]       = useState([]);
    const [selectedRange, setSelectedRange] = useState("1mo");
    const [loading,       setLoading]       = useState(false);
    const [error,         setError]         = useState("");
    const [inWatchlist,   setInWatchlist]   = useState(false);
    const [watchToggling, setWatchToggling] = useState(false);


    // --------------------------------------------------
    // LOAD STOCK DATA
    // --------------------------------------------------

    const loadStock = async (
        stockSymbol = symbol,
        range       = selectedRange
    ) => {
        const clean = String(stockSymbol).trim().toUpperCase();
        if (!clean) { setError("Please enter a stock symbol."); return; }

        try {
            setLoading(true);
            setError("");

            const [stockData, historyData, watched] = await Promise.all([
                getStock(clean),
                getStockHistory(clean, range),
                isInWatchlist(clean)
            ]);

            if (!stockData.success) {
                throw new Error(stockData.message || "Unable to fetch stock");
            }

            setStock(stockData);
            setSymbol(clean);
            setSearchInput(clean);
            setHistory(historyData.success ? (historyData.data || []) : []);
            setInWatchlist(watched);

        } catch (err) {
            setError(
                err.response?.data?.message ||
                err.message ||
                "Unable to fetch stock data."
            );
        } finally {
            setLoading(false);
        }
    };


    // --------------------------------------------------
    // RANGE CHANGE
    // --------------------------------------------------

    const handleRangeChange = async (range) => {
        setSelectedRange(range);
        try {
            setLoading(true);
            setError("");
            const historyData = await getStockHistory(symbol, range);
            setHistory(historyData.success ? (historyData.data || []) : []);
        } catch (err) {
            setError("Unable to load selected time range.");
        } finally {
            setLoading(false);
        }
    };


    // --------------------------------------------------
    // SEARCH
    // --------------------------------------------------

    const handleSearch = () => {
        const clean = searchInput.trim().toUpperCase();
        if (clean) loadStock(clean, selectedRange);
    };

    const handleSearchKeyDown = (e) => {
        if (e.key === "Enter") handleSearch();
    };


    // --------------------------------------------------
    // WATCHLIST TOGGLE
    // --------------------------------------------------

    const handleWatchToggle = async () => {
        setWatchToggling(true);
        try {
            if (inWatchlist) {
                await removeFromWatchlist(symbol);
                setInWatchlist(false);
            } else {
                await addToWatchlist(symbol);
                setInWatchlist(true);
            }
        } catch (err) {
            console.error("Watchlist toggle error:", err.message);
        } finally {
            setWatchToggling(false);
        }
    };


    // --------------------------------------------------
    // INITIAL LOAD
    // --------------------------------------------------

    useEffect(() => {
        loadStock(symbol, "1mo");
    }, []);


    // --------------------------------------------------
    // DERIVED VALUES
    // --------------------------------------------------

    const change        = Number(stock?.change        || 0);
    const changePercent = Number(stock?.changePercent || 0);
    const isPositive    = change >= 0;


    // --------------------------------------------------
    // RENDER
    // --------------------------------------------------

    return (
        <div className="dashboard-layout">

            {/* ==========================================
                RIGHT PANEL — Watchlist sidebar
            ========================================== */}
            <aside className="right-panel">
                <Watchlist onSelectStock={(sym) => loadStock(sym, selectedRange)} />
            </aside>


            {/* ==========================================
                MAIN CONTENT
            ========================================== */}
            <div className="dashboard-main">

                {/* Top bar */}
                <header className="topbar">
                    <div>
                        <p className="eyebrow">MARKET OVERVIEW</p>
                        <h1>Good day, Investor 👋</h1>
                    </div>

                    <div className="topbar-actions">
                        <button
                            className="icon-button"
                            onClick={() => loadStock(symbol, selectedRange)}
                            title="Refresh"
                            type="button"
                        >
                            <RefreshCw
                                size={19}
                                className={loading ? "spin" : ""}
                            />
                        </button>

                        <button
                            className="notification-button"
                            type="button"
                            title="Notifications"
                        >
                            <Bell size={19} />
                            <span />
                        </button>

                        <div className="profile">
                            <div className="profile-avatar">S</div>
                            <div>
                                <strong>Investor</strong>
                                <small>Personal Account</small>
                            </div>
                        </div>
                    </div>
                </header>


                {/* Search */}
                <section className="search-section">
                    <div className="search-box">
                        <Search size={20} />
                        <input
                            value={searchInput}
                            onChange={(e) =>
                                setSearchInput(e.target.value.toUpperCase())
                            }
                            onKeyDown={handleSearchKeyDown}
                            placeholder="Search stocks… e.g. TCS, RELIANCE, INFY"
                        />
                        <button onClick={handleSearch} type="button">
                            Search
                        </button>
                    </div>
                </section>


                {/* Error */}
                {error && (
                    <div className="error-message">{error}</div>
                )}


                {/* Stock hero */}
                {stock && (
                    <section className="stock-hero">
                        <div className="stock-heading">
                            <div className="stock-symbol-box">
                                <span>{stock.symbol}</span>
                            </div>
                            <div>
                                <p className="stock-company">
                                    {stock.companyName || "Loading…"}
                                </p>
                                <span className="stock-exchange">
                                    {stock.exchange || "NSE"}
                                </span>
                            </div>
                        </div>

                        <div className="stock-price-section">
                            <div className="current-price">
                                ₹{formatPrice(stock.price)}
                            </div>
                            <div
                                className={`price-change ${isPositive ? "positive" : "negative"}`}
                            >
                                {isPositive
                                    ? <TrendingUp  size={17} />
                                    : <TrendingDown size={17} />}
                                <span>
                                    {isPositive ? "+" : ""}
                                    {formatPrice(change)}{" "}
                                    ({isPositive ? "+" : ""}
                                    {changePercent.toFixed(2)}%)
                                </span>
                            </div>
                        </div>

                        <button
                            className={`watch-button${inWatchlist ? " watched" : ""}`}
                            type="button"
                            onClick={handleWatchToggle}
                            disabled={watchToggling}
                        >
                            <Star size={18} fill={inWatchlist ? "currentColor" : "none"} />
                            {inWatchlist ? "Watching" : "Watch"}
                        </button>
                    </section>
                )}


                {/* Stats */}
                {stock && (
                    <section className="stats-grid">

                        <div className="stat-card">
                            <div className="stat-icon green"><Activity size={19} /></div>
                            <div>
                                <span>Day High</span>
                                <strong>₹{formatPrice(stock.dayHigh)}</strong>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon pink"><TrendingDown size={19} /></div>
                            <div>
                                <span>Day Low</span>
                                <strong>₹{formatPrice(stock.dayLow)}</strong>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon green"><BarChart3 size={19} /></div>
                            <div>
                                <span>Volume</span>
                                <strong>{formatVolume(stock.volume)}</strong>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon pink"><TrendingUp size={19} /></div>
                            <div>
                                <span>52W High</span>
                                <strong>₹{formatPrice(stock.fiftyTwoWeekHigh)}</strong>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon green"><TrendingDown size={19} /></div>
                            <div>
                                <span>52W Low</span>
                                <strong>₹{formatPrice(stock.fiftyTwoWeekLow)}</strong>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon pink"><Activity size={19} /></div>
                            <div>
                                <span>Open</span>
                                <strong>₹{formatPrice(stock.open)}</strong>
                            </div>
                        </div>

                    </section>
                )}


                {/* Chart */}
                <StockChart
                    symbol={symbol}
                    history={history}
                    selectedRange={selectedRange}
                    onRangeChange={handleRangeChange}
                    loading={loading}
                    isPositive={isPositive}
                />

            </div>
        </div>
    );
}
