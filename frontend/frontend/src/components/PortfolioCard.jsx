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
// PORTFOLIO CARD
// ======================================================

/**
 * Displays a single portfolio holding.
 *
 * Props:
 *  - holding {object}
 *      - symbol       {string}
 *      - companyName  {string}
 *      - shares       {number}
 *      - buyPrice     {number}  — average buy price per share
 *      - currentPrice {number}  — latest market price (from API)
 *      - exchange     {string}
 *  - onRemove  {function}  — optional, called to remove holding
 *  - onClick   {function}  — optional, called to view stock details
 */
export default function PortfolioCard({
    holding,
    onRemove,
    onClick
}) {

    if (!holding) return null;

    const {
        symbol,
        companyName,
        shares      = 0,
        buyPrice    = 0,
        currentPrice,
        exchange    = "NSE"
    } = holding;

    const current    = Number(currentPrice  || buyPrice);
    const invested   = Number(buyPrice)  * Number(shares);
    const currentVal = current            * Number(shares);
    const pnl        = currentVal - invested;
    const pnlPct     = invested > 0 ? (pnl / invested) * 100 : 0;
    const isProfit   = pnl >= 0;

    const pnlColor = isProfit
        ? "var(--color-positive, #22c55e)"
        : "var(--color-negative, #ef4444)";


    return (
        <div
            className="portfolio-card"
            onClick={onClick}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={(e) => e.key === "Enter" && onClick?.()}
        >

            {/* Header */}
            <div className="pc-header">
                <div>
                    <div className="pc-symbol">{symbol}</div>
                    <div className="pc-company">
                        {companyName || symbol}
                    </div>
                    <div className="pc-exchange">{exchange}</div>
                </div>

                <div className="pc-badge" style={{ color: pnlColor }}>
                    {isProfit
                        ? <TrendingUp  size={18} />
                        : <TrendingDown size={18} />}
                    <span>
                        {isProfit ? "+" : ""}
                        {pnlPct.toFixed(2)}%
                    </span>
                </div>
            </div>


            {/* Stats grid */}
            <div className="pc-stats">

                <div className="pc-stat">
                    <span>Shares</span>
                    <strong>{Number(shares).toLocaleString("en-IN")}</strong>
                </div>

                <div className="pc-stat">
                    <span>Avg. Buy</span>
                    <strong>₹{fmt(buyPrice)}</strong>
                </div>

                <div className="pc-stat">
                    <span>Current</span>
                    <strong>₹{fmt(current)}</strong>
                </div>

                <div className="pc-stat">
                    <span>Invested</span>
                    <strong>₹{fmt(invested)}</strong>
                </div>

                <div className="pc-stat">
                    <span>Value</span>
                    <strong>₹{fmt(currentVal)}</strong>
                </div>

                <div className="pc-stat">
                    <span>P&amp;L</span>
                    <strong style={{ color: pnlColor }}>
                        {isProfit ? "+" : ""}₹{fmt(pnl)}
                    </strong>
                </div>

            </div>


            {/* Remove button */}
            {onRemove && (
                <button
                    type="button"
                    className="pc-remove-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove(symbol);
                    }}
                >
                    Remove
                </button>
            )}

        </div>
    );
}
