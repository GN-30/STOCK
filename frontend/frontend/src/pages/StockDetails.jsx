import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import {
    ArrowLeft,
    Star,
    RefreshCw,
    TrendingUp,
    TrendingDown,
    Activity,
    BarChart3
} from "lucide-react";

import StockChart from "../components/StockChart";
import { getStock, getStockHistory }          from "../services/stockService";
import { addToWatchlist, removeFromWatchlist, isInWatchlist } from "../services/watchlistService";


// ======================================================
// FORMAT HELPERS
// ======================================================

const fmt = (value, decimals = 2) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return "--";
    return n.toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
};

const fmtVol = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return "--";
    if (n >= 10000000) return (n / 10000000).toFixed(2) + " Cr";
    if (n >= 100000)   return (n / 100000).toFixed(2)   + " L";
    if (n >= 1000)     return (n / 1000).toFixed(2)      + "K";
    return n.toString();
};


// ======================================================
// STOCK DETAILS PAGE
// ======================================================

export default function StockDetails() {

    const { symbol: routeSymbol } = useParams();
    const navigate = useNavigate();

    const [stock,         setStock]         = useState(null);
    const [history,       setHistory]       = useState([]);
    const [selectedRange, setSelectedRange] = useState("1mo");
    const [loading,       setLoading]       = useState(true);
    const [error,         setError]         = useState("");
    const [inWatchlist,   setInWatchlist]   = useState(false);
    const [watchToggling, setWatchToggling] = useState(false);

    const symbol = (routeSymbol || "TCS").toUpperCase();


    // --------------------------------------------------
    // LOAD
    // --------------------------------------------------

    const loadData = async (range = selectedRange) => {
        try {
            setLoading(true);
            setError("");

            const [stockData, historyData, watched] = await Promise.all([
                getStock(symbol),
                getStockHistory(symbol, range),
                isInWatchlist(symbol)
            ]);

            if (!stockData.success) {
                throw new Error(stockData.message || "Failed to load stock");
            }

            setStock(stockData);
            setHistory(historyData.success ? historyData.data || [] : []);
            setInWatchlist(watched);

        } catch (err) {
            setError(err.message || "Unable to load stock details.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [symbol]);

    const handleRangeChange = async (range) => {
        setSelectedRange(range);
        try {
            setLoading(true);
            const historyData = await getStockHistory(symbol, range);
            setHistory(historyData.success ? historyData.data || [] : []);
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
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
            console.error(err.message);
        } finally {
            setWatchToggling(false);
        }
    };


    // --------------------------------------------------
    // DERIVED
    // --------------------------------------------------

    const change        = Number(stock?.change        || 0);
    const changePercent = Number(stock?.changePercent || 0);
    const isPositive    = change >= 0;

    const priceColor = isPositive ? "#22c55e" : "#ef4444";


    // --------------------------------------------------
    // RENDER
    // --------------------------------------------------

    if (error) {
        return (
            <div className="details-error">
                <p>{error}</p>
                <button type="button" onClick={() => navigate(-1)}>
                    <ArrowLeft size={16} /> Go back
                </button>
            </div>
        );
    }

    return (
        <div className="details-page">

            {/* Topbar */}
            <header className="details-topbar">
                <button
                    type="button"
                    className="icon-button"
                    onClick={() => navigate(-1)}
                    title="Back"
                >
                    <ArrowLeft size={20} />
                </button>

                <div className="details-title">
                    <span className="stock-symbol-box">{symbol}</span>
                    {stock && (
                        <span className="stock-company">
                            {stock.companyName}
                        </span>
                    )}
                </div>

                <div className="details-actions">
                    <button
                        type="button"
                        className={`watch-button${inWatchlist ? " watched" : ""}`}
                        onClick={handleWatchToggle}
                        disabled={watchToggling}
                    >
                        <Star size={16} fill={inWatchlist ? "currentColor" : "none"} />
                        {inWatchlist ? "Watching" : "Watch"}
                    </button>

                    <button
                        type="button"
                        className="icon-button"
                        onClick={() => loadData(selectedRange)}
                        title="Refresh"
                    >
                        <RefreshCw
                            size={17}
                            className={loading ? "spin" : ""}
                        />
                    </button>
                </div>
            </header>


            {/* Price hero */}
            {stock && (
                <section className="stock-hero" style={{ marginBottom: "1rem" }}>
                    <div className="stock-price-section">
                        <div className="current-price">
                            ₹{fmt(stock.price)}
                        </div>
                        <div
                            className={`price-change ${isPositive ? "positive" : "negative"}`}
                        >
                            {isPositive
                                ? <TrendingUp  size={17} />
                                : <TrendingDown size={17} />}
                            <span>
                                {isPositive ? "+" : ""}
                                {fmt(change)}{" "}
                                ({isPositive ? "+" : ""}
                                {changePercent.toFixed(2)}%)
                            </span>
                        </div>
                    </div>
                    <span className="stock-exchange">{stock.exchange}</span>
                </section>
            )}


            {/* Stats */}
            {stock && (
                <section className="stats-grid">

                    <div className="stat-card">
                        <div className="stat-icon green"><Activity size={19} /></div>
                        <div>
                            <span>Day High</span>
                            <strong>₹{fmt(stock.dayHigh)}</strong>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon pink"><TrendingDown size={19} /></div>
                        <div>
                            <span>Day Low</span>
                            <strong>₹{fmt(stock.dayLow)}</strong>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon green"><BarChart3 size={19} /></div>
                        <div>
                            <span>Volume</span>
                            <strong>{fmtVol(stock.volume)}</strong>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon pink"><TrendingUp size={19} /></div>
                        <div>
                            <span>52W High</span>
                            <strong>₹{fmt(stock.fiftyTwoWeekHigh)}</strong>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon green"><TrendingDown size={19} /></div>
                        <div>
                            <span>52W Low</span>
                            <strong>₹{fmt(stock.fiftyTwoWeekLow)}</strong>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon pink"><Activity size={19} /></div>
                        <div>
                            <span>Open</span>
                            <strong>₹{fmt(stock.open)}</strong>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon green"><Activity size={19} /></div>
                        <div>
                            <span>Prev Close</span>
                            <strong>₹{fmt(stock.previousClose)}</strong>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon pink"><BarChart3 size={19} /></div>
                        <div>
                            <span>Currency</span>
                            <strong>{stock.currency || "INR"}</strong>
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
    );
}
