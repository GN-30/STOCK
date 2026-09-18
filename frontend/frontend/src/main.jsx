import React, {
    useEffect,
    useState
} from "react";

import ReactDOM from "react-dom/client";

import {
    BrowserRouter,
    Routes,
    Route,
    Navigate
} from "react-router-dom";

import Navbar        from "./components/Navbar";
import Dashboard     from "./pages/Dashboard";
import WatchlistPage from "./pages/WatchlistPage";
import PortfolioPage from "./pages/PortfolioPage";
import Login         from "./pages/Login";
import Signup        from "./pages/Signup";
import SplashScreen  from "./components/SplashScreen";

import { getSession, onAuthStateChange } from "./services/authService";

import "./index.css";


// ======================================================
// APP SHELL (authenticated layout with Navbar)
// ======================================================

function AppShell() {

    const [activePage, setActivePage] = useState("dashboard");
    const [selectedSymbol, setSelectedSymbol] = useState(null);


    const handleSelectStock = (symbol) => {
        setSelectedSymbol(symbol);
        setActivePage("dashboard");
    };


    const renderPage = () => {

        switch (activePage) {

            case "watchlist":
                return (
                    <WatchlistPage
                        onSelectStock={handleSelectStock}
                    />
                );

            case "portfolio":
                return (
                    <PortfolioPage
                        onSelectStock={handleSelectStock}
                    />
                );

            case "alerts":
                return (
                    <div className="page-container">
                        <header className="page-header">
                            <div>
                                <p className="eyebrow">ALERTS</p>
                                <h1>Price Alerts</h1>
                            </div>
                        </header>
                        <div className="page-empty">
                            <p style={{ opacity: 0.5 }}>
                                Price alerts — coming soon.
                            </p>
                        </div>
                    </div>
                );

            case "dashboard":
            default:
                return (
                    <Dashboard
                        initialSymbol={selectedSymbol}
                    />
                );
        }
    };


    return (
        <div className="app-shell">

            <Navbar
                activePage={activePage}
                onNavigate={(page) => {
                    setActivePage(page);
                    if (page === "dashboard") setSelectedSymbol(null);
                }}
            />

            <main className="main-content">
                {renderPage()}
            </main>

        </div>
    );
}


// ======================================================
// PROTECTED ROUTE
// ======================================================

function ProtectedRoute({ children }) {

    const [session, setSession] = useState(undefined);

    useEffect(() => {

        let mounted = true;

        const checkSession = async () => {
            const { data } = await getSession();
            if (mounted) setSession(data?.session || null);
        };

        checkSession();

        const { data: listener } =
            onAuthStateChange(
                (_event, newSession) => {
                    setSession(newSession);
                }
            );

        return () => {
            mounted = false;
            listener?.subscription?.unsubscribe?.();
        };

    }, []);


    if (session === undefined) {
        return (
            <div
                style={{
                    minHeight:      "100vh",
                    display:        "flex",
                    alignItems:     "center",
                    justifyContent: "center",
                    background:     "#f7faf8",
                    color:          "#20a85a",
                    fontFamily:     "Inter, sans-serif",
                    fontSize:       "14px",
                    fontWeight:     600
                }}
            >
                Loading StockFlow…
            </div>
        );
    }

    if (!session) {
        return <Navigate to="/login" replace />;
    }

    return children;
}


// ======================================================
// AUTH REDIRECT (blocks auth pages when already logged in)
// ======================================================

function AuthRedirect({ children }) {

    const [session, setSession] = useState(undefined);

    useEffect(() => {

        let mounted = true;

        const checkSession = async () => {
            const { data } = await getSession();
            if (mounted) setSession(data?.session || null);
        };

        checkSession();

        const { data: listener } =
            onAuthStateChange(
                (_event, newSession) => {
                    setSession(newSession);
                }
            );

        return () => {
            mounted = false;
            listener?.subscription?.unsubscribe?.();
        };

    }, []);


    if (session === undefined) {
        return (
            <div
                style={{
                    minHeight:      "100vh",
                    display:        "flex",
                    alignItems:     "center",
                    justifyContent: "center",
                    background:     "#f7faf8",
                    color:          "#20a85a",
                    fontFamily:     "Inter, sans-serif",
                    fontSize:       "14px",
                    fontWeight:     600
                }}
            >
                Loading…
            </div>
        );
    }

    if (session) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}


// ======================================================
// ROOT — wraps app with splash screen
// ======================================================

function Root() {

    const [splashDone, setSplashDone] = useState(false);

    return (
        <>
            {!splashDone && (
                <SplashScreen onDone={() => setSplashDone(true)} />
            )}

            <BrowserRouter>

                <Routes>

                    {/* Root → Dashboard */}
                    <Route
                        path="/"
                        element={<Navigate to="/dashboard" replace />}
                    />

                    {/* Login */}
                    <Route
                        path="/login"
                        element={
                            <AuthRedirect>
                                <Login />
                            </AuthRedirect>
                        }
                    />

                    {/* Signup */}
                    <Route
                        path="/signup"
                        element={
                            <AuthRedirect>
                                <Signup />
                            </AuthRedirect>
                        }
                    />

                    {/* Dashboard (and all sub-pages via AppShell) */}
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <AppShell />
                            </ProtectedRoute>
                        }
                    />

                    {/* Catch-all */}
                    <Route
                        path="*"
                        element={<Navigate to="/dashboard" replace />}
                    />

                </Routes>

            </BrowserRouter>
        </>
    );
}


ReactDOM.createRoot(
    document.getElementById("root")
).render(

    <React.StrictMode>
        <Root />
    </React.StrictMode>
);