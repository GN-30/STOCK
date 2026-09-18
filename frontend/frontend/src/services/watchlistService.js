import { supabase } from "../lib/supabase";


/* =========================================================
   GET CURRENT USER
========================================================= */

const getCurrentUser = async () => {

    const {
        data: { user },
        error
    } = await supabase.auth.getUser();

    if (error) {
        throw error;
    }

    if (!user) {
        throw new Error(
            "You must be logged in."
        );
    }

    return user;
};


/* =========================================================
   GET WATCHLIST
========================================================= */

export const getWatchlist = async () => {

    const user =
        await getCurrentUser();

    const {
        data,
        error
    } = await supabase
        .from("watchlists")
        .select("*")
        .eq(
            "user_id",
            user.id
        )
        .order(
            "created_at",
            {
                ascending: false
            }
        );

    if (error) {
        throw error;
    }

    return data || [];
};


/* =========================================================
   ADD SINGLE STOCK
   USED FOR MANUAL ENTRY
========================================================= */

export const addToWatchlist = async (
    symbol,
    companyName = ""
) => {

    const user =
        await getCurrentUser();

    const cleanSymbol =
        String(symbol || "")
            .trim()
            .toUpperCase();

    const cleanCompanyName =
        String(companyName || "")
            .trim();

    if (!cleanSymbol) {
        throw new Error(
            "Stock symbol is required."
        );
    }

    const {
        data,
        error
    } = await supabase
        .from("watchlists")
        .upsert(
            {
                user_id: user.id,
                symbol: cleanSymbol,
                company_name:
                    cleanCompanyName ||
                    cleanSymbol
            },
            {
                onConflict:
                    "user_id,symbol"
            }
        )
        .select()
        .single();

    if (error) {

        console.error(
            "Add stock error:",
            error
        );

        throw error;
    }

    return data;
};


/* =========================================================
   ADD MULTIPLE COMPANIES
   USED FOR EXCEL UPLOAD
========================================================= */

export const addCompaniesToWatchlist = async (
    companies
) => {

    const user =
        await getCurrentUser();

    if (
        !companies ||
        companies.length === 0
    ) {
        return [];
    }


    /* -----------------------------------------------------
       Clean and remove duplicates
    ----------------------------------------------------- */

    const uniqueCompanies = [];

    const seenSymbols =
        new Set();

    for (
        const company of companies
    ) {

        const cleanSymbol =
            String(
                company.symbol || ""
            )
                .trim()
                .toUpperCase();

        if (!cleanSymbol) {
            continue;
        }

        if (
            seenSymbols.has(
                cleanSymbol
            )
        ) {
            continue;
        }

        seenSymbols.add(
            cleanSymbol
        );

        uniqueCompanies.push(
            {
                user_id:
                    user.id,

                symbol:
                    cleanSymbol,

                company_name:
                    String(
                        company.companyName ||
                        cleanSymbol
                    ).trim()
            }
        );
    }


    /* -----------------------------------------------------
       Nothing valid
    ----------------------------------------------------- */

    if (
        uniqueCompanies.length === 0
    ) {
        return [];
    }


    /* -----------------------------------------------------
       Insert in chunks

       500 rows per request prevents one enormous
       Supabase request for large Excel files.
    ----------------------------------------------------- */

    const CHUNK_SIZE = 500;

    let savedCompanies = [];


    for (
        let i = 0;
        i < uniqueCompanies.length;
        i += CHUNK_SIZE
    ) {

        const chunk =
            uniqueCompanies.slice(
                i,
                i + CHUNK_SIZE
            );


        const {
            data,
            error
        } = await supabase
            .from("watchlists")
            .upsert(
                chunk,
                {
                    onConflict:
                        "user_id,symbol"
                }
            )
            .select();


        if (error) {

            console.error(
                "Excel watchlist insert error:",
                error
            );

            throw error;
        }


        if (data) {

            savedCompanies =
                savedCompanies.concat(
                    data
                );
        }
    }


    return savedCompanies;
};


/* =========================================================
   REMOVE STOCK
========================================================= */

export const removeFromWatchlist = async (
    symbol
) => {

    const user =
        await getCurrentUser();

    const cleanSymbol =
        String(symbol || "")
            .trim()
            .toUpperCase();

    const {
        error
    } = await supabase
        .from("watchlists")
        .delete()
        .eq(
            "user_id",
            user.id
        )
        .eq(
            "symbol",
            cleanSymbol
        );

    if (error) {
        throw error;
    }
};


/* =========================================================
   CHECK WATCHLIST
========================================================= */

export const isInWatchlist = async (
    symbol
) => {

    const {
        data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
        return false;
    }

    const cleanSymbol =
        String(symbol || "")
            .trim()
            .toUpperCase();

    const {
        data,
        error
    } = await supabase
        .from("watchlists")
        .select("id")
        .eq(
            "user_id",
            user.id
        )
        .eq(
            "symbol",
            cleanSymbol
        )
        .maybeSingle();

    if (error) {
        throw error;
    }

    return !!data;
};