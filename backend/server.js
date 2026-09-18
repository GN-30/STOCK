const express = require("express");
const cors = require("cors");

require("dotenv").config();
console.log(
    "Twelve Data API key exists:",
    !!process.env.TWELVE_DATA_API_KEY
);

const stockRoutes =
    require("./routes/stockRoutes");


const app =
    express();


// ======================================================
// MIDDLEWARE
// ======================================================

app.use(
    cors()
);

app.use(
    express.json()
);


// ======================================================
// HOME
// ======================================================

app.get(
    "/",
    (req, res) => {

        res.json({

            success: true,

            message:
                "Stock Market API is running"
        });

    }
);


// ======================================================
// STOCK ROUTES
// ======================================================

app.use(
    "/api/stocks",
    stockRoutes
);


// ======================================================
// PORT
// ======================================================

const PORT =
    process.env.PORT || 5000;


app.listen(
    PORT,
    () => {

        console.log(
            `Server running on port ${PORT}`
        );

    }
);