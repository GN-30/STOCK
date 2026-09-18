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
    Bell,
    BarChart3,
    Wallet,
    Activity,
    RefreshCw
} from "lucide-react";

import {
    ResponsiveContainer,
    AreaChart,
    Area,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip
} from "recharts";

import {
    getStock,
    getStockHistory
} from "./services/stockService";

import "./index.css";


// ======================================================
// RANGE OPTIONS
// ======================================================

const RANGES = [
    {
        label: "1D",
        value: "1d"
    },
    {
        label: "1W",
        value: "5d"
    },
    {
        label: "1M",
        value: "1mo"
    },
    {
        label: "3M",
        value: "3mo"
    },
    {
        label: "6M",
        value: "6mo"
    },
    {
        label: "1Y",
        value: "1y"
    }
];


// ======================================================
// RANGE TITLES
// ======================================================

const getRangeTitle = (range) => {

    switch (range) {

        case "1d":
            return "Today";

        case "5d":
            return "Last 5 days";

        case "1mo":
            return "Last 1 month";

        case "3mo":
            return "Last 3 months";

        case "6mo":
            return "Last 6 months";

        case "1y":
            return "Last 1 year";

        default:
            return "Last 1 month";
    }
};


// ======================================================
// FORMAT PRICE
// ======================================================

const formatPrice = (value) => {

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "--";
    }

    return number.toLocaleString(
        "en-IN",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );
};


// ======================================================
// FORMAT VOLUME
// ======================================================

const formatVolume = (value) => {

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "--";
    }

    if (number >= 10000000) {
        return (
            number / 10000000
        ).toFixed(2) + " Cr";
    }

    if (number >= 100000) {
        return (
            number / 100000
        ).toFixed(2) + " L";
    }

    if (number >= 1000) {
        return (
            number / 1000
        ).toFixed(2) + "K";
    }

    return number.toString();
};


// ======================================================
// FORMAT DATE
// ======================================================

const formatChartDate = (
    date,
    range
) => {

    const parsed = new Date(date);

    if (
        Number.isNaN(
            parsed.getTime()
        )
    ) {
        return "";
    }

    if (
        range === "1d" ||
        range === "5d"
    ) {

        return parsed.toLocaleTimeString(
            "en-IN",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );
    }

    return parsed.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short"
        }
    );
};


// ======================================================
// APP
// ======================================================

