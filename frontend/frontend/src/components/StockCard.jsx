import { TrendingUp, TrendingDown } from "lucide-react";


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
// STOCK CARD
// ======================================================

/**
 * Reusable card for a single stock.
 *
 * Props:
 *  - stock    {object}   — stock data object from API
 *  - onClick  {function} — called when card is clicked
 *  - compact  {boolean}  — smaller layout for sidebar lists
 */
export default function StockCard({
    stock,
    onClick,
    compact = false
}) {

    if (!stock) return null;

    const change        = Number(stock.change        || 0);
    const changePercent = Number(stock.changePercent || 0);
    const isPositive    = change >= 0;

    const priceColor = isPositive
        ? "var(--color-positive, #22c55e)"
        : "var(--color-negative, #ef4444)";


    // --------------------------------------------------
    // COMPACT VARIANT (used in watchlist sidebar)
    // --------------------------------------------------

    if (compact) {
        return (
            <div
                className="stock-card-compact"
                onClick={onClick}
                role={onClick ? "button" : undefined}
                tabIndex={onClick ? 0 : undefined}
                onKeyDown={(e) => e.key === "Enter" && onClick?.()}
            >
                <div className="scc-left">
                    <span className="scc-symbol">
                        {stock.symbol}
                    </span>
                    <span className="scc-name">
                        {stock.companyName || stock.symbol}
                    </span>
                </div>

                <div className="scc-right">
                    <span className="scc-price">
                        ₹{fmt(stock.price)}
                    </span>
                    <span
                        className="scc-change"
                        style={{ color: priceColor }}
                    >
                        {isPositive ? "▲" : "▼"}{" "}
                        {Math.abs(changePercent).toFixed(2)}%
                    </span>
                </div>
            </div>
        );
    }


    // --------------------------------------------------
    // FULL CARD VARIANT
    // --------------------------------------------------

    return (
        <div
            className="stock-card"
            onClick={onClick}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={(e) => e.key === "Enter" && onClick?.()}
        >
            {/* Header */}
            <div className="sc-header">
                <div className="sc-symbol-badge">
                    {stock.symbol}
                </div>
                <span
                    className="sc-badge"
                    style={{ background: isPositive ? "#dcfce7" : "#fee2e2", color: priceColor }}
                >
                    {isPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                    {isPositive ? "+" : ""}
                    {changePercent.toFixed(2)}%
                </span>
            </div>

            {/* Company name */}
            <p className="sc-company">
                {stock.companyName || stock.symbol}
            </p>

            {/* Price */}
            <div className="sc-price" style={{ color: priceColor }}>
                ₹{fmt(stock.price)}
            </div>

            {/* Change */}
            <div className="sc-change" style={{ color: priceColor }}>
                {isPositive ? "+" : ""}
                {fmt(change)} today
            </div>

            {/* Stats row */}
            <div className="sc-stats">
                <div className="sc-stat">
                    <span>High</span>
                    <strong>₹{fmt(stock.dayHigh)}</strong>
                </div>
                <div className="sc-stat">
                    <span>Low</span>
                    <strong>₹{fmt(stock.dayLow)}</strong>
                </div>
                <div className="sc-stat">
                    <span>Exchange</span>
                    <strong>{stock.exchange || "NSE"}</strong>
                </div>
            </div>
        </div>
    );
}
