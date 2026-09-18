const {
    getStock,
    getStockHistory,
    searchSymbols
} = require("../services/stockService");


// ======================================================
// GET CURRENT STOCK QUOTE
// ======================================================

const getStockData = async (
    req,
    res
) => {

    try {

        const { symbol } = req.params;

        if (!symbol) {

            return res.status(400).json({
                success: false,
                message: "Stock symbol is required"
            });
        }

        const data = await getStock(symbol);

        return res.json(data);

    } catch (error) {

        console.error(
            "Stock controller error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            symbol:  req.params.symbol?.toUpperCase(),
            message: error.message || "Unable to fetch stock data"
        });
    }
};


// ======================================================
// GET STOCK HISTORY
// ======================================================

const getStockHistoryData = async (
    req,
    res
) => {

    try {

        const { symbol } = req.params;
        const range = req.query.range || "1mo";

        if (!symbol) {

            return res.status(400).json({
                success: false,
                message: "Stock symbol is required"
            });
        }

        const data = await getStockHistory(symbol, range);

        return res.json(data);

    } catch (error) {

        console.error(
            "History controller error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            symbol:  req.params.symbol?.toUpperCase(),
            message: error.message || "Unable to fetch historical data",
            data:    []
        });
    }
};


// ======================================================
// SEARCH SYMBOLS
// ======================================================

const searchSymbolsData = async (
    req,
    res
) => {

    try {

        const { q } = req.query;

        if (!q || q.trim().length < 1) {

            return res.status(400).json({
                success: false,
                message: "Search query is required"
            });
        }

        const results = await searchSymbols(q.trim());

        return res.json({
            success: true,
            results
        });

    } catch (error) {

        console.error(
            "Search controller error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: error.message || "Symbol search failed",
            results: []
        });
    }
};


module.exports = {
    getStockData,
    getStockHistoryData,
    searchSymbolsData
};