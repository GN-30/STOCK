import {
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";

import {
    Star,
    RefreshCw,
    Trash2,
    Upload,
    Search,
    Plus,
    X,
    FileSpreadsheet,
    AlertCircle,
    CheckCircle2,
    Loader2
} from "lucide-react";

import * as XLSX from "xlsx";

import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip
} from "recharts";

import {
    getStock,
    getStockHistory
} from "../services/stockService";

import {
    getWatchlist,
    addCompaniesToWatchlist,
    removeFromWatchlist
} from "../services/watchlistService";


/* =========================================================
   HELPERS
========================================================= */

const sleep = (ms) =>
    new Promise((resolve) =>
        setTimeout(resolve, ms)
    );


const formatPrice = (
    value,
    currency = "INR"
) => {

    if (
        value === null ||
        value === undefined ||
        value === "" ||
        Number.isNaN(Number(value))
    ) {
        return "--";
    }

    try {

        return new Intl.NumberFormat(
            "en-IN",
            {
                style: "currency",
                currency:
                    currency || "INR",
                maximumFractionDigits: 2
            }
        ).format(
            Number(value)
        );

    } catch {

        return Number(value).toFixed(2);
    }
};


const formatPercent = (
    value
) => {

    if (
        value === null ||
        value === undefined ||
        value === "" ||
        Number.isNaN(Number(value))
    ) {
        return "--";
    }

    const number =
        Number(value);

    return (
        `${number >= 0 ? "+" : ""}` +
        `${number.toFixed(2)}%`
    );
};


const formatNumber = (
    value
) => {

    if (
        value === null ||
        value === undefined ||
        value === "" ||
        Number.isNaN(Number(value))
    ) {
        return "--";
    }

    return Number(value).toLocaleString(
        "en-IN",
        {
            maximumFractionDigits: 2
        }
    );
};


const formatGraphDate = (
    value,
    range
) => {

    if (!value) {
        return "";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return String(value);
    }


    if (
        range === "1d" ||
        range === "5d"
    ) {

        return date.toLocaleTimeString(
            "en-IN",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );
    }


    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short"
        }
    );
};


/* =========================================================
   RANGE OPTIONS
========================================================= */

const RANGE_OPTIONS = [
    {
        value: "1d",
        label: "1D"
    },
    {
        value: "5d",
        label: "1W"
    },
    {
        value: "1mo",
        label: "1M"
    },
    {
        value: "3mo",
        label: "3M"
    },
    {
        value: "6mo",
        label: "6M"
    },
    {
        value: "1y",
        label: "1Y"
    }
];


/* =========================================================
   WATCHLIST PAGE
========================================================= */

