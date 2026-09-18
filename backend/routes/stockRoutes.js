const express = require("express");

const router = express.Router();

const {
    getStockData,
    getStockHistoryData,
    searchSymbolsData
} = require("../controllers/stockController");


// ======================================================
// SYMBOL SEARCH
// ======================================================

router.get(
    "/search",
    searchSymbolsData
);


// ======================================================
// CURRENT STOCK QUOTE
// ======================================================

router.get(
    "/:symbol",
    getStockData
);


// ======================================================
// STOCK HISTORY (TIME SERIES)
// ======================================================

router.get(
    "/:symbol/history",
    getStockHistoryData
);


module.exports = router;