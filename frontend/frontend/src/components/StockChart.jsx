import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip
} from "recharts";

import { useMemo } from "react";


// ======================================================
// RANGE OPTIONS
// ======================================================

const RANGES = [
    { label: "1D",  value: "1d"  },
    { label: "1W",  value: "5d"  },
    { label: "1M",  value: "1mo" },
    { label: "3M",  value: "3mo" },
    { label: "6M",  value: "6mo" },
    { label: "1Y",  value: "1y"  }
];


// ======================================================
// FORMAT CHART DATE
// ======================================================

const formatDate = (dateStr, range) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";

    if (range === "1d" || range === "5d") {
        return d.toLocaleTimeString("en-IN", {
            hour:   "2-digit",
            minute: "2-digit"
        });
    }

    return d.toLocaleDateString("en-IN", {
        day:   "2-digit",
        month: "short"
    });
};


// ======================================================
// CUSTOM TOOLTIP
// ======================================================

function ChartTooltip({ active, payload, label }) {

    if (!active || !payload?.length) return null;

    const item = payload[0]?.payload || {};

    return (
        <div className="chart-tooltip">
            <p className="ct-date">
                {label}
            </p>
            <p className="ct-price">
                ₹{Number(item.price || 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                })}
            </p>
            {item.volume ? (
                <p className="ct-volume">
                    Vol: {Number(item.volume).toLocaleString("en-IN")}
                </p>
            ) : null}
        </div>
    );
}


// ======================================================
// STOCK CHART
// ======================================================

/**
 * Props:
 *  - symbol        {string}
 *  - history       {Array}    — raw history objects from API
 *  - selectedRange {string}   — e.g. "1mo"
 *  - onRangeChange {function} — called with new range string
 *  - loading       {boolean}
 *  - isPositive    {boolean}  — drives gradient color
 */
export default function StockChart({
    symbol,
    history        = [],
    selectedRange  = "1mo",
    onRangeChange,
    loading        = false,
    isPositive     = true
}) {

    const strokeColor = isPositive ? "#22c55e" : "#ef4444";
    const fillId      = `grad-${isPositive ? "pos" : "neg"}`;


    // --------------------------------------------------
    // CHART DATA
    // --------------------------------------------------

    const chartData = useMemo(() => {
        return history
            .map((item) => {
                const close = Number(item.close);
                if (!Number.isFinite(close)) return null;

                return {
                    ...item,
                    displayDate: formatDate(item.date, selectedRange),
                    price:       close,
                    openValue:   Number.isFinite(Number(item.open))   ? Number(item.open)   : null,
                    highValue:   Number.isFinite(Number(item.high))   ? Number(item.high)   : null,
                    lowValue:    Number.isFinite(Number(item.low))    ? Number(item.low)    : null
                };
            })
            .filter(Boolean);
    }, [history, selectedRange]);


    // --------------------------------------------------
    // CHART SUMMARY NUMBERS
    // --------------------------------------------------

    const chartStart  = chartData.length > 0 ? chartData[0].price                    : null;
    const chartEnd    = chartData.length > 0 ? chartData[chartData.length - 1].price : null;
    const chartChange = (chartStart !== null && chartEnd !== null) ? chartEnd - chartStart : 0;
    const chartPct    = chartStart ? (chartChange / chartStart) * 100 : 0;


    // --------------------------------------------------
    // RENDER
    // --------------------------------------------------

    return (
        <section className="chart-card">

            {/* Header */}
            <div className="chart-header">
                <div>
                    <h2>{symbol} Price</h2>
                    <p>{RANGES.find(r => r.value === selectedRange)?.label || "1M"} chart</p>
                </div>

                <div className="chart-summary">
                    <span style={{ color: chartChange >= 0 ? "#22c55e" : "#ef4444" }}>
                        {chartChange >= 0 ? "▲" : "▼"}{" "}
                        {Math.abs(chartPct).toFixed(2)}%
                    </span>
                </div>
            </div>

            {/* Range selector */}
            <div className="range-tabs">
                {RANGES.map((r) => (
                    <button
                        key={r.value}
                        type="button"
                        className={`range-tab${selectedRange === r.value ? " active" : ""}`}
                        onClick={() => onRangeChange?.(r.value)}
                    >
                        {r.label}
                    </button>
                ))}
            </div>

            {/* Chart area */}
            <div className="chart-area">
                {loading ? (
                    <div className="chart-loading">
                        <div className="spinner" />
                        <span>Loading chart data…</span>
                    </div>
                ) : chartData.length === 0 ? (
                    <div className="chart-empty">
                        No data available for this range.
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart
                            data={chartData}
                            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                                    <stop
                                        offset="5%"
                                        stopColor={strokeColor}
                                        stopOpacity={0.25}
                                    />
                                    <stop
                                        offset="95%"
                                        stopColor={strokeColor}
                                        stopOpacity={0}
                                    />
                                </linearGradient>
                            </defs>

                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="rgba(255,255,255,0.05)"
                            />

                            <XAxis
                                dataKey="displayDate"
                                tick={{ fontSize: 11, fill: "#94a3b8" }}
                                tickLine={false}
                                axisLine={false}
                                interval="preserveStartEnd"
                            />

                            <YAxis
                                tick={{ fontSize: 11, fill: "#94a3b8" }}
                                tickLine={false}
                                axisLine={false}
                                width={70}
                                tickFormatter={(v) =>
                                    `₹${Number(v).toLocaleString("en-IN", {
                                        maximumFractionDigits: 0
                                    })}`
                                }
                                domain={["auto", "auto"]}
                            />

                            <Tooltip content={<ChartTooltip />} />

                            <Area
                                type="monotone"
                                dataKey="price"
                                stroke={strokeColor}
                                strokeWidth={2}
                                fill={`url(#${fillId})`}
                                dot={false}
                                activeDot={{ r: 5, fill: strokeColor }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </section>
    );
}
