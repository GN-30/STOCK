import { useState, useEffect } from "react";
import { Star, Plus, Trash2, RefreshCw, AlertCircle } from "lucide-react";

import StockCard from "./StockCard";
import { getStock }                              from "../services/stockService";
import { getWatchlist, addToWatchlist, removeFromWatchlist } from "../services/watchlistService";


// ======================================================
// WATCHLIST
// ======================================================

/**
 * Props:
 *  - onSelectStock {function} — called with symbol when card is clicked
 */
export default function Watchlist({ onSelectStock }) {

    const [watchlist,    setWatchlist]    = useState([]);   // [{id, symbol, ...}]
    const [stockData,    setStockData]    = useState({});   // { SYMBOL: stockObject }
    const [addInput,     setAddInput]     = useState("");
    const [loading,      setLoading]      = useState(true);
    const [refreshing,   setRefreshing]   = useState(false);
    const [addLoading,   setAddLoading]   = useState(false);
    const [error,        setError]        = useState("");
    const [addError,     setAddError]     = useState("");


    // --------------------------------------------------
    // LOAD WATCHLIST FROM SUPABASE
    // --------------------------------------------------

    const loadWatchlist = async () => {
        try {
            setLoading(true);
            setError("");
            const items = await getWatchlist();
            setWatchlist(items || []);
        } catch (err) {
            setError(err.message || "Failed to load watchlist.");
        } finally {
            setLoading(false);
        }
    };


    // --------------------------------------------------
    // FETCH LIVE PRICES FOR EACH WATCHLIST SYMBOL
    // --------------------------------------------------

    const fetchPrices = async (items, forceRefresh = false) => {
        if (!items?.length) return;

        setRefreshing(true);

        const results = await Promise.allSettled(
            items.map((item) => getStock(item.symbol, { forceRefresh }))
        );

        const updated = {};
        results.forEach((r, idx) => {
            if (r.status === "fulfilled" && r.value?.success) {
                updated[items[idx].symbol] = r.value;
            }
        });

        setStockData((prev) => ({ ...prev, ...updated }));
        setRefreshing(false);
    };


    // --------------------------------------------------
    // INITIAL LOAD
    // --------------------------------------------------

    useEffect(() => {
        loadWatchlist();
    }, []);

    useEffect(() => {
        if (watchlist.length > 0) {
            fetchPrices(watchlist);
        }
    }, [watchlist]);


    // --------------------------------------------------
    // ADD SYMBOL
    // --------------------------------------------------

    const handleAdd = async () => {
        const sym = addInput.trim().toUpperCase();
        if (!sym) return;

        setAddLoading(true);
        setAddError("");

        try {
            await addToWatchlist(sym);
            setAddInput("");
            await loadWatchlist();
        } catch (err) {
            setAddError(err.message || "Failed to add symbol.");
        } finally {
            setAddLoading(false);
        }
    };


    // --------------------------------------------------
    // REMOVE SYMBOL
    // --------------------------------------------------

    const handleRemove = async (symbol) => {
        try {
            await removeFromWatchlist(symbol);
            setWatchlist((prev) =>
                prev.filter((item) => item.symbol !== symbol)
            );
            setStockData((prev) => {
                const copy = { ...prev };
                delete copy[symbol];
                return copy;
            });
        } catch (err) {
            setError(err.message || "Failed to remove symbol.");
        }
    };


    // --------------------------------------------------
    // RENDER
    // --------------------------------------------------

    return (
        <div className="watchlist-panel">

            {/* Header */}
            <div className="wl-header">
                <div className="wl-title">
                    <Star size={18} />
                    <h3>Watchlist</h3>
                </div>

                <button
                    type="button"
                    className="icon-button"
                    onClick={() => fetchPrices(watchlist, true)}
                    title="Refresh prices"
                    disabled={refreshing}
                >
                    <RefreshCw
                        size={16}
                        className={refreshing ? "spin" : ""}
                    />
                </button>
            </div>


            {/* Add symbol */}
            <div className="wl-add-row">
                <input
                    className="wl-add-input"
                    value={addInput}
                    onChange={(e) => setAddInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    placeholder="Add symbol, e.g. INFY"
                    disabled={addLoading}
                />
                <button
                    type="button"
                    className="wl-add-btn"
                    onClick={handleAdd}
                    disabled={addLoading || !addInput.trim()}
                >
                    <Plus size={16} />
                </button>
            </div>

            {addError && (
                <p className="wl-error">
                    <AlertCircle size={13} /> {addError}
                </p>
            )}


            {/* Error */}
            {error && (
                <p className="wl-error">
                    <AlertCircle size={13} /> {error}
                </p>
            )}


            {/* List */}
            {loading ? (
                <div className="wl-loading">
                    <div className="spinner" />
                </div>
            ) : watchlist.length === 0 ? (
                <div className="wl-empty">
                    <Star size={32} opacity={0.3} />
                    <p>Your watchlist is empty.</p>
                    <small>Add a symbol above to get started.</small>
                </div>
            ) : (
                <ul className="wl-list">
                    {watchlist.map((item) => (
                        <li key={item.id} className="wl-item">
                            <div
                                className="wl-card-wrap"
                                onClick={() => onSelectStock?.(item.symbol)}
                            >
                                <StockCard
                                    stock={stockData[item.symbol] || { symbol: item.symbol }}
                                    compact
                                />
                            </div>

                            <button
                                type="button"
                                className="wl-remove-btn"
                                onClick={() => handleRemove(item.symbol)}
                                title={`Remove ${item.symbol}`}
                            >
                                <Trash2 size={14} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
