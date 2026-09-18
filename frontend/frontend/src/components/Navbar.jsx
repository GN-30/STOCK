import {
    BarChart3,
    Star,
    Wallet,
    Bell,
    TrendingUp,
    LogOut
} from "lucide-react";

import { signOut } from "../services/authService";


/* =========================================================
   NAV ITEMS CONFIG
========================================================= */

const NAV_ITEMS = [
    { id: "dashboard",  label: "Dashboard",  Icon: BarChart3  },
    { id: "watchlist",  label: "Watchlist",  Icon: Star       },
    { id: "portfolio",  label: "Portfolio",  Icon: Wallet     },
    { id: "alerts",     label: "Alerts",     Icon: Bell       }
];


/* =========================================================
   NAVBAR

   Props:
     activePage  {string}   — current page id, e.g. "dashboard"
     onNavigate  {function} — called with page id on nav click
========================================================= */

export default function Navbar({
    activePage = "dashboard",
    onNavigate
}) {

    const handleSignOut = async () => {
        await signOut();
    };


    return (
        <>
            {/* ===========================================
                DESKTOP SIDEBAR
            =========================================== */}

            <aside className="sidebar">

                {/* Brand */}
                <div className="brand">
                    <div className="brand-icon">
                        <TrendingUp size={22} />
                    </div>
                    <div>
                        <h2>StockFlow</h2>
                        <span>Market Tracker</span>
                    </div>
                </div>


                {/* Navigation */}
                <nav className="sidebar-nav">
                    {NAV_ITEMS.map(({ id, label, Icon }) => (
                        <button
                            key={id}
                            type="button"
                            className={`nav-item${activePage === id ? " active" : ""}`}
                            onClick={() => onNavigate?.(id)}
                        >
                            <Icon size={19} />
                            <span>{label}</span>
                        </button>
                    ))}
                </nav>


                {/* Bottom section */}
                <div className="sidebar-bottom">

                    {/* Market status */}
                    <div className="market-status">
                        <span className="status-dot" />
                        <div>
                            <strong>Market Status</strong>
                            <small>NSE / BSE</small>
                        </div>
                    </div>

                    {/* Sign out */}
                    <button
                        type="button"
                        className="nav-item sign-out-btn"
                        onClick={handleSignOut}
                        title="Sign out"
                        style={{ marginTop: "0.5rem", opacity: 0.7 }}
                    >
                        <LogOut size={17} />
                        <span>Sign Out</span>
                    </button>

                </div>

            </aside>


            {/* ===========================================
                MOBILE BOTTOM NAV BAR
                Visible only on screens ≤ 768px via CSS.
            =========================================== */}

            <nav className="mobile-bottom-nav" role="navigation" aria-label="Main navigation">

                {NAV_ITEMS.map(({ id, label, Icon }) => (
                    <button
                        key={id}
                        type="button"
                        className={`mobile-nav-item${activePage === id ? " active" : ""}`}
                        onClick={() => onNavigate?.(id)}
                        aria-label={label}
                        aria-current={activePage === id ? "page" : undefined}
                    >
                        <Icon size={22} />
                        <span>{label}</span>
                    </button>
                ))}

                {/* Sign out on mobile */}
                <button
                    type="button"
                    className="mobile-nav-item"
                    onClick={handleSignOut}
                    aria-label="Sign out"
                >
                    <LogOut size={22} />
                    <span>Out</span>
                </button>

            </nav>
        </>
    );
}