export default function Watchlist() {

    /* =====================================================
       STATE
    ===================================================== */

    const [
        watchlist,
        setWatchlist
    ] = useState([]);


    const [
        stockData,
        setStockData
    ] = useState({});


    const [
        historyData,
        setHistoryData
    ] = useState({});


    const [
        loading,
        setLoading
    ] = useState(true);


    const [
        uploading,
        setUploading
    ] = useState(false);


    const [
        refreshing,
        setRefreshing
    ] = useState(false);


    const [
        loadingHistory,
        setLoadingHistory
    ] = useState(false);


    const [
        error,
        setError
    ] = useState("");


    const [
        success,
        setSuccess
    ] = useState("");

    /*
       Search only within companies already
       present in the watchlist.
    */
    const [
        searchQuery,
        setSearchQuery
    ] = useState("");


    /*
       Manual company addition.
    */
    const [
        showAddCompany,
        setShowAddCompany
    ] = useState(false);

    const [
        manualCompanyName,
        setManualCompanyName
    ] = useState("");

    const [
        manualSymbol,
        setManualSymbol
    ] = useState("");

    const [
        manualExchange,
        setManualExchange
    ] = useState("NSE");

    const [
        addingCompany,
        setAddingCompany
    ] = useState(false);


    /*
       One global range controls all individual
       company charts.
    */

    const [
        selectedRange,
        setSelectedRange
    ] = useState("1mo");


    const [
        loadingProgress,
        setLoadingProgress
    ] = useState({
        completed: 0,
        total: 0
    });


    /*
       Prevent old history requests from
       overwriting newer requests.
    */

    const historyRequestId =
        useRef(0);


    /* =====================================================
       LOAD WATCHLIST
    ===================================================== */

    const loadWatchlist =
        async () => {

            try {

                setLoading(true);
                setError("");

                const data =
                    await getWatchlist();

                setWatchlist(
                    Array.isArray(data)
                        ? data
                        : []
                );

            } catch (err) {

                console.error(
                    "Watchlist loading error:",
                    err
                );

                setError(
                    err.message ||
                    "Unable to load watchlist."
                );

            } finally {

                setLoading(false);
            }
        };


    /* =====================================================
       FETCH CURRENT STOCK DETAILS
    ===================================================== */

    const fetchStockDetails =
        async (
            stocks = watchlist
        ) => {

            if (
                !stocks ||
                !stocks.length
            ) {
                return;
            }


            const total =
                stocks.length;


            setLoadingProgress({
                completed: 0,
                total
            });


            for (
                let i = 0;
                i < stocks.length;
                i++
            ) {

                const item =
                    stocks[i];


                try {

                    const result =
                        await getStock(
                            item.symbol
                        );


                    setStockData(
                        previous => ({
                            ...previous,

                            [item.symbol]:
                                result
                        })
                    );

                } catch (err) {

                    console.error(
                        `Failed to load ${item.symbol}:`,
                        err
                    );

                    setStockData(
                        previous => ({
                            ...previous,

                            [item.symbol]: {
                                success: false,
                                error:
                                    err.message
                            }
                        })
                    );
                }


                setLoadingProgress({
                    completed:
                        i + 1,
                    total
                });


                /*
                   Reduce Twelve Data
                   rate-limit problems.
                */

                if (
                    i <
                    stocks.length - 1
                ) {

                    await sleep(350);
                }
            }
        };


    /* =====================================================
       FETCH HISTORY FOR EVERY COMPANY
    ===================================================== */

    const fetchHistory =
        async (
            stocks = watchlist,
            range = selectedRange
        ) => {

            if (
                !stocks ||
                !stocks.length
            ) {
                return;
            }


            const requestId =
                ++historyRequestId.current;


            setLoadingHistory(true);

            setHistoryData({});


            for (
                let i = 0;
                i < stocks.length;
                i++
            ) {

                /*
                   Stop old request if range
                   has been changed.
                */

                if (
                    requestId !==
                    historyRequestId.current
                ) {

                    return;
                }


                const item =
                    stocks[i];


                try {

                    const response =
                        await getStockHistory(
                            item.symbol,
                            range
                        );


                    /*
                       Support both possible
                       service response formats.

                       Format 1:

                       [
                           {...}
                       ]

                       Format 2:

                       {
                           success: true,
                           data: [...]
                       }
                    */

                    let history = [];


                    if (
                        Array.isArray(
                            response
                        )
                    ) {

                        history =
                            response;

                    } else if (
                        Array.isArray(
                            response?.data
                        )
                    ) {

                        history =
                            response.data;
                    }


                    /*
                       Keep valid closing prices.
                    */

                    const validHistory =
                        history.filter(
                            point => {

                                if (
                                    !point?.date
                                ) {
                                    return false;
                                }


                                const close =
                                    Number(
                                        point.close
                                    );


                                return Number.isFinite(
                                    close
                                );
                            }
                        );


                    if (
                        requestId ===
                        historyRequestId.current
                    ) {

                        setHistoryData(
                            previous => ({
                                ...previous,

                                [item.symbol]:
                                    validHistory
                            })
                        );
                    }


                    console.log(
                        `${item.symbol} history:`,
                        validHistory.length,
                        "points"
                    );

                } catch (err) {

                    console.error(
                        `History error for ${item.symbol}:`,
                        err
                    );


                    if (
                        requestId ===
                        historyRequestId.current
                    ) {

                        setHistoryData(
                            previous => ({
                                ...previous,

                                [item.symbol]: []
                            })
                        );
                    }
                }


                /*
                   Small delay between
                   history requests.
                */

                if (
                    i <
                    stocks.length - 1
                ) {

                    await sleep(400);
                }
            }


            if (
                requestId ===
                historyRequestId.current
            ) {

                setLoadingHistory(false);
            }
        };


    /* =====================================================
       INITIAL LOAD
    ===================================================== */

    useEffect(() => {

        loadWatchlist();

    }, []);


    /* =====================================================
       LOAD STOCK PRICES
    ===================================================== */

    useEffect(() => {

        if (
            !watchlist.length
        ) {
            return;
        }


        fetchStockDetails(
            watchlist
        );

    }, [watchlist]);


    /* =====================================================
       LOAD HISTORY
    ===================================================== */

    useEffect(() => {

        if (
            !watchlist.length
        ) {
            return;
        }


        fetchHistory(
            watchlist,
            selectedRange
        );


        return () => {

            historyRequestId.current++;

        };

    }, [
        watchlist,
        selectedRange
    ]);


    /* =====================================================
       EXCEL UPLOAD
    ===================================================== */

    const handleExcelUpload =
        async (
            event
        ) => {

            const file =
                event.target.files?.[0];


            if (!file) {
                return;
            }


            try {

                setUploading(true);
                setError("");
                setSuccess("");


                const buffer =
                    await file.arrayBuffer();


                const workbook =
                    XLSX.read(
                        buffer,
                        {
                            type: "array"
                        }
                    );


                if (
                    !workbook.SheetNames.length
                ) {

                    throw new Error(
                        "The Excel file does not contain any sheets."
                    );
                }


                const firstSheet =
                    workbook.Sheets[
                        workbook.SheetNames[0]
                    ];


                const rows =
                    XLSX.utils.sheet_to_json(
                        firstSheet,
                        {
                            defval: ""
                        }
                    );


                if (
                    !rows.length
                ) {

                    throw new Error(
                        "The Excel file does not contain any companies."
                    );
                }


                /* ==========================================
                   READ COMPANY INFORMATION
                ========================================== */

                const companies =
                    rows
                        .map(
                            row => {

                                const companyName =
                                    row[
                                        "Company Name"
                                    ] ||
                                    row[
                                        "Company"
                                    ] ||
                                    row[
                                        "company_name"
                                    ] ||
                                    row[
                                        "CompanyName"
                                    ] ||
                                    row[
                                        "Name"
                                    ] ||
                                    "";


                                const symbol =
                                    row[
                                        "Symbol"
                                    ] ||
                                    row[
                                        "symbol"
                                    ] ||
                                    row[
                                        "Ticker"
                                    ] ||
                                    row[
                                        "ticker"
                                    ] ||
                                    row[
                                        "Ticker Symbol"
                                    ] ||
                                    "";


                                const exchange =
                                    row[
                                        "Exchange"
                                    ] ||
                                    row[
                                        "exchange"
                                    ] ||
                                    "";


                                const country =
                                    row[
                                        "Country"
                                    ] ||
                                    row[
                                        "country"
                                    ] ||
                                    "";


                                return {

                                    companyName:
                                        String(
                                            companyName
                                        ).trim(),

                                    symbol:
                                        String(
                                            symbol
                                        )
                                            .trim()
                                            .toUpperCase(),

                                    exchange:
                                        String(
                                            exchange
                                        ).trim(),

                                    country:
                                        String(
                                            country
                                        ).trim()
                                };
                            }
                        )
                        .filter(
                            company =>
                                company.symbol
                        );


                if (
                    !companies.length
                ) {

                    throw new Error(
                        "No valid stock symbols were found in the Excel file."
                    );
                }


                /* ==========================================
                   REMOVE DUPLICATES
                ========================================== */

                const uniqueCompanies =
                    [];

                const symbols =
                    new Set();


                for (
                    const company
                    of companies
                ) {

                    if (
                        symbols.has(
                            company.symbol
                        )
                    ) {

                        continue;
                    }


                    symbols.add(
                        company.symbol
                    );


                    uniqueCompanies.push(
                        company
                    );
                }


                /* ==========================================
                   SAVE TO SUPABASE
                ========================================== */

                await addCompaniesToWatchlist(
                    uniqueCompanies
                );


                setSuccess(
                    `${uniqueCompanies.length.toLocaleString()} companies loaded from Excel and added to your watched stocks.`
                );


                await loadWatchlist();

            } catch (err) {

                console.error(
                    "Excel upload error:",
                    err
                );


                setError(
                    err.message ||
                    "Unable to process Excel file."
                );

            } finally {

                setUploading(false);

                event.target.value = "";
            }
        };


    /* =====================================================
       MANUAL COMPANY ADD
    ===================================================== */

    const handleManualAdd =
        async (event) => {

            event.preventDefault();

            const companyName =
                manualCompanyName.trim();

            const symbol =
                manualSymbol
                    .trim()
                    .toUpperCase();

            const exchange =
                manualExchange
                    .trim()
                    .toUpperCase();

            if (!companyName) {

                setError(
                    "Please enter the company name."
                );

                return;
            }

            if (!symbol) {

                setError(
                    "Please enter the stock symbol."
                );

                return;
            }

            const duplicate =
                watchlist.some(
                    item =>
                        String(item.symbol || "")
                            .trim()
                            .toUpperCase() === symbol
                );

            if (duplicate) {

                setError(
                    `${symbol} is already in your watchlist.`
                );

                return;
            }

            try {

                setAddingCompany(true);
                setError("");
                setSuccess("");

                await addCompaniesToWatchlist([
                    {
                        companyName,
                        symbol,
                        exchange,
                        country: "India"
                    }
                ]);

                setSuccess(
                    `${companyName} (${symbol}) added to your watchlist.`
                );

                setManualCompanyName("");
                setManualSymbol("");
                setManualExchange("NSE");
                setShowAddCompany(false);

                await loadWatchlist();

            } catch (err) {

                console.error(
                    "Manual company add error:",
                    err
                );

                setError(
                    err.message ||
                    "Unable to add the company."
                );

            } finally {

                setAddingCompany(false);
            }
        };


    /* =====================================================
       REFRESH
    ===================================================== */

    const handleRefresh =
        async () => {

            if (
                !watchlist.length
            ) {
                return;
            }


            try {

                setRefreshing(true);
                setError("");
                setSuccess("");


                await fetchStockDetails(
                    watchlist
                );


                setSuccess(
                    "Stock prices refreshed successfully."
                );

            } catch (err) {

                console.error(
                    "Refresh error:",
                    err
                );


                setError(
                    err.message ||
                    "Unable to refresh prices."
                );

            } finally {

                setRefreshing(false);
            }
        };


    /* =====================================================
       REMOVE STOCK
    ===================================================== */

    const handleRemove =
        async (
            symbol
        ) => {

            try {

                setError("");
                setSuccess("");


                await removeFromWatchlist(
                    symbol
                );


                setWatchlist(
                    previous =>
                        previous.filter(
                            item =>
                                item.symbol !==
                                symbol
                        )
                );


                setStockData(
                    previous => {

                        const copy = {
                            ...previous
                        };

                        delete copy[
                            symbol
                        ];

                        return copy;
                    }
                );


                setHistoryData(
                    previous => {

                        const copy = {
                            ...previous
                        };

                        delete copy[
                            symbol
                        ];

                        return copy;
                    }
                );


                setSuccess(
                    `${symbol} removed from your watchlist.`
                );

            } catch (err) {

                console.error(
                    "Remove error:",
                    err
                );


                setError(
                    err.message ||
                    "Unable to remove stock."
                );
            }
        };


    /* =====================================================
       PREPARE INDIVIDUAL GRAPH DATA
    ===================================================== */

    const getChartData =
        (symbol) => {

            const history =
                historyData[
                    symbol
                ];


            if (
                !Array.isArray(
                    history
                )
            ) {

                return [];
            }


            return history
                .filter(
                    point =>
                        point?.date &&
                        Number.isFinite(
                            Number(
                                point.close
                            )
                        )
                )
                .map(
                    point => ({
                        date:
                            point.date,

                        close:
                            Number(
                                point.close
                            )
                    })
                )
                .sort(
                    (
                        a,
                        b
                    ) =>
                        new Date(
                            a.date
                        ).getTime() -
                        new Date(
                            b.date
                        ).getTime()
                );
        };


    /* =====================================================
       SEARCHED / REORDERED WATCHLIST
    ===================================================== */

    const displayedWatchlist = useMemo(() => {

        const query =
            searchQuery
                .trim()
                .toLowerCase();

        if (!query) {
            return watchlist;
        }

        const matching = [];
        const remaining = [];

        watchlist.forEach(item => {

            const symbol =
                String(
                    item.symbol || ""
                ).toLowerCase();

            const companyName =
                String(
                    item.company_name ||
                    item.companyName ||
                    ""
                ).toLowerCase();

            if (
                symbol.includes(query) ||
                companyName.includes(query)
            ) {
                matching.push(item);
            } else {
                remaining.push(item);
            }
        });

        return [
            ...matching,
            ...remaining
        ];

    }, [
        watchlist,
        searchQuery
    ]);


    /* =====================================================
       RENDER
    ===================================================== */

    return (

        <div className="watchlist-page">

            {/* =================================================
                PAGE HEADER
            ================================================= */}

            <div className="watchlist-header">

                <div>

                    <div className="page-title-row">

                        <Star
                            size={28}
                            fill="currentColor"
                        />

                        <h1>
                            Watched Stocks
                        </h1>

                    </div>


                    <p>
                        Track your watched
                        companies and their
                        market performance
                    </p>

                </div>


                <div className="header-actions">

                    {/* EXCEL */}

                    <label
                        className={
                            `excel-upload-button ${
                                uploading
                                    ? "disabled"
                                    : ""
                            }`
                        }
                    >

                        {uploading ? (

                            <Loader2
                                size={17}
                                className="spin"
                            />

                        ) : (

                            <Upload
                                size={17}
                            />

                        )}


                        {uploading
                            ? "Loading..."
                            : "Upload Excel"}


                        <input
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            hidden
                            disabled={
                                uploading
                            }
                            onChange={
                                handleExcelUpload
                            }
                        />

                    </label>


                    {/* REFRESH */}

                    <button
                        className="refresh-button"
                        onClick={
                            handleRefresh
                        }
                        disabled={
                            refreshing ||
                            loading ||
                            !watchlist.length
                        }
                    >

                        <RefreshCw
                            size={17}
                            className={
                                refreshing
                                    ? "spin"
                                    : ""
                            }
                        />

                        Refresh

                    </button>

                </div>

            </div>


            {/* =================================================
                MESSAGES
            ================================================= */}

            {error && (

                <div className="message error-message">

                    <AlertCircle
                        size={18}
                    />

                    <span>
                        {error}
                    </span>

                </div>

            )}


            {success && (

                <div className="message success-message">

                    <CheckCircle2
                        size={18}
                    />

                    <span>
                        {success}
                    </span>

                </div>

            )}


            {/* =================================================
                PRICE LOADING PROGRESS
            ================================================= */}

            {loadingProgress.total > 0 &&
                loadingProgress.completed <
                loadingProgress.total && (

                <div className="loading-card">

                    <div className="loading-card-top">

                        <div>

                            <strong>
                                Loading market data
                            </strong>

                            <span>
                                {
                                    loadingProgress.completed
                                }
                                {" / "}
                                {
                                    loadingProgress.total
                                }
                            </span>

                        </div>


                        <strong>
                            {
                                Math.round(
                                    (
                                        loadingProgress.completed /
                                        loadingProgress.total
                                    ) *
                                    100
                                )
                            }%
                        </strong>

                    </div>


                    <div className="progress-track">

                        <div
                            className="progress-bar"
                            style={{
                                width:
                                    `${(
                                        loadingProgress.completed /
                                        loadingProgress.total
                                    ) * 100}%`
                            }}
                        />

                    </div>

                </div>

            )}


            {/* =================================================
                EMPTY STATE
            ================================================= */}

            {!loading &&
                watchlist.length === 0 && (

                <div className="empty-state">

                    <FileSpreadsheet
                        size={52}
                    />


                    <h2>
                        No watched stocks yet
                    </h2>


                    <p>
                        Upload your Excel file
                        containing company names
                        and stock symbols to
                        start tracking them.
                    </p>


                    <label
                        className="empty-upload-button"
                    >

                        <Upload
                            size={17}
                        />

                        Upload Companies Excel


                        <input
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            hidden
                            onChange={
                                handleExcelUpload
                            }
                        />

                    </label>

                </div>

            )}


            {/* =================================================
                WATCHED STOCKS TABLE
            ================================================= */}

            {watchlist.length > 0 && (

                <div className="table-card">

                    <div className="table-header">

                        <div className="table-header-title">

                            <div>

                                <h2>
                                    Watched Stocks
                                </h2>

                                <span>
                                    {
                                        watchlist.length.toLocaleString()
                                    }
                                    {" companies"}
                                </span>

                            </div>

                        </div>


                        <div className="watchlist-tools">

                            <a
                                href="/sample-watchlist.xlsx"
                                download="sample-watchlist.xlsx"
                                className="sample-excel-button"
                            >

                                <FileSpreadsheet
                                    size={16}
                                />

                                Sample Excel

                            </a>


                            <div className="watchlist-search">

                                <Search
                                    size={17}
                                />

                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(event) =>
                                    setSearchQuery(
                                        event.target.value
                                    )
                                }
                                placeholder="Search company or symbol..."
                                aria-label="Search watched companies"
                            />

                            {searchQuery && (

                                <button
                                    type="button"
                                    className="clear-search"
                                    onClick={() =>
                                        setSearchQuery("")
                                    }
                                    title="Clear search"
                                    aria-label="Clear search"
                                >
                                    ×
                                </button>

                                )}

                            </div>


                            <button
                                type="button"
                                className="manual-add-button"
                                onClick={() => {
                                    setError("");
                                    setSuccess("");
                                    setManualCompanyName("");
                                    setManualSymbol("");
                                    setManualExchange("NSE");
                                    setShowAddCompany(true);
                                }}
                                title="Add company manually"
                                aria-label="Add company manually"
                            >

                                <Plus
                                    size={17}
                                />

                                <span>Add Company</span>

                            </button>

                        </div>

                    </div>


                    <div className="watchlist-format-note">

                        <FileSpreadsheet
                            size={16}
                        />

                        <span>
                            <strong>
                                Excel format:
                            </strong>
                            {" "}
                            Explore the
                            {" "}
                            <a
                                href="/sample-watchlist.xlsx"
                                download="sample-watchlist.xlsx"
                            >
                                Sample Excel
                            </a>
                            {" "}
                            first to understand the format.
                            Use the columns
                            {" "}
                            <strong>
                                Company Name, Symbol, Exchange, Country
                            </strong>
                            {" "}
                            when uploading your own file.
                        </span>

                    </div>


                    <div className="table-wrapper">

                        <table>

                            <thead>

                                <tr>

                                    <th>#</th>

                                    <th>
                                        Company
                                    </th>

                                    <th>
                                        Symbol
                                    </th>

                                    <th>
                                        Shares
                                    </th>

                                    <th>
                                        Yesterday
                                    </th>

                                    <th>
                                        Today
                                    </th>

                                    <th>
                                        Current Value
                                    </th>

                                    <th>
                                        Change
                                    </th>

                                    <th>
                                        Change %
                                    </th>

                                    <th>
                                        Action
                                    </th>

                                </tr>

                            </thead>


                            <tbody>

                                {displayedWatchlist.length === 0 ? (

                                    <tr>

                                        <td
                                            colSpan="10"
                                            className="search-empty-row"
                                        >
                                            No companies found for
                                            {" "}
                                            "{searchQuery}"
                                        </td>

                                    </tr>

                                ) : (

                                    displayedWatchlist.map(
                                        (
                                            item,
                                            index
                                        ) => {

                                        const stock =
                                            stockData[
                                                item.symbol
                                            ];


                                        const price =
                                            Number(
                                                stock?.price
                                            );


                                        const previousClose =
                                            Number(
                                                stock?.previousClose
                                            );


                                        let change =
                                            Number(
                                                stock?.change
                                            );


                                        if (
                                            !Number.isFinite(
                                                change
                                            )
                                        ) {

                                            change =
                                                price -
                                                previousClose;
                                        }


                                        let changePercent =
                                            Number(
                                                stock?.changePercent
                                            );


                                        if (
                                            !Number.isFinite(
                                                changePercent
                                            )
                                        ) {

                                            changePercent =
                                                previousClose
                                                    ? (
                                                        change /
                                                        previousClose
                                                    ) *
                                                    100
                                                    : 0;
                                        }


                                        const currency =
                                            stock?.currency ||
                                            "INR";


                                        const isPositive =
                                            change >= 0;


                                        return (

                                            <tr
                                                key={
                                                    item.id ||
                                                    item.symbol
                                                }
                                            >

                                                <td className="row-number">
                                                    {index + 1}
                                                </td>


                                                <td>

                                                    <div className="company-cell">

                                                        <div className="company-icon">

                                                            <Star
                                                                size={15}
                                                                fill="currentColor"
                                                            />

                                                        </div>


                                                        <strong>
                                                            {
                                                                item.company_name ||
                                                                item.companyName ||
                                                                item.symbol
                                                            }
                                                        </strong>

                                                    </div>

                                                </td>


                                                <td>

                                                    <span className="symbol-badge">
                                                        {
                                                            item.symbol
                                                        }
                                                    </span>

                                                </td>


                                                <td>
                                                    1
                                                </td>


                                                <td>

                                                    {stock
                                                        ? formatPrice(
                                                            previousClose,
                                                            currency
                                                        )
                                                        : "--"}

                                                </td>


                                                <td>

                                                    <strong className="today-price">

                                                        {stock
                                                            ? formatPrice(
                                                                price,
                                                                currency
                                                            )
                                                            : "--"}

                                                    </strong>

                                                </td>


                                                <td>

                                                    <strong>

                                                        {stock
                                                            ? formatPrice(
                                                                price,
                                                                currency
                                                            )
                                                            : "--"}

                                                    </strong>

                                                </td>


                                                <td>

                                                    {stock ? (

                                                        <span
                                                            className={
                                                                isPositive
                                                                    ? "positive"
                                                                    : "negative"
                                                            }
                                                        >

                                                            {
                                                                isPositive
                                                                    ? "+"
                                                                    : ""
                                                            }

                                                            {
                                                                formatPrice(
                                                                    change,
                                                                    currency
                                                                )
                                                            }

                                                        </span>

                                                    ) : (
                                                        "--"
                                                    )}

                                                </td>


                                                <td>

                                                    {stock ? (

                                                        <span
                                                            className={
                                                                isPositive
                                                                    ? "positive"
                                                                    : "negative"
                                                            }
                                                        >

                                                            {
                                                                formatPercent(
                                                                    changePercent
                                                                )
                                                            }

                                                        </span>

                                                    ) : (
                                                        "--"
                                                    )}

                                                </td>


                                                <td>

                                                    <button
                                                        className="delete-button"
                                                        onClick={() =>
                                                            handleRemove(
                                                                item.symbol
                                                            )
                                                        }
                                                        title="Remove from watchlist"
                                                    >

                                                        <Trash2
                                                            size={16}
                                                        />

                                                    </button>

                                                </td>

                                            </tr>

                                        );
                                    }
                                    )
                                )}

                            </tbody>

                        </table>

                    </div>

                </div>

            )}


            {/* =================================================
                PERFORMANCE SECTION
            ================================================= */}

            {watchlist.length > 0 && (

                <section className="performance-section">

                    {/* ==========================================
                        PERFORMANCE HEADER
                    ========================================== */}

                    <div className="performance-header">

                        <div>

                            <div className="performance-title">

                                <span className="live-dot" />

                                <h2>
                                    Stock Performance
                                </h2>

                            </div>


                            <p>
                                Individual historical
                                price charts
                            </p>

                        </div>


                        {/* ======================================
                            GLOBAL RANGE
                        ====================================== */}

                        <div className="range-buttons">

                            {RANGE_OPTIONS.map(
                                range => (

                                    <button
                                        key={
                                            range.value
                                        }
                                        className={
                                            selectedRange ===
                                            range.value
                                                ? "active"
                                                : ""
                                        }
                                        onClick={() =>
                                            setSelectedRange(
                                                range.value
                                            )
                                        }
                                    >

                                        {
                                            range.label
                                        }

                                    </button>

                                )
                            )}

                        </div>

                    </div>


                    {/* ==========================================
                        INDIVIDUAL COMPANY GRAPHS
                    ========================================== */}

                    <div className="company-charts-grid">

                        {watchlist.map(
                            (
                                item,
                                index
                            ) => {

                                const symbol =
                                    item.symbol;


                                const stock =
                                    stockData[
                                        symbol
                                    ];


                                const data =
                                    getChartData(
                                        symbol
                                    );


                                const price =
                                    Number(
                                        stock?.price
                                    );


                                const previousClose =
                                    Number(
                                        stock?.previousClose
                                    );


                                let changePercent =
                                    Number(
                                        stock?.changePercent
                                    );


                                if (
                                    !Number.isFinite(
                                        changePercent
                                    )
                                ) {

                                    if (
                                        previousClose &&
                                        Number.isFinite(
                                            price
                                        )
                                    ) {

                                        changePercent =
                                            (
                                                (
                                                    price -
                                                    previousClose
                                                ) /
                                                previousClose
                                            ) *
                                            100;

                                    } else {

                                        changePercent =
                                            0;
                                    }
                                }


                                const isPositive =
                                    changePercent >= 0;


                                const currency =
                                    stock?.currency ||
                                    "INR";


                                /*
                                   Use a unique gradient ID
                                   for every company.
                                */

                                const gradientId =
                                    `gradient-${symbol}-${index}`
                                        .replace(
                                            /[^a-zA-Z0-9-_]/g,
                                            "-"
                                        );


                                const lineColor =
                                    isPositive
                                        ? "#35ef87"
                                        : "#ff4d5a";


                                return (

                                    <div
                                        className="company-chart-card"
                                        key={
                                            item.id ||
                                            symbol
                                        }
                                    >

                                        {/* ======================
                                            CARD HEADER
                                        ====================== */}

                                        <div className="company-chart-header">

                                            <div className="company-chart-name">

                                                <div className="stock-logo">

                                                    <Star
                                                        size={17}
                                                        fill="currentColor"
                                                    />

                                                </div>


                                                <div>

                                                    <h3>
                                                        {
                                                            symbol
                                                        }
                                                    </h3>


                                                    <p>
                                                        {
                                                            item.company_name ||
                                                            item.companyName ||
                                                            symbol
                                                        }
                                                    </p>

                                                </div>

                                            </div>


                                            {/* PRICE */}

                                            <div className="company-price-section">

                                                <strong>

                                                    {stock
                                                        ? formatPrice(
                                                            price,
                                                            currency
                                                        )
                                                        : "--"}

                                                </strong>


                                                <span
                                                    className={
                                                        isPositive
                                                            ? "chart-positive"
                                                            : "chart-negative"
                                                    }
                                                >

                                                    {isPositive
                                                        ? "▲"
                                                        : "▼"}

                                                    {" "}

                                                    {
                                                        formatPercent(
                                                            changePercent
                                                        )
                                                    }

                                                </span>

                                            </div>

                                        </div>


                                        {/* ======================
                                            SMALL RANGE LABEL
                                        ====================== */}

                                        <div className="chart-range-label">

                                            {
                                                RANGE_OPTIONS.find(
                                                    range =>
                                                        range.value ===
                                                        selectedRange
                                                )?.label
                                            }

                                            {" "}
                                            chart

                                        </div>


                                        {/* ======================
                                            GRAPH
                                        ====================== */}

                                        <div className="individual-chart">

                                            {data.length > 0 ? (

                                                <ResponsiveContainer
                                                    width="100%"
                                                    height={300}
                                                >

                                                    <AreaChart
                                                        data={data}
                                                        margin={{
                                                            top: 15,
                                                            right: 15,
                                                            left: 5,
                                                            bottom: 10
                                                        }}
                                                    >

                                                        <defs>

                                                            <linearGradient
                                                                id={
                                                                    gradientId
                                                                }
                                                                x1="0"
                                                                y1="0"
                                                                x2="0"
                                                                y2="1"
                                                            >

                                                                <stop
                                                                    offset="0%"
                                                                    stopColor={
                                                                        lineColor
                                                                    }
                                                                    stopOpacity={
                                                                        0.28
                                                                    }
                                                                />

                                                                <stop
                                                                    offset="70%"
                                                                    stopColor={
                                                                        lineColor
                                                                    }
                                                                    stopOpacity={
                                                                        0.08
                                                                    }
                                                                />

                                                                <stop
                                                                    offset="100%"
                                                                    stopColor={
                                                                        lineColor
                                                                    }
                                                                    stopOpacity={
                                                                        0
                                                                    }
                                                                />

                                                            </linearGradient>

                                                        </defs>


                                                        <CartesianGrid
                                                            strokeDasharray="4 5"
                                                            stroke="#1b2822"
                                                            vertical={true}
                                                        />


                                                        <XAxis
                                                            dataKey="date"
                                                            tick={{
                                                                fill:
                                                                    "#718279",
                                                                fontSize:
                                                                    11
                                                            }}
                                                            tickLine={
                                                                false
                                                            }
                                                            axisLine={{
                                                                stroke:
                                                                    "#24332b"
                                                            }}
                                                            tickFormatter={
                                                                value =>
                                                                    formatGraphDate(
                                                                        value,
                                                                        selectedRange
                                                                    )
                                                            }
                                                            minTickGap={
                                                                28
                                                            }
                                                        />


                                                        <YAxis
                                                            tick={{
                                                                fill:
                                                                    "#718279",
                                                                fontSize:
                                                                    11
                                                            }}
                                                            tickLine={
                                                                false
                                                            }
                                                            axisLine={
                                                                false
                                                            }
                                                            domain={[
                                                                "auto",
                                                                "auto"
                                                            ]}
                                                            width={
                                                                65
                                                            }
                                                            tickFormatter={
                                                                value =>
                                                                    `₹${formatNumber(
                                                                        value
                                                                    )}`
                                                            }
                                                        />


                                                        <Tooltip
                                                            cursor={{
                                                                stroke:
                                                                    "#385046",
                                                                strokeWidth:
                                                                    1
                                                            }}

                                                            contentStyle={{
                                                                background:
                                                                    "#111a16",

                                                                border:
                                                                    "1px solid #2a3c32",

                                                                borderRadius:
                                                                    "10px",

                                                                color:
                                                                    "#ffffff",

                                                                boxShadow:
                                                                    "0 15px 35px rgba(0,0,0,0.45)"
                                                            }}

                                                            labelStyle={{
                                                                color:
                                                                    "#dce8e2",

                                                                fontWeight:
                                                                    700,

                                                                marginBottom:
                                                                    "5px"
                                                            }}

                                                            itemStyle={{
                                                                color:
                                                                    lineColor,

                                                                fontWeight:
                                                                    700
                                                            }}

                                                            formatter={
                                                                value =>
                                                                    [
                                                                        formatPrice(
                                                                            value,
                                                                            currency
                                                                        ),
                                                                        "Price"
                                                                    ]
                                                            }

                                                            labelFormatter={
                                                                value =>
                                                                    formatGraphDate(
                                                                        value,
                                                                        selectedRange
                                                                    )
                                                            }
                                                        />


                                                        <Area
                                                            type="monotone"

                                                            dataKey="close"

                                                            stroke={
                                                                lineColor
                                                            }

                                                            strokeWidth={
                                                                2.7
                                                            }

                                                            fill={
                                                                `url(#${gradientId})`
                                                            }

                                                            dot={
                                                                false
                                                            }

                                                            activeDot={{
                                                                r: 5,

                                                                fill:
                                                                    "#0d1411",

                                                                stroke:
                                                                    lineColor,

                                                                strokeWidth:
                                                                    2
                                                            }}

                                                            connectNulls={
                                                                true
                                                            }

                                                            isAnimationActive={
                                                                false
                                                            }
                                                        />

                                                    </AreaChart>

                                                </ResponsiveContainer>

                                            ) : (

                                                <div className="chart-empty">

                                                    {loadingHistory ? (

                                                        <>
                                                            <Loader2
                                                                size={28}
                                                                className="spin"
                                                            />

                                                            <span>
                                                                Loading historical data...
                                                            </span>
                                                        </>

                                                    ) : (

                                                        <>
                                                            <FileSpreadsheet
                                                                size={30}
                                                            />

                                                            <span>
                                                                Historical data unavailable
                                                            </span>
                                                        </>

                                                    )}

                                                </div>

                                            )}

                                        </div>


                                        {/* ======================
                                            CHART FOOTER
                                        ====================== */}

                                        <div className="company-chart-footer">

                                            <span>
                                                {
                                                    data.length
                                                }
                                                {" data points"}
                                            </span>


                                            <span>
                                                {selectedRange === "1d"
                                                    ? "Today"
                                                    : selectedRange === "5d"
                                                        ? "Last 5 trading days"
                                                        : selectedRange === "1mo"
                                                            ? "Last month"
                                                            : selectedRange === "3mo"
                                                                ? "Last 3 months"
                                                                : selectedRange === "6mo"
                                                                    ? "Last 6 months"
                                                                    : "Last year"}
                                            </span>

                                        </div>

                                    </div>

                                );

                            }
                        )}

                    </div>

                </section>

            )}


            {/* =================================================
                MANUAL ADD COMPANY MODAL
            ================================================= */}

            {showAddCompany && (

                <div
                    className="manual-add-overlay"
                    onMouseDown={(event) => {

                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            setShowAddCompany(false);
                        }

                    }}
                >

                    <div className="manual-add-modal">

                        <div className="manual-add-modal-header">

                            <div>

                                <h2>
                                    Add Company
                                </h2>

                                <p>
                                    Add a company manually to your watchlist.
                                </p>

                            </div>


                            <button
                                type="button"
                                className="modal-close-button"
                                onClick={() =>
                                    setShowAddCompany(false)
                                }
                                aria-label="Close"
                            >

                                <X
                                    size={19}
                                />

                            </button>

                        </div>


                        <form
                            onSubmit={
                                handleManualAdd
                            }
                        >

                            <label>
                                Company Name

                                <input
                                    type="text"
                                    value={
                                        manualCompanyName
                                    }
                                    onChange={(event) =>
                                        setManualCompanyName(
                                            event.target.value
                                        )
                                    }
                                    placeholder="e.g. Infosys Limited"
                                    autoFocus
                                />

                            </label>


                            <label>
                                Stock Symbol

                                <input
                                    type="text"
                                    value={
                                        manualSymbol
                                    }
                                    onChange={(event) =>
                                        setManualSymbol(
                                            event.target.value
                                        )
                                    }
                                    placeholder="e.g. INFY"
                                />

                            </label>


                            <label>
                                Exchange

                                <select
                                    value={
                                        manualExchange
                                    }
                                    onChange={(event) =>
                                        setManualExchange(
                                            event.target.value
                                        )
                                    }
                                >

                                    <option value="NSE">
                                        NSE
                                    </option>

                                    <option value="BSE">
                                        BSE
                                    </option>

                                </select>

                            </label>


                            <div className="manual-add-format-hint">

                                <FileSpreadsheet
                                    size={15}
                                />

                                <span>
                                    You can also upload multiple
                                    companies using the
                                    {" "}
                                    <a
                                        href="/sample-watchlist.xlsx"
                                        download="sample-watchlist.xlsx"
                                    >
                                        sample Excel format
                                    </a>.
                                </span>

                            </div>


                            <div className="manual-add-modal-actions">

                                <button
                                    type="button"
                                    className="modal-cancel-button"
                                    onClick={() =>
                                        setShowAddCompany(false)
                                    }
                                >
                                    Cancel
                                </button>


                                <button
                                    type="submit"
                                    className="modal-add-button"
                                    disabled={
                                        addingCompany
                                    }
                                >

                                    {addingCompany ? (
                                        <>
                                            <Loader2
                                                size={16}
                                                className="spin"
                                            />
                                            Adding...
                                        </>
                                    ) : (
                                        <>
                                            <Plus
                                                size={16}
                                            />
                                            Add Company
                                        </>
                                    )}

                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}


            {/* =================================================
                CSS
            ================================================= */}

            <style>{`

                /* =================================================
                   BASE
                ================================================= */

                .watchlist-page {

                    width: 100%;

                    min-height: 100%;

                    padding: 30px;

                    box-sizing: border-box;

                    background:
                        #0d1411 !important;

                    color:
                        #dce8e1 !important;

                    overflow-x:
                        hidden;

                }


                .watchlist-page *,
                .watchlist-page *::before,
                .watchlist-page *::after {

                    box-sizing:
                        border-box;

                }


                /* =================================================
                   PAGE HEADER
                ================================================= */

                .watchlist-header {

                    display:
                        flex;

                    justify-content:
                        space-between;

                    align-items:
                        center;

                    gap:
                        20px;

                    margin-bottom:
                        25px;

                }


                .page-title-row {

                    display:
                        flex;

                    align-items:
                        center;

                    gap:
                        11px;

                }


                .page-title-row svg {

                    color:
                        #35ef87 !important;

                }


                .page-title-row h1 {

                    margin:
                        0;

                    color:
                        #f1f7f3 !important;

                    font-size:
                        30px;

                    font-weight:
                        750;

                    letter-spacing:
                        -0.6px;

                }


                .watchlist-header p {

                    margin:
                        7px 0 0 39px;

                    color:
                        #718279 !important;

                    font-size:
                        14px;

                }


                /* =================================================
                   HEADER BUTTONS
                ================================================= */

                .header-actions {

                    display:
                        flex;

                    gap:
                        9px;

                }


                .excel-upload-button,
                .refresh-button,
                .manual-add-button {

                    display:
                        inline-flex;

                    align-items:
                        center;

                    justify-content:
                        center;

                    gap:
                        8px;

                    height:
                        40px;

                    padding:
                        0 15px;

                    border-radius:
                        9px;

                    font-size:
                        13px;

                    font-weight:
                        700;

                    cursor:
                        pointer;

                    transition:
                        all 0.2s ease;

                }


                .excel-upload-button {

                    background:
                        #35ef87 !important;

                    border:
                        1px solid #35ef87;

                    color:
                        #07110b !important;

                }


                .excel-upload-button:hover {

                    background:
                        #4df596 !important;

                    box-shadow:
                        0 0 25px
                        rgba(53,239,135,0.14);

                }


                .manual-add-button {

                    min-width:
                        112px;

                    height:
                        40px;

                    padding:
                        0 12px;

                    display:
                        inline-flex;

                    align-items:
                        center;

                    justify-content:
                        center;

                    background:
                        #123321 !important;

                    border:
                        1px solid #35ef87 !important;

                    border-radius:
                        9px;

                    color:
                        #35ef87 !important;

                    cursor:
                        pointer;

                }


                .manual-add-button:hover {

                    background:
                        #19472d !important;

                    box-shadow:
                        0 0 22px
                        rgba(53,239,135,0.12);

                }


                .refresh-button {

                    background:
                        #121b17 !important;

                    border:
                        1px solid #26372e !important;

                    color:
                        #afbeb6 !important;

                }


                .refresh-button:hover {

                    background:
                        #18231d !important;

                    color:
                        #ffffff !important;

                    border-color:
                        #3b5145 !important;

                }


                .refresh-button:disabled,
                .excel-upload-button.disabled {

                    opacity:
                        0.5;

                    cursor:
                        not-allowed;

                }


                /* =================================================
                   MESSAGES
                ================================================= */

                .message {

                    display:
                        flex;

                    align-items:
                        center;

                    gap:
                        9px;

                    padding:
                        12px 15px;

                    margin-bottom:
                        18px;

                    border-radius:
                        9px;

                    font-size:
                        13px;

                }


                .error-message {

                    background:
                        #241518 !important;

                    border:
                        1px solid #4d2930;

                    color:
                        #ff6977 !important;

                }


                .success-message {

                    background:
                        #10251a !important;

                    border:
                        1px solid #24553a;

                    color:
                        #4bef91 !important;

                }


                /* =================================================
                   LOADING CARD
                ================================================= */

                .loading-card {

                    padding:
                        17px 20px;

                    margin-bottom:
                        20px;

                    border-radius:
                        13px;

                    background:
                        #111a16 !important;

                    border:
                        1px solid #202e27;

                }


                .loading-card-top {

                    display:
                        flex;

                    justify-content:
                        space-between;

                    margin-bottom:
                        11px;

                    font-size:
                        13px;

                }


                .loading-card-top strong {

                    color:
                        #dce8e1 !important;

                }


                .loading-card-top span {

                    color:
                        #718279 !important;

                    margin-left:
                        7px;

                }


                .progress-track {

                    height:
                        6px;

                    width:
                        100%;

                    background:
                        #1c2922 !important;

                    border-radius:
                        10px;

                    overflow:
                        hidden;

                }


                .progress-bar {

                    height:
                        100%;

                    background:
                        #35ef87 !important;

                    border-radius:
                        10px;

                    box-shadow:
                        0 0 12px
                        rgba(53,239,135,0.3);

                }


                /* =================================================
                   TABLE
                ================================================= */

                .table-card {

                    margin-bottom:
                        28px;

                    border:
                        1px solid #202e27;

                    border-radius:
                        15px;

                    overflow:
                        hidden;

                    background:
                        #111a16 !important;

                    box-shadow:
                        0 15px 45px
                        rgba(0,0,0,0.18);

                }


                .table-header {

                    padding:
                        14px 18px;

                    display:
                        flex;

                    align-items:
                        center;

                    justify-content:
                        space-between;

                    gap:
                        18px;

                    background:
                        #111a16 !important;

                    border-bottom:
                        1px solid #1d2a24;

                }


                .table-header-title {

                    display:
                        flex;

                    align-items:
                        center;

                    min-width:
                        0;

                }


                .watchlist-tools {

                    display:
                        flex;

                    align-items:
                        center;

                    gap:
                        9px;

                    flex-shrink:
                        0;

                }


                .sample-excel-button {

                    height:
                        40px;

                    display:
                        inline-flex;

                    align-items:
                        center;

                    justify-content:
                        center;

                    gap:
                        7px;

                    padding:
                        0 12px;

                    border:
                        1px solid #26372e;

                    border-radius:
                        9px;

                    background:
                        #14201a;

                    color:
                        #a9b9b0;

                    font-size:
                        12px;

                    font-weight:
                        700;

                    text-decoration:
                        none;

                    white-space:
                        nowrap;

                    transition:
                        all 0.2s ease;

                }


                .sample-excel-button:hover {

                    background:
                        #1a2a21;

                    border-color:
                        #35ef87;

                    color:
                        #35ef87;

                }


                .table-header h2 {

                    margin:
                        0;

                    color:
                        #edf5f0 !important;

                    font-size:
                        17px;

                }


                .table-header span {

                    display:
                        block;

                    margin-top:
                        4px;

                    color:
                        #6f8077 !important;

                    font-size:
                        12px;

                }


                /* =================================================
                   WATCHLIST SEARCH
                ================================================= */

                .watchlist-search {

                    width:
                        min(330px, 100%);

                    height:
                        40px;

                    display:
                        flex;

                    align-items:
                        center;

                    gap:
                        9px;

                    padding:
                        0 11px;

                    border:
                        1px solid #29372f;

                    border-radius:
                        9px;

                    background:
                        #0d1511;

                    color:
                        #708078;

                    flex-shrink:
                        0;

                    transition:
                        border-color 0.2s ease,
                        box-shadow 0.2s ease;

                }


                .watchlist-search:focus-within {

                    border-color:
                        #35ef87;

                    box-shadow:
                        0 0 0 3px
                        rgba(53,239,135,0.07);

                }


                .watchlist-search input {

                    width:
                        100%;

                    min-width:
                        0;

                    border:
                        none;

                    outline:
                        none;

                    background:
                        transparent;

                    color:
                        #e5eee9;

                    font-size:
                        13px;

                }


                .watchlist-search input::placeholder {

                    color:
                        #63736b;

                }


                .clear-search {

                    width:
                        22px;

                    height:
                        22px;

                    display:
                        flex;

                    align-items:
                        center;

                    justify-content:
                        center;

                    padding:
                        0;

                    border:
                        none;

                    border-radius:
                        50%;

                    background:
                        #1d2923;

                    color:
                        #91a099;

                    font-size:
                        17px;

                    line-height:
                        1;

                    cursor:
                        pointer;

                    flex-shrink:
                        0;

                }


                .clear-search:hover {

                    background:
                        #293a31;

                    color:
                        #ffffff;

                }


                .search-empty-row td {

                    padding:
                        35px 20px !important;

                    text-align:
                        center;

                    color:
                        #718279 !important;

                    background:
                        #111a16 !important;

                }


                .watchlist-format-note {

                    display:
                        flex;

                    align-items:
                        flex-start;

                    gap:
                        9px;

                    margin:
                        0 18px 12px;

                    padding:
                        10px 12px;

                    border:
                        1px solid #25362d;

                    border-radius:
                        9px;

                    background:
                        #0d1712;

                    color:
                        #788980;

                    font-size:
                        12px;

                    line-height:
                        1.5;

                }


                .watchlist-format-note svg {

                    color:
                        #35ef87;

                    flex-shrink:
                        0;

                    margin-top:
                        2px;

                }


                .watchlist-format-note strong {

                    color:
                        #b9c8c0;

                }


                .watchlist-format-note a {

                    color:
                        #35ef87;

                    font-weight:
                        700;

                    text-decoration:
                        none;

                }


                .watchlist-format-note a:hover {

                    text-decoration:
                        underline;

                }


                .table-wrapper {

                    width:
                        100%;

                    overflow-x:
                        auto;

                }


                table {

                    width:
                        100%;

                    min-width:
                        1050px;

                    border-collapse:
                        collapse;

                    background:
                        #111a16 !important;

                }


                thead {

                    background:
                        #0e1713 !important;

                }


                th {

                    padding:
                        13px 16px;

                    text-align:
                        left;

                    color:
                        #72837a !important;

                    background:
                        #0e1713 !important;

                    font-size:
                        10px;

                    font-weight:
                        750;

                    letter-spacing:
                        0.06em;

                    text-transform:
                        uppercase;

                }


                td {

                    padding:
                        14px 16px;

                    border-top:
                        1px solid #1c2923;

                    color:
                        #aebdb4 !important;

                    background:
                        #111a16 !important;

                    font-size:
                        13px;

                    white-space:
                        nowrap;

                }


                tbody tr:hover td {

                    background:
                        #151f1a !important;

                }


                .row-number {

                    color:
                        #4e6056 !important;

                }


                .company-cell {

                    display:
                        flex;

                    align-items:
                        center;

                    gap:
                        10px;

                    min-width:
                        230px;

                }


                .company-icon {

                    width:
                        31px;

                    height:
                        31px;

                    display:
                        flex;

                    align-items:
                        center;

                    justify-content:
                        center;

                    border-radius:
                        8px;

                    color:
                        #35ef87 !important;

                    background:
                        #142b1e !important;

                }


                .company-cell strong {

                    color:
                        #e0ebe4 !important;

                    font-weight:
                        650;

                }


                .symbol-badge {

                    padding:
                        5px 9px;

                    border-radius:
                        6px;

                    color:
                        #aabbb1 !important;

                    background:
                        #19231e !important;

                    border:
                        1px solid #29362f;

                    font-size:
                        11px;

                    font-weight:
                        750;

                }


                .today-price {

                    color:
                        #f1f7f3 !important;

                }


                .positive {

                    color:
                        #35ef87 !important;

                    font-weight:
                        650;

                }


                .negative {

                    color:
                        #ff5361 !important;

                    font-weight:
                        650;

                }


                .delete-button {

                    width:
                        32px;

                    height:
                        32px;

                    display:
                        flex;

                    align-items:
                        center;

                    justify-content:
                        center;

                    border:
                        1px solid #42252b;

                    border-radius:
                        8px;

                    background:
                        #211518 !important;

                    color:
                        #ff5361 !important;

                    cursor:
                        pointer;

                    transition:
                        all 0.2s ease;

                }


                .delete-button:hover {

                    background:
                        #321b20 !important;

                    border-color:
                        #71313a;

                }


                /* =================================================
                   PERFORMANCE SECTION
                ================================================= */

                .performance-section {

                    width:
                        100%;

                }


                .performance-header {

                    display:
                        flex;

                    justify-content:
                        space-between;

                    align-items:
                        center;

                    gap:
                        20px;

                    margin-bottom:
                        17px;

                }


                .performance-title {

                    display:
                        flex;

                    align-items:
                        center;

                    gap:
                        10px;

                }


                .performance-title h2 {

                    margin:
                        0;

                    color:
                        #f0f6f2 !important;

                    font-size:
                        20px;

                    font-weight:
                        750;

                }


                .performance-header p {

                    margin:
                        6px 0 0 18px;

                    color:
                        #718279 !important;

                    font-size:
                        12px;

                }


                .live-dot {

                    width:
                        7px;

                    height:
                        7px;

                    border-radius:
                        50%;

                    background:
                        #35ef87;

                    box-shadow:
                        0 0 13px
                        rgba(53,239,135,0.8);

                }


                /* =================================================
                   RANGE BUTTONS
                ================================================= */

                .range-buttons {

                    display:
                        flex;

                    align-items:
                        center;

                    gap:
                        6px;

                    padding:
                        4px;

                    border:
                        1px solid #202e27;

                    border-radius:
                        10px;

                    background:
                        #111a16 !important;

                }


                .range-buttons button {

                    min-width:
                        49px;

                    height:
                        34px;

                    padding:
                        0 11px;

                    border:
                        1px solid transparent !important;

                    border-radius:
                        8px;

                    background:
                        transparent !important;

                    color:
                        #73847b !important;

                    font-size:
                        12px;

                    font-weight:
                        750;

                    cursor:
                        pointer;

                    transition:
                        all 0.2s ease;

                }


                .range-buttons button:hover {

                    color:
                        #d9e5de !important;

                    background:
                        #17221c !important;

                }


                .range-buttons button.active {

                    color:
                        #35ef87 !important;

                    background:
                        #123321 !important;

                    border:
                        1px solid #35ef87 !important;

                    box-shadow:
                        0 0 14px
                        rgba(53,239,135,0.08);

                }


                /* =================================================
                   COMPANY GRAPH GRID
                ================================================= */

                .company-charts-grid {

                    display:
                        grid;

                    grid-template-columns:
                        repeat(2, minmax(0, 1fr));

                    gap:
                        18px;

                }


                /* =================================================
                   INDIVIDUAL COMPANY CARD
                ================================================= */

                .company-chart-card {

                    min-width:
                        0;

                    background:
                        #0f1713 !important;

                    border:
                        1px solid #202e27;

                    border-radius:
                        14px;

                    overflow:
                        hidden;

                    box-shadow:
                        0 16px 45px
                        rgba(0,0,0,0.20);

                    transition:
                        border-color 0.2s ease,
                        transform 0.2s ease,
                        box-shadow 0.2s ease;

                }


                .company-chart-card:hover {

                    border-color:
                        #2c4035;

                    transform:
                        translateY(-1px);

                    box-shadow:
                        0 20px 55px
                        rgba(0,0,0,0.28);

                }


                /* =================================================
                   COMPANY GRAPH HEADER
                ================================================= */

                .company-chart-header {

                    display:
                        flex;

                    align-items:
                        center;

                    justify-content:
                        space-between;

                    gap:
                        15px;

                    padding:
                        17px 18px 10px;

                }


                .company-chart-name {

                    display:
                        flex;

                    align-items:
                        center;

                    gap:
                        10px;

                    min-width:
                        0;

                }


                .stock-logo {

                    width:
                        35px;

                    height:
                        35px;

                    display:
                        flex;

                    align-items:
                        center;

                    justify-content:
                        center;

                    border-radius:
                        9px;

                    background:
                        #142b1e !important;

                    color:
                        #35ef87 !important;

                    flex-shrink:
                        0;

                }


                .company-chart-name h3 {

                    margin:
                        0;

                    color:
                        #f1f7f3 !important;

                    font-size:
                        17px;

                    font-weight:
                        750;

                }


                .company-chart-name p {

                    margin:
                        3px 0 0;

                    max-width:
                        240px;

                    overflow:
                        hidden;

                    text-overflow:
                        ellipsis;

                    white-space:
                        nowrap;

                    color:
                        #687a70 !important;

                    font-size:
                        11px;

                }


                /* =================================================
                   PRICE + CHANGE
                ================================================= */

                .company-price-section {

                    display:
                        flex;

                    flex-direction:
                        column;

                    align-items:
                        flex-end;

                    gap:
                        5px;

                    flex-shrink:
                        0;

                }


                .company-price-section strong {

                    color:
                        #f3f8f5 !important;

                    font-size:
                        17px;

                    font-weight:
                        750;

                }


                .chart-positive,
                .chart-negative {

                    display:
                        inline-flex;

                    align-items:
                        center;

                    padding:
                        5px 8px;

                    border-radius:
                        7px;

                    font-size:
                        11px;

                    font-weight:
                        750;

                }


                .chart-positive {

                    color:
                        #35ef87 !important;

                    background:
                        #10301f !important;

                }


                .chart-negative {

                    color:
                        #ff5361 !important;

                    background:
                        #32171b !important;

                }


                /* =================================================
                   RANGE LABEL
                ================================================= */

                .chart-range-label {

                    padding:
                        0 18px;

                    color:
                        #63756b !important;

                    font-size:
                        11px;

                    font-weight:
                        650;

                }


                /* =================================================
                   INDIVIDUAL CHART
                ================================================= */

                .individual-chart {

                    width:
                        100%;

                    height:
                        320px;

                    padding:
                        4px 9px 0;

                    background:
                        #0d1411 !important;

                }


                .chart-empty {

                    height:
                        100%;

                    display:
                        flex;

                    flex-direction:
                        column;

                    align-items:
                        center;

                    justify-content:
                        center;

                    gap:
                        9px;

                    color:
                        #65776d !important;

                    font-size:
                        12px;

                }


                .chart-empty svg {

                    color:
                        #35ef87 !important;

                }


                /* =================================================
                   CHART FOOTER
                ================================================= */

                .company-chart-footer {

                    display:
                        flex;

                    align-items:
                        center;

                    justify-content:
                        space-between;

                    padding:
                        10px 18px 13px;

                    border-top:
                        1px solid #1a2720;

                    color:
                        #56685e !important;

                    font-size:
                        10px;

                }


                /* =================================================
                   EMPTY STATE
                ================================================= */

                .empty-state {

                    padding:
                        70px 25px;

                    text-align:
                        center;

                    background:
                        #111a16 !important;

                    border:
                        1px dashed #2b3b32;

                    border-radius:
                        15px;

                }


                .empty-state svg {

                    color:
                        #35ef87 !important;

                    margin-bottom:
                        12px;

                }


                .empty-state h2 {

                    margin:
                        0 0 8px;

                    color:
                        #e7f0eb !important;

                }


                .empty-state p {

                    max-width:
                        450px;

                    margin:
                        0 auto 22px;

                    color:
                        #718279 !important;

                    line-height:
                        1.6;

                    font-size:
                        13px;

                }


                .empty-upload-button {

                    display:
                        inline-flex;

                    align-items:
                        center;

                    gap:
                        8px;

                    padding:
                        11px 17px;

                    border:
                        1px solid #35ef87;

                    border-radius:
                        9px;

                    background:
                        #35ef87 !important;

                    color:
                        #07110b !important;

                    font-size:
                        13px;

                    font-weight:
                        700;

                    cursor:
                        pointer;

                }


                /* =================================================
                   SPINNER
                ================================================= */

                .spin {

                    animation:
                        watchlistSpin
                        1s
                        linear
                        infinite;

                }


                @keyframes watchlistSpin {

                    from {
                        transform:
                            rotate(0deg);
                    }

                    to {
                        transform:
                            rotate(360deg);
                    }

                }


                /* =================================================
                   MANUAL ADD COMPANY MODAL
                ================================================= */

                .manual-add-overlay {

                    position:
                        fixed;

                    inset:
                        0;

                    z-index:
                        1000;

                    display:
                        flex;

                    align-items:
                        center;

                    justify-content:
                        center;

                    padding:
                        20px;

                    background:
                        rgba(0,0,0,0.72);

                    backdrop-filter:
                        blur(7px);

                }


                .manual-add-modal {

                    width:
                        min(460px, 100%);

                    max-height:
                        calc(100vh - 40px);

                    overflow-y:
                        auto;

                    padding:
                        22px;

                    border:
                        1px solid #2b3e34;

                    border-radius:
                        16px;

                    background:
                        #111a16;

                    box-shadow:
                        0 25px 80px
                        rgba(0,0,0,0.55);

                }


                .manual-add-modal-header {

                    display:
                        flex;

                    align-items:
                        flex-start;

                    justify-content:
                        space-between;

                    gap:
                        15px;

                    margin-bottom:
                        20px;

                }


                .manual-add-modal-header h2 {

                    margin:
                        0;

                    color:
                        #f1f7f3;

                    font-size:
                        20px;

                }


                .manual-add-modal-header p {

                    margin:
                        5px 0 0;

                    color:
                        #718279;

                    font-size:
                        12px;

                }


                .modal-close-button {

                    width:
                        34px;

                    height:
                        34px;

                    display:
                        flex;

                    align-items:
                        center;

                    justify-content:
                        center;

                    border:
                        1px solid #293930;

                    border-radius:
                        8px;

                    background:
                        #16211b;

                    color:
                        #9aaba2;

                    cursor:
                        pointer;

                }


                .modal-close-button:hover {

                    color:
                        #ffffff;

                    border-color:
                        #3b5145;

                }


                .manual-add-modal form {

                    display:
                        flex;

                    flex-direction:
                        column;

                    gap:
                        15px;

                }


                .manual-add-modal label {

                    display:
                        flex;

                    flex-direction:
                        column;

                    gap:
                        7px;

                    color:
                        #aebdb4;

                    font-size:
                        12px;

                    font-weight:
                        700;

                }


                .manual-add-modal input,
                .manual-add-modal select {

                    width:
                        100%;

                    height:
                        42px;

                    padding:
                        0 12px;

                    border:
                        1px solid #293930;

                    border-radius:
                        9px;

                    outline:
                        none;

                    background:
                        #0d1511;

                    color:
                        #e3ece7;

                    font-size:
                        13px;

                }


                .manual-add-modal input:focus,
                .manual-add-modal select:focus {

                    border-color:
                        #35ef87;

                    box-shadow:
                        0 0 0 3px
                        rgba(53,239,135,0.06);

                }


                .manual-add-modal input::placeholder {

                    color:
                        #596a61;

                }


                .manual-add-format-hint {

                    display:
                        flex;

                    align-items:
                        flex-start;

                    gap:
                        8px;

                    padding:
                        10px 11px;

                    border:
                        1px solid #25362d;

                    border-radius:
                        8px;

                    background:
                        #0d1712;

                    color:
                        #73847b;

                    font-size:
                        11px;

                    line-height:
                        1.45;

                }


                .manual-add-format-hint svg {

                    color:
                        #35ef87;

                    flex-shrink:
                        0;

                }


                .manual-add-format-hint a {

                    color:
                        #35ef87;

                    font-weight:
                        700;

                    text-decoration:
                        none;

                }


                .manual-add-format-hint a:hover {

                    text-decoration:
                        underline;

                }


                .manual-add-modal-actions {

                    display:
                        flex;

                    justify-content:
                        flex-end;

                    gap:
                        9px;

                    margin-top:
                        4px;

                }


                .modal-cancel-button,
                .modal-add-button {

                    height:
                        40px;

                    display:
                        inline-flex;

                    align-items:
                        center;

                    justify-content:
                        center;

                    gap:
                        7px;

                    padding:
                        0 15px;

                    border-radius:
                        9px;

                    font-size:
                        12px;

                    font-weight:
                        750;

                    cursor:
                        pointer;

                }


                .modal-cancel-button {

                    border:
                        1px solid #293930;

                    background:
                        #16211b;

                    color:
                        #9aa9a1;

                }


                .modal-cancel-button:hover {

                    color:
                        #ffffff;

                    border-color:
                        #3b5145;

                }


                .modal-add-button {

                    border:
                        1px solid #35ef87;

                    background:
                        #35ef87;

                    color:
                        #07110b;

                }


                .modal-add-button:hover {

                    background:
                        #4df596;

                }


                .modal-add-button:disabled {

                    opacity:
                        0.55;

                    cursor:
                        not-allowed;

                }


                /* =================================================
                   RESPONSIVE
                ================================================= */

                @media (
                    max-width: 1100px
                ) {

                    .company-charts-grid {

                        grid-template-columns:
                            1fr;

                    }

                }


                @media (
                    max-width: 850px
                ) {

                    .table-header {

                        align-items:
                            stretch;

                        flex-direction:
                            column;

                    }


                    .watchlist-tools {

                        width:
                            100%;

                        flex-wrap:
                            wrap;

                    }


                    .watchlist-search {

                        flex:
                            1 1 220px;

                        width:
                            auto;

                    }


                    .sample-excel-button,
                    .manual-add-button {

                        flex-shrink:
                            0;

                    }


                    .watchlist-page {

                        padding:
                            20px;

                    }


                    .watchlist-header,
                    .performance-header {

                        flex-direction:
                            column;

                        align-items:
                            flex-start;

                    }


                    .header-actions {

                        width:
                            100%;

                    }


                    .excel-upload-button,
                    .refresh-button {

                        flex:
                            1;

                    }


                    .range-buttons {

                        width:
                            100%;

                    }


                    .range-buttons button {

                        flex:
                            1;

                    }

                }


                @media (
                    max-width: 550px
                ) {

                    .watchlist-page {

                        padding:
                            14px;

                    }


                    .page-title-row h1 {

                        font-size:
                            24px;

                    }


                    .watchlist-header p {

                        margin-left:
                            39px;

                    }


                    .header-actions {

                        flex-direction:
                            column;

                    }


                    .excel-upload-button,
                    .refresh-button {

                        width:
                            100%;

                    }


                    .company-chart-header {

                        align-items:
                            flex-start;

                    }


                    .company-price-section {

                        align-items:
                            flex-end;

                    }


                    .company-chart-name p {

                        max-width:
                            140px;

                    }


                    .individual-chart {

                        height:
                            290px;

                    }

                }

            `}</style>

        </div>
    );
}