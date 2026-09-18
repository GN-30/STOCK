import { useState, useEffect } from "react";
import { Wallet, Plus, RefreshCw, TrendingUp, TrendingDown, AlertCircle, X } from "lucide-react";

import PortfolioCard from "../components/PortfolioCard";
import { getStock }  from "../services/stockService";


// ======================================================
// PORTFOLIO STORAGE KEY (localStorage)
// ======================================================

const STORAGE_KEY = "stockflow_portfolio";


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


// ======================================================
// PORTFOLIO PAGE
// ======================================================

export default function PortfolioPage({ onSelectStock }) {

    const [holdings,      setHoldings]      = useState([]);
    const [liveData,      setLiveData]      = useState({});
    const [refreshing,    setRefreshing]    = useState(false);
    const [showAddModal,  setShowAddModal]  = useState(false);
    const [error,         setError]         = useState("");

    // Add form state
    const [formSymbol,    setFormSymbol]    = useState("");
    const [formShares,    setFormShares]    = useState("");
    const [formBuyPrice,  setFormBuyPrice]  = useState("");
    const [formError,     setFormError]     = useState("");


    // --------------------------------------------------
    // LOAD / SAVE from localStorage
    // --------------------------------------------------

    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) setHoldings(JSON.parse(saved));
        } catch { /* ignore */ }
    }, []);

    const saveHoldings = (updated) => {
        setHoldings(updated);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch { /* ignore */ }
    };


    // --------------------------------------------------
    // FETCH LIVE PRICES
    // --------------------------------------------------

    const fetchPrices = async (items = holdings, forceRefresh = false) => {
        if (!items.length) return;
        setRefreshing(true);

        const results = await Promise.allSettled(
            items.map((h) => getStock(h.symbol, { forceRefresh }))
        );

        const updated = {};
        results.forEach((r, idx) => {
            if (r.status === "fulfilled" && r.value?.success) {
                updated[items[idx].symbol] = r.value;
            }
        });

        setLiveData((prev) => ({ ...prev, ...updated }));
        setRefreshing(false);
    };

    useEffect(() => { if (holdings.length > 0) fetchPrices(); }, [holdings]);


    // --------------------------------------------------
    // ADD HOLDING
    // --------------------------------------------------

    const handleAdd = async () => {
        const sym      = formSymbol.trim().toUpperCase();
        const shares   = parseFloat(formShares);
        const buyPrice = parseFloat(formBuyPrice);

        if (!sym)              { setFormError("Symbol is required."); return; }
        if (!shares  || shares  <= 0) { setFormError("Enter a valid share count.");   return; }
        if (!buyPrice || buyPrice <= 0) { setFormError("Enter a valid buy price.");    return; }

        // Check duplicate
        if (holdings.find((h) => h.symbol === sym)) {
            setFormError(`${sym} is already in your portfolio. Remove it first to re-add.`);
            return;
        }

        const newHolding = {
            id:       Date.now(),
            symbol:   sym,
            shares,
            buyPrice,
            addedAt:  new Date().toISOString()
        };

        const updated = [...holdings, newHolding];
        saveHoldings(updated);
        setShowAddModal(false);
        setFormSymbol("");
        setFormShares("");
        setFormBuyPrice("");
        setFormError("");
    };


    // --------------------------------------------------
    // REMOVE HOLDING
    // --------------------------------------------------

    const handleRemove = (symbol) => {
        const updated = holdings.filter((h) => h.symbol !== symbol);
        saveHoldings(updated);
        setLiveData((prev) => {
            const copy = { ...prev };
            delete copy[symbol];
            return copy;
        });
    };


    // --------------------------------------------------
    // PORTFOLIO SUMMARY
    // --------------------------------------------------

    const summary = holdings.reduce(
        (acc, h) => {
            const live      = liveData[h.symbol];
            const current   = live?.price     || h.buyPrice;
            const invested  = Number(h.buyPrice) * Number(h.shares);
            const value     = current          * Number(h.shares);
            acc.invested   += invested;
            acc.value      += value;
            return acc;
        },
        { invested: 0, value: 0 }
    );

    const totalPnL    = summary.value - summary.invested;
    const totalPnLPct = summary.invested > 0
        ? (totalPnL / summary.invested) * 100
        : 0;
    const isProfitable = totalPnL >= 0;


    // --------------------------------------------------
    // RENDER
    // --------------------------------------------------

    return (
        <div className="page-container">

            {/* Header */}
            <header className="page-header">
                <div>
                    <p className="eyebrow">MY PORTFOLIO</p>
                    <h1>
                        <Wallet size={22} style={{ marginRight: "0.5rem" }} />
                        Holdings
                    </h1>
                </div>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                        type="button"
                        className="icon-button"
                        onClick={() => fetchPrices(holdings, true)}
                        disabled={refreshing}
                        title="Refresh prices"
                    >
                        <RefreshCw size={18} className={refreshing ? "spin" : ""} />
                    </button>

                    <button
                        type="button"
                        className="watch-button"
                        onClick={() => setShowAddModal(true)}
                    >
                        <Plus size={16} /> Add Holding
                    </button>
                </div>
            </header>


            {/* Summary card */}
            {holdings.length > 0 && (
                <div className="portfolio-summary">
                    <div className="ps-stat">
                        <span>Total Invested</span>
                        <strong>₹{fmt(summary.invested)}</strong>
                    </div>
                    <div className="ps-stat">
                        <span>Current Value</span>
                        <strong>₹{fmt(summary.value)}</strong>
                    </div>
                    <div className="ps-stat">
                        <span>Total P&amp;L</span>
                        <strong style={{ color: isProfitable ? "#22c55e" : "#ef4444" }}>
                            {isProfitable ? "+" : ""}₹{fmt(totalPnL)}{" "}
                            ({isProfitable ? "+" : ""}{totalPnLPct.toFixed(2)}%)
                        </strong>
                    </div>
                    <div className="ps-stat">
                        <span>Holdings</span>
                        <strong>{holdings.length}</strong>
                    </div>
                </div>
            )}


            {error && (
                <p className="wl-error">
                    <AlertCircle size={13} /> {error}
                </p>
            )}


            {/* Holdings grid */}
            {holdings.length === 0 ? (
                <div className="page-empty">
                    <Wallet size={48} opacity={0.2} />
                    <h3>No holdings yet</h3>
                    <p>Click "Add Holding" to track your investments.</p>
                </div>
            ) : (
                <div className="stock-grid">
                    {holdings.map((holding) => (
                        <PortfolioCard
                            key={holding.id}
                            holding={{
                                ...holding,
                                currentPrice:  liveData[holding.symbol]?.price,
                                companyName:   liveData[holding.symbol]?.companyName,
                                exchange:      liveData[holding.symbol]?.exchange
                            }}
                            onClick={() => onSelectStock?.(holding.symbol)}
                            onRemove={handleRemove}
                        />
                    ))}
                </div>
            )}


            {/* Add Holding Modal */}
            {showAddModal && (
                <div
                    className="modal-overlay"
                    onClick={() => setShowAddModal(false)}
                >
                    <div
                        className="modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <h3>Add Holding</h3>
                            <button
                                type="button"
                                className="icon-button"
                                onClick={() => setShowAddModal(false)}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="modal-body">
                            <label>
                                Symbol
                                <input
                                    value={formSymbol}
                                    onChange={(e) =>
                                        setFormSymbol(e.target.value.toUpperCase())
                                    }
                                    placeholder="e.g. TCS"
                                />
                            </label>

                            <label>
                                Shares / Quantity
                                <input
                                    type="number"
                                    value={formShares}
                                    onChange={(e) => setFormShares(e.target.value)}
                                    placeholder="e.g. 10"
                                    min="0.001"
                                    step="any"
                                />
                            </label>

                            <label>
                                Average Buy Price (₹)
                                <input
                                    type="number"
                                    value={formBuyPrice}
                                    onChange={(e) => setFormBuyPrice(e.target.value)}
                                    placeholder="e.g. 3500.00"
                                    min="0.01"
                                    step="any"
                                />
                            </label>

                            {formError && (
                                <p className="wl-error">
                                    <AlertCircle size={13} /> {formError}
                                </p>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button
                                type="button"
                                className="icon-button"
                                onClick={() => setShowAddModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="watch-button"
                                onClick={handleAdd}
                            >
                                <Plus size={15} /> Add
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
