import React, { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";


/* =========================================================
   SPLASH SCREEN

   Shows a premium branded intro every time the app is
   opened. Fades out after ~2.4 seconds.
   To show only once per session:
     sessionStorage.getItem("stockflow_splash_seen")
   To show only once ever:
     localStorage.getItem("stockflow_splash_seen")
========================================================= */

export default function SplashScreen({ onDone }) {

    const [phase, setPhase] = useState("enter"); // enter | visible | exit | gone


    useEffect(() => {

        // Phase timeline
        const t1 = setTimeout(() => setPhase("visible"), 100);
        const t2 = setTimeout(() => setPhase("exit"), 2200);
        const t3 = setTimeout(() => {
            setPhase("gone");
            onDone?.();
        }, 2900);


        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
        };

    }, [onDone]);


    if (phase === "gone") return null;


    return (
        <div
            className={`splash-overlay ${phase}`}
            aria-hidden="true"
        >

            {/* Background grid texture */}
            <div className="splash-grid" />


            {/* Glowing orbs */}
            <div className="splash-orb splash-orb-1" />
            <div className="splash-orb splash-orb-2" />


            {/* Main content */}
            <div className="splash-content">

                {/* Logo */}
                <div className="splash-logo-wrap">

                    <div className="splash-logo-ring" />

                    <div className="splash-logo-icon">
                        <TrendingUp size={32} />
                    </div>

                </div>


                {/* Brand */}
                <div className="splash-brand">

                    <h1>StockFlow</h1>

                    <p>Market Tracker</p>

                </div>


                {/* Tagline */}
                <p className="splash-tagline">
                    Real-time Indian &amp; Global Markets
                </p>


                {/* Loading bar */}
                <div className="splash-bar-track">
                    <div className="splash-bar-fill" />
                </div>


                {/* Market labels */}
                <div className="splash-markets">
                    <span>NSE</span>
                    <span className="splash-divider">·</span>
                    <span>BSE</span>
                    <span className="splash-divider">·</span>
                    <span>NYSE</span>
                    <span className="splash-divider">·</span>
                    <span>NASDAQ</span>
                </div>

            </div>

        </div>
    );
}