function App() {

    // ==================================================
    // STATE
    // ==================================================

    const [
        symbol,
        setSymbol
    ] = useState("TCS");


    const [
        stock,
        setStock
    ] = useState(null);


    const [
        history,
        setHistory
    ] = useState([]);


    const [
        selectedRange,
        setSelectedRange
    ] = useState("1mo");


    const [
        loading,
        setLoading
    ] = useState(false);


    const [
        error,
        setError
    ] = useState("");


    const [
        searchInput,
        setSearchInput
    ] = useState("TCS");


    // ==================================================
    // LOAD STOCK
    // ==================================================

    const loadStock = async (
        stockSymbol = symbol,
        range = selectedRange
    ) => {

        const cleanSymbol =
            String(stockSymbol)
                .trim()
                .toUpperCase();


        if (!cleanSymbol) {

            setError(
                "Please enter a stock symbol."
            );

            return;
        }


        try {

            setLoading(true);

            setError("");


            // ------------------------------------------
            // CURRENT STOCK
            // ------------------------------------------

            const stockData =
                await getStock(
                    cleanSymbol
                );


            if (
                !stockData.success
            ) {

                throw new Error(
                    stockData.message ||
                    "Unable to fetch stock"
                );
            }


            setStock(
                stockData
            );


            setSymbol(
                cleanSymbol
            );


            // Keep search box synchronized
            setSearchInput(
                cleanSymbol
            );


            // ------------------------------------------
            // HISTORY
            // ------------------------------------------

            const historyData =
                await getStockHistory(
                    cleanSymbol,
                    range
                );


            if (
                historyData.success
            ) {

                setHistory(
                    historyData.data || []
                );

            } else {

                setHistory([]);
            }


        } catch (err) {

            console.error(err);

            setError(
                err.response?.data?.message ||
                err.message ||
                "Unable to fetch stock data."
            );

        } finally {

            setLoading(false);
        }
    };


    // ==================================================
    // INITIAL LOAD
    // ==================================================

    useEffect(() => {

        loadStock(
            "TCS",
            "1mo"
        );

    }, []);


    // ==================================================
    // RANGE CHANGE
    // ==================================================

    const handleRangeChange = async (
        range
    ) => {

        setSelectedRange(
            range
        );


        try {

            setLoading(true);

            setError("");


            const historyData =
                await getStockHistory(
                    symbol,
                    range
                );


            if (
                !historyData.success
            ) {

                throw new Error(
                    historyData.message ||
                    "History unavailable"
                );
            }


            setHistory(
                historyData.data || []
            );


        } catch (err) {

            console.error(err);

            setError(
                "Unable to load selected time range."
            );

        } finally {

            setLoading(false);
        }
    };


    // ==================================================
    // SEARCH
    // ==================================================

    const handleSearch = () => {

        const cleanSymbol =
            searchInput
                .trim()
                .toUpperCase();


        if (!cleanSymbol) {
            return;
        }


        loadStock(
            cleanSymbol,
            selectedRange
        );
    };


    // ==================================================
    // ENTER KEY
    // ==================================================

    const handleSearchKeyDown = (
        event
    ) => {

        if (
            event.key === "Enter"
        ) {

            handleSearch();
        }
    };


    // ==================================================
    // REFRESH
    // ==================================================

    const handleRefresh = () => {

        loadStock(
            symbol,
            selectedRange
        );
    };


    // ==================================================
    // PREPARE CHART DATA
    // ==================================================

    const chartData =
        useMemo(() => {

            return history
                .map(
                    (item) => {

                        const close =
                            Number(
                                item.close
                            );

                        const open =
                            Number(
                                item.open
                            );

                        const high =
                            Number(
                                item.high
                            );

                        const low =
                            Number(
                                item.low
                            );


                        return {

                            ...item,

                            displayDate:
                                formatChartDate(
                                    item.date,
                                    selectedRange
                                ),

                            price: close,

                            openValue:
                                Number.isFinite(open)
                                    ? open
                                    : null,

                            highValue:
                                Number.isFinite(high)
                                    ? high
                                    : null,

                            lowValue:
                                Number.isFinite(low)
                                    ? low
                                    : null,

                            closeValue:
                                Number.isFinite(close)
                                    ? close
                                    : null
                        };
                    }
                )
                .filter(
                    item =>
                        Number.isFinite(
                            item.price
                        )
                );

        }, [
            history,
            selectedRange
        ]);


    // ==================================================
    // CHANGE INFORMATION
    // ==================================================

    const change =
        Number(
            stock?.change || 0
        );


    const changePercent =
        Number(
            stock?.changePercent || 0
        );


    const isPositive =
        change >= 0;


    // ==================================================
    // CHART START / END
    // ==================================================

    const chartStart =
        chartData.length > 0
            ? chartData[0].price
            : null;


    const chartEnd =
        chartData.length > 0
            ? chartData[
                chartData.length - 1
            ].price
            : null;


    const chartChange =
        chartStart !== null &&
        chartEnd !== null
            ? chartEnd - chartStart
            : 0;


    const chartPositive =
        chartChange >= 0;


    // ==================================================
    // RENDER
    // ==================================================

    return (

        <div className="app-shell">


            {/* =========================================
                SIDEBAR
            ========================================= */}

            <aside className="sidebar">

                <div className="brand">

                    <div className="brand-icon">

                        <TrendingUp
                            size={22}
                        />

                    </div>


                    <div>

                        <h2>
                            StockFlow
                        </h2>

                        <span>
                            Market Tracker
                        </span>

                    </div>

                </div>


                <nav className="sidebar-nav">


                    <button
                        className="nav-item active"
                        type="button"
                    >

                        <BarChart3
                            size={19}
                        />

                        <span>
                            Dashboard
                        </span>

                    </button>


                    <button
                        className="nav-item"
                        type="button"
                    >

                        <Star
                            size={19}
                        />

                        <span>
                            Watchlist
                        </span>

                    </button>


                    <button
                        className="nav-item"
                        type="button"
                    >

                        <Wallet
                            size={19}
                        />

                        <span>
                            Portfolio
                        </span>

                    </button>


                    <button
                        className="nav-item"
                        type="button"
                    >

                        <Bell
                            size={19}
                        />

                        <span>
                            Alerts
                        </span>

                    </button>


                </nav>


                <div className="sidebar-bottom">

                    <div className="market-status">

                        <span className="status-dot"></span>

                        <div>

                            <strong>
                                Market Status
                            </strong>

                            <small>
                                NSE / BSE
                            </small>

                        </div>

                    </div>

                </div>

            </aside>


            {/* =========================================
                MAIN CONTENT
            ========================================= */}

            <main className="main-content">


                {/* =====================================
                    TOP NAVBAR
                ===================================== */}

                <header className="topbar">

                    <div>

                        <p className="eyebrow">
                            MARKET OVERVIEW
                        </p>

                        <h1>
                            Good day, Investor 👋
                        </h1>

                    </div>


                    <div className="topbar-actions">

                        <button
                            className="icon-button"
                            onClick={handleRefresh}
                            title="Refresh"
                            type="button"
                        >

                            <RefreshCw
                                size={19}
                                className={
                                    loading
                                        ? "spin"
                                        : ""
                                }
                            />

                        </button>


                        <button
                            className="notification-button"
                            type="button"
                            title="Notifications"
                        >

                            <Bell
                                size={19}
                            />

                            <span></span>

                        </button>


                        <div className="profile">

                            <div className="profile-avatar">
                                S
                            </div>

                            <div>

                                <strong>
                                    Investor
                                </strong>

                                <small>
                                    Personal Account
                                </small>

                            </div>

                        </div>

                    </div>

                </header>


                {/* =====================================
                    SEARCH
                ===================================== */}

                <section className="search-section">

                    <div className="search-box">

                        <Search
                            size={20}
                        />

                        <input
                            value={
                                searchInput
                            }
                            onChange={
                                event =>
                                    setSearchInput(
                                        event.target.value
                                            .toUpperCase()
                                    )
                            }
                            onKeyDown={
                                handleSearchKeyDown
                            }
                            placeholder="Search stocks..."
                        />

                        <button
                            onClick={handleSearch}
                            type="button"
                        >
                            Search
                        </button>

                    </div>

                </section>


                {/* =====================================
                    ERROR
                ===================================== */}

                {error && (

                    <div className="error-message">

                        {error}

                    </div>

                )}


                {/* =====================================
                    HERO STOCK
                ===================================== */}

                <section className="stock-hero">


                    <div className="stock-heading">

                        <div className="stock-symbol-box">

                            <span>
                                {stock?.symbol ||
                                    symbol}
                            </span>

                        </div>


                        <div>

                            <p className="stock-company">

                                {stock?.companyName ||
                                    "Loading stock..."}

                            </p>

                            <span className="stock-exchange">

                                {stock?.exchange ||
                                    "NSE"}

                            </span>

                        </div>

                    </div>


                    <div className="stock-price-section">

                        <div className="current-price">

                            ₹
                            {formatPrice(
                                stock?.price
                            )}

                        </div>


                        <div
                            className={
                                isPositive
                                    ? "price-change positive"
                                    : "price-change negative"
                            }
                        >

                            {isPositive

                                ? (
                                    <TrendingUp
                                        size={17}
                                    />
                                )

                                : (
                                    <TrendingDown
                                        size={17}
                                    />
                                )
                            }


                            <span>

                                {isPositive
                                    ? "+"
                                    : ""}

                                {formatPrice(
                                    change
                                )}

                                {" "}

                                (

                                {isPositive
                                    ? "+"
                                    : ""}

                                {changePercent.toFixed(
                                    2
                                )}

                                %)

                            </span>

                        </div>

                    </div>


                    <button
                        className="watch-button"
                        type="button"
                    >

                        <Star
                            size={18}
                        />

                        Watch

                    </button>


                </section>


                {/* =====================================
                    STATS
                ===================================== */}

                <section className="stats-grid">


                    {/* DAY HIGH */}

                    <div className="stat-card">

                        <div className="stat-icon green">

                            <Activity
                                size={19}
                            />

                        </div>

                        <div>

                            <span>
                                Day High
                            </span>

                            <strong>

                                ₹
                                {formatPrice(
                                    stock?.dayHigh
                                )}

                            </strong>

                        </div>

                    </div>


                    {/* DAY LOW */}

                    <div className="stat-card">

                        <div className="stat-icon pink">

                            <TrendingDown
                                size={19}
                            />

                        </div>

                        <div>

                            <span>
                                Day Low
                            </span>

                            <strong>

                                ₹
                                {formatPrice(
                                    stock?.dayLow
                                )}

                            </strong>

                        </div>

                    </div>


                    {/* VOLUME */}

                    <div className="stat-card">

                        <div className="stat-icon green">

                            <BarChart3
                                size={19}
                            />

                        </div>

                        <div>

                            <span>
                                Volume
                            </span>

                            <strong>

                                {formatVolume(
                                    stock?.volume
                                )}

                            </strong>

                        </div>

                    </div>


                    {/* 52 WEEK HIGH */}

                    <div className="stat-card">

                        <div className="stat-icon pink">

                            <TrendingUp
                                size={19}
                            />

                        </div>

                        <div>

                            <span>
                                52W High
                            </span>

                            <strong>

                                ₹
                                {formatPrice(
                                    stock?.fiftyTwoWeekHigh
                                )}

                            </strong>

                        </div>

                    </div>


                </section>


                {/* =====================================
                    CHART CARD
                ===================================== */}

                <section className="chart-card">


                    <div className="chart-header">

                        <div>

                            <h2>

                                {stock?.symbol ||
                                    symbol}

                                {" "}
                                Price

                            </h2>

                            <p>

                                {getRangeTitle(
                                    selectedRange
                                )}

                            </p>

                        </div>


                        <div className="chart-summary">

                            <span>

                                {chartPositive
                                    ? "▲"
                                    : "▼"}

                                {" "}

                                {Math.abs(
                                    chartChange
                                ).toFixed(2)}

                            </span>

                        </div>

                    </div>


                    {/* =================================
                        RANGE BUTTONS
                    ================================= */}

                    <div className="time-buttons">

                        {RANGES.map(
                            range => (

                                <button
                                    key={
                                        range.value
                                    }
                                    className={
                                        selectedRange ===
                                        range.value
                                            ? "selected"
                                            : ""
                                    }
                                    onClick={() =>
                                        handleRangeChange(
                                            range.value
                                        )
                                    }
                                    type="button"
                                >

                                    {
                                        range.label
                                    }

                                </button>

                            )
                        )}

                    </div>


                    {/* =================================
                        CHART LEGEND
                    ================================= */}

                    <div className="chart-legend">

                        <div className="legend-item">

                            <span className="legend-dot close"></span>

                            Close

                        </div>


                        <div className="legend-item">

                            <span className="legend-dot high"></span>

                            High

                        </div>


                        <div className="legend-item">

                            <span className="legend-dot low"></span>

                            Low

                        </div>


                        <div className="legend-item">

                            <span className="legend-dot open"></span>

                            Open

                        </div>

                    </div>


                    {/* =================================
                        CHART
                    ================================= */}

                    <div className="chart-container">

                        {loading ? (

                            <div className="chart-loading">

                                <RefreshCw
                                    size={24}
                                    className="spin"
                                />

                                <span>
                                    Loading market data...
                                </span>

                            </div>

                        ) : chartData.length === 0 ? (

                            <div className="chart-loading">

                                <Activity
                                    size={28}
                                />

                                <span>
                                    No historical data available.
                                </span>

                            </div>

                        ) : (

                            <ResponsiveContainer
                                width="100%"
                                height="100%"
                            >

                                <AreaChart
                                    data={chartData}

                                    margin={{
                                        top: 15,
                                        right: 20,
                                        left: 5,
                                        bottom: 10
                                    }}
                                >

                                    {/* =================================
                                        GRADIENT
                                    ================================= */}

                                    <defs>

                                        <linearGradient
                                            id="closeGradient"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >

                                            <stop
                                                offset="0%"
                                                stopColor="#20a85a"
                                                stopOpacity={0.30}
                                            />

                                            <stop
                                                offset="50%"
                                                stopColor="#20a85a"
                                                stopOpacity={0.10}
                                            />

                                            <stop
                                                offset="100%"
                                                stopColor="#20a85a"
                                                stopOpacity={0}
                                            />

                                        </linearGradient>

                                    </defs>


                                    {/* =================================
                                        GRID
                                    ================================= */}

                                    <CartesianGrid
                                        stroke="#e8efeb"
                                        strokeDasharray="4 5"
                                        vertical={false}
                                    />


                                    {/* =================================
                                        X AXIS
                                    ================================= */}

                                    <XAxis
                                        dataKey="displayDate"

                                        tick={{
                                            fontSize: 11,
                                            fill: "#89958e"
                                        }}

                                        axisLine={{
                                            stroke: "#e6ece8"
                                        }}

                                        tickLine={false}

                                        minTickGap={45}
                                    />


                                    {/* =================================
                                        Y AXIS
                                    ================================= */}

                                    <YAxis
                                        domain={[
                                            "auto",
                                            "auto"
                                        ]}

                                        tick={{
                                            fontSize: 11,
                                            fill: "#89958e"
                                        }}

                                        axisLine={false}

                                        tickLine={false}

                                        width={65}

                                        tickFormatter={
                                            value =>
                                                `₹${Number(
                                                    value
                                                ).toFixed(0)}`
                                        }
                                    />


                                    {/* =================================
                                        TOOLTIP
                                    ================================= */}

                                    <Tooltip

                                        cursor={{
                                            stroke: "#20a85a",
                                            strokeWidth: 1,
                                            strokeDasharray: "4 4"
                                        }}

                                        contentStyle={{
                                            background:
                                                "rgba(255,255,255,0.97)",

                                            border:
                                                "1px solid #dfe9e2",

                                            borderRadius:
                                                "14px",

                                            boxShadow:
                                                "0 12px 30px rgba(30,60,40,0.12)",

                                            padding:
                                                "12px 15px"
                                        }}

                                        labelStyle={{
                                            color:
                                                "#68776e",

                                            fontSize:
                                                "12px",

                                            fontWeight:
                                                700,

                                            marginBottom:
                                                "7px"
                                        }}

                                        itemStyle={{
                                            fontSize:
                                                "12px",

                                            fontWeight:
                                                700
                                        }}

                                        formatter={
                                            (
                                                value,
                                                name
                                            ) => {

                                                const labels = {
                                                    price: "Close",
                                                    openValue: "Open",
                                                    highValue: "High",
                                                    lowValue: "Low"
                                                };

                                                return [
                                                    `₹${formatPrice(
                                                        value
                                                    )}`,
                                                    labels[
                                                        name
                                                    ] || name
                                                ];
                                            }
                                        }

                                    />


                                    {/* =================================
                                        CLOSE AREA
                                    ================================= */}

                                    <Area
                                        type="monotone"

                                        dataKey="price"

                                        stroke="none"

                                        fill="url(#closeGradient)"

                                        fillOpacity={1}

                                        isAnimationActive={true}

                                        animationDuration={900}
                                    />


                                    {/* =================================
                                        HIGH - PINK
                                    ================================= */}

                                    <Line
                                        type="monotone"

                                        dataKey="highValue"

                                        name="High"

                                        stroke="#e85c72"

                                        strokeWidth={2}

                                        dot={false}

                                        activeDot={{
                                            r: 4
                                        }}

                                        connectNulls

                                        isAnimationActive={true}

                                        animationDuration={900}
                                    />


                                    {/* =================================
                                        LOW - PURPLE
                                    ================================= */}

                                    <Line
                                        type="monotone"

                                        dataKey="lowValue"

                                        name="Low"

                                        stroke="#9b7bea"

                                        strokeWidth={2}

                                        dot={false}

                                        activeDot={{
                                            r: 4
                                        }}

                                        connectNulls

                                        isAnimationActive={true}

                                        animationDuration={900}
                                    />


                                    {/* =================================
                                        OPEN - ORANGE
                                    ================================= */}

                                    <Line
                                        type="monotone"

                                        dataKey="openValue"

                                        name="Open"

                                        stroke="#f0a04b"

                                        strokeWidth={2}

                                        dot={false}

                                        activeDot={{
                                            r: 4
                                        }}

                                        connectNulls

                                        isAnimationActive={true}

                                        animationDuration={900}
                                    />


                                    {/* =================================
                                        CLOSE - GREEN
                                    ================================= */}

                                    <Line
                                        type="monotone"

                                        dataKey="price"

                                        name="Close"

                                        stroke="#20a85a"

                                        strokeWidth={3}

                                        dot={false}

                                        activeDot={{
                                            r: 6,
                                            stroke: "#ffffff",
                                            strokeWidth: 3,
                                            fill: "#20a85a"
                                        }}

                                        connectNulls

                                        isAnimationActive={true}

                                        animationDuration={1000}
                                    />

                                </AreaChart>

                            </ResponsiveContainer>

                        )}

                    </div>


                    {/* =================================
                        CHART FOOTER
                    ================================= */}

                    <div className="chart-footer">

                        <span>
                            Market data
                        </span>

                        <span>

                            {chartData.length}

                            {" "}

                            data points

                        </span>

                    </div>

                </section>


                {/* =====================================
                    LOWER CARDS
                ===================================== */}

                <section className="bottom-grid">


                    {/* PREVIOUS CLOSE */}

                    <div className="info-card">

                        <div className="info-card-header">

                            <div>

                                <span>
                                    Previous Close
                                </span>

                                <strong>

                                    ₹
                                    {formatPrice(
                                        stock?.previousClose
                                    )}

                                </strong>

                            </div>

                            <div className="mini-icon green">

                                <BarChart3
                                    size={18}
                                />

                            </div>

                        </div>

                    </div>


                    {/* 52 WEEK LOW */}

                    <div className="info-card">

                        <div className="info-card-header">

                            <div>

                                <span>
                                    52W Low
                                </span>

                                <strong>

                                    ₹
                                    {formatPrice(
                                        stock?.fiftyTwoWeekLow
                                    )}

                                </strong>

                            </div>

                            <div className="mini-icon pink">

                                <TrendingDown
                                    size={18}
                                />

                            </div>

                        </div>

                    </div>


                    {/* PORTFOLIO */}

                    <div className="info-card portfolio-card">

                        <div className="info-card-header">

                            <div>

                                <span>
                                    Portfolio
                                </span>

                                <strong>
                                    Coming Soon
                                </strong>

                            </div>

                            <div className="mini-icon green">

                                <Wallet
                                    size={18}
                                />

                            </div>

                        </div>

                    </div>


                </section>


            </main>

        </div>
    );
}


export default App;