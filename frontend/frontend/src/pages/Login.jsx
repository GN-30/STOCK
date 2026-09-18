import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    TrendingUp,
    Mail,
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    Zap
} from "lucide-react";

import { signIn, signInAsGuest } from "../services/authService";

import "../styles/auth.css";


function Login() {

    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [guestLoading, setGuestLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");


    // ==========================================
    // LOGIN
    // ==========================================

    const handleLogin = async (event) => {
        event.preventDefault();

        setError("");
        setSuccess("");

        if (!email.trim()) {
            setError("Please enter your email address.");
            return;
        }

        if (!password) {
            setError("Please enter your password.");
            return;
        }

        try {
            setLoading(true);

            const res = await signIn(
                email.trim(),
                password
            );

            if (res?.isOfflineFallback) {
                setSuccess(
                    "Signed in via Local Demo Mode (Supabase unreachable). Opening StockFlow..."
                );
            } else {
                setSuccess(
                    "Login successful. Opening StockFlow..."
                );
            }

            setTimeout(() => {
                navigate("/dashboard");
            }, 500);

        } catch (err) {
            console.error(err);

            if (
                err.message?.includes("fetch") ||
                err.name === "AuthRetryableFetchError" ||
                err.message?.includes("NetworkError")
            ) {
                setError(
                    "Supabase backend is unreachable (domain paused or offline). Click 'Continue as Guest' below to test the app."
                );
            } else {
                setError(
                    err.message ||
                    "Unable to login. Please check your credentials."
                );
            }

        } finally {
            setLoading(false);
        }
    };


    // ==========================================
    // GUEST / DEMO LOGIN
    // ==========================================

    const handleGuestLogin = async () => {
        setError("");
        setSuccess("");
        try {
            setGuestLoading(true);
            await signInAsGuest();
            setSuccess("Launching StockFlow in Demo Mode...");
            setTimeout(() => {
                navigate("/dashboard");
            }, 400);
        } catch (err) {
            setError("Failed to launch guest mode: " + err.message);
        } finally {
            setGuestLoading(false);
        }
    };



    return (

        <div className="auth-page">

            {/* =====================================
                LEFT BRAND PANEL
            ===================================== */}

            <div className="auth-brand-panel">

                <div className="auth-brand">

                    <div className="auth-brand-icon">

                        <TrendingUp
                            size={28}
                        />

                    </div>

                    <div>

                        <h1>
                            StockFlow
                        </h1>

                        <p>
                            Market Tracker
                        </p>

                    </div>

                </div>


                <div className="auth-brand-content">

                    <p className="auth-eyebrow">
                        YOUR MARKET. YOUR FLOW.
                    </p>

                    <h2>
                        Track markets.
                        <br />
                        Make smarter moves.
                    </h2>

                    <p>
                        Follow your favourite stocks,
                        monitor price movements and
                        keep your market data in one place.
                    </p>

                </div>


                <div className="auth-brand-footer">

                    <span className="auth-status-dot"></span>

                    NSE / BSE Market Tracker

                </div>

            </div>


            {/* =====================================
                LOGIN PANEL
            ===================================== */}

            <div className="auth-form-panel">

                <div className="auth-form-wrapper">


                    {/* Mobile logo */}

                    <div className="auth-mobile-brand">

                        <div className="auth-brand-icon">

                            <TrendingUp
                                size={24}
                            />

                        </div>

                        <div>

                            <strong>
                                StockFlow
                            </strong>

                            <span>
                                Market Tracker
                            </span>

                        </div>

                    </div>


                    <div className="auth-heading">

                        <p>
                            WELCOME BACK
                        </p>

                        <h2>
                            Sign in to StockFlow
                        </h2>

                        <span>
                            Continue tracking your market.
                        </span>

                    </div>


                    {/* =================================
                        ERROR
                    ================================= */}

                    {error && (

                        <div className="auth-message error">

                            {error}

                        </div>

                    )}


                    {/* =================================
                        SUCCESS
                    ================================= */}

                    {success && (

                        <div className="auth-message success">

                            {success}

                        </div>

                    )}


                    {/* =================================
                        FORM
                    ================================= */}

                    <form
                        className="auth-form"
                        onSubmit={handleLogin}
                    >


                        {/* EMAIL */}

                        <div className="auth-field">

                            <label>
                                Email address
                            </label>

                            <div className="auth-input-wrapper">

                                <Mail
                                    size={18}
                                />

                                <input
                                    type="email"
                                    value={email}
                                    onChange={
                                        event =>
                                            setEmail(
                                                event.target.value
                                            )
                                    }
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                />

                            </div>

                        </div>


                        {/* PASSWORD */}

                        <div className="auth-field">

                            <div className="auth-label-row">

                                <label>
                                    Password
                                </label>

                                <button
                                    type="button"
                                    className="forgot-button"
                                    onClick={() =>
                                        setError(
                                            "Password reset will be added soon."
                                        )
                                    }
                                >
                                    Forgot password?
                                </button>

                            </div>


                            <div className="auth-input-wrapper">

                                <Lock
                                    size={18}
                                />

                                <input
                                    type={
                                        showPassword
                                            ? "text"
                                            : "password"
                                    }
                                    value={password}
                                    onChange={
                                        event =>
                                            setPassword(
                                                event.target.value
                                            )
                                    }
                                    placeholder="Enter your password"
                                    autoComplete="current-password"
                                />


                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() =>
                                        setShowPassword(
                                            !showPassword
                                        )
                                    }
                                    aria-label={
                                        showPassword
                                            ? "Hide password"
                                            : "Show password"
                                    }
                                >

                                    {showPassword ? (

                                        <EyeOff
                                            size={18}
                                        />

                                    ) : (

                                        <Eye
                                            size={18}
                                        />

                                    )}

                                </button>

                            </div>

                        </div>


                        {/* SUBMIT */}

                        <button
                            type="submit"
                            className="auth-submit"
                            disabled={loading}
                        >

                            {loading
                                ? "Signing in..."
                                : "Sign in"
                            }

                            {!loading && (

                                <ArrowRight
                                    size={18}
                                />

                            )}

                        </button>

                    </form>


                    {/* =================================
                        OR DIVIDER & GUEST ACCESS
                    ================================= */}

                    <div className="auth-divider">
                        <span>or</span>
                    </div>

                    <button
                        type="button"
                        className="auth-guest-btn"
                        onClick={handleGuestLogin}
                        disabled={loading || guestLoading}
                    >
                        <Zap size={17} />
                        {guestLoading ? "Starting Demo..." : "Continue as Guest (Demo Mode)"}
                    </button>


                    {/* =================================
                        SIGNUP
                    ================================= */}

                    <div className="auth-switch">

                        <span>
                            Don't have an account?
                        </span>

                        <Link to="/signup">
                            Create account
                        </Link>

                    </div>


                </div>

            </div>

        </div>
    );
}


export default Login;